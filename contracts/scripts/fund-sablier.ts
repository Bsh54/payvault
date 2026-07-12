/**
 * Public funding layer — real Sablier Lockup Linear stream on ETH Sepolia.
 *
 * The company funds its PayrollVault with ONE public lump-sum stream
 * (company -> vault). The public chain sees only this aggregate amount;
 * the per-employee split stays encrypted inside Nox.
 *
 * Run: npx hardhat run scripts/fund-sablier.ts --network sepolia
 */
import "dotenv/config";
import {
  createPublicClient,
  createWalletClient,
  http,
  parseUnits,
  getContract,
} from "viem";
import { sepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const RPC = process.env.SEPOLIA_RPC_URL!;
const PK = process.env.SEPOLIA_PRIVATE_KEY! as `0x${string}`;

const d = JSON.parse(readFileSync(join(process.cwd(), "deployments", "11155111.json"), "utf8"));
const VAULT = d.PayrollVault as `0x${string}`;
const PAYUSD = d.PayUSD as `0x${string}`;
const SABLIER = d.SablierLockup as `0x${string}`;

const ERC20_ABI = [
  { type: "function", name: "mint", stateMutability: "nonpayable", inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }], outputs: [] },
  { type: "function", name: "approve", stateMutability: "nonpayable", inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }] },
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ name: "a", type: "address" }], outputs: [{ type: "uint256" }] },
] as const;

const SABLIER_ABI = [
  { type: "function", name: "nextStreamId", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  {
    type: "function",
    name: "createWithDurationsLL",
    stateMutability: "payable",
    inputs: [
      {
        name: "params", type: "tuple",
        components: [
          { name: "sender", type: "address" },
          { name: "recipient", type: "address" },
          { name: "depositAmount", type: "uint128" },
          { name: "token", type: "address" },
          { name: "cancelable", type: "bool" },
          { name: "transferable", type: "bool" },
          { name: "shape", type: "string" },
        ],
      },
      {
        name: "unlockAmounts", type: "tuple",
        components: [
          { name: "start", type: "uint128" },
          { name: "cliff", type: "uint128" },
        ],
      },
      { name: "granularity", type: "uint40" },
      {
        name: "durations", type: "tuple",
        components: [
          { name: "cliff", type: "uint40" },
          { name: "total", type: "uint40" },
        ],
      },
    ],
    outputs: [{ name: "streamId", type: "uint256" }],
  },
] as const;

const VAULT_ABI = [
  { type: "function", name: "linkFunding", stateMutability: "nonpayable", inputs: [{ name: "streamId", type: "uint256" }, { name: "publicAmount", type: "uint256" }], outputs: [] },
  { type: "function", name: "sablierStreamId", stateMutability: "view", inputs: [{ name: "c", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "publicBudget", stateMutability: "view", inputs: [{ name: "c", type: "address" }], outputs: [{ type: "uint256" }] },
] as const;

async function main() {
  const account = privateKeyToAccount(PK);
  const publicClient = createPublicClient({ chain: sepolia, transport: http(RPC) });
  const wallet = createWalletClient({ account, chain: sepolia, transport: http(RPC) });

  const BUDGET = parseUnits("120000", 18); // public monthly payroll budget
  console.log(`Company: ${account.address}`);
  console.log(`Vault:   ${VAULT}`);
  console.log(`PayUSD:  ${PAYUSD}`);
  console.log(`Sablier: ${SABLIER}\n`);

  const usd = getContract({ address: PAYUSD, abi: ERC20_ABI, client: { public: publicClient, wallet } });
  const vault = getContract({ address: VAULT, abi: VAULT_ABI, client: { public: publicClient, wallet } });

  // 1. Mint PayUSD to the company and approve Sablier.
  console.log("1) Minting PayUSD & approving Sablier…");
  await publicClient.waitForTransactionReceipt({ hash: await usd.write.mint([account.address, BUDGET]) });
  await publicClient.waitForTransactionReceipt({ hash: await usd.write.approve([SABLIER, BUDGET]) });

  // 2. Predict the streamId, then create the public Sablier stream to the vault.
  const streamId = (await publicClient.readContract({ address: SABLIER, abi: SABLIER_ABI, functionName: "nextStreamId" })) as bigint;
  console.log(`2) Creating public Sablier stream #${streamId} (company -> vault)…`);
  const params = {
    sender: account.address,
    recipient: VAULT,
    depositAmount: BUDGET,
    token: PAYUSD,
    cancelable: true,
    transferable: true,
    shape: "PayVault confidential payroll",
  } as const;
  const unlockAmounts = { start: 0n, cliff: 0n } as const;
  const durations = { cliff: 0, total: 30 * 24 * 60 * 60 } as const; // 30 days
  const hash = await wallet.writeContract({
    address: SABLIER, abi: SABLIER_ABI, functionName: "createWithDurationsLL",
    args: [params, unlockAmounts, 0, durations],
  });
  await publicClient.waitForTransactionReceipt({ hash });
  console.log(`   stream created — tx ${hash}`);

  // 3. Record the funding on the vault (public aggregate; per-employee stays secret).
  console.log("3) Linking funding on the vault…");
  await publicClient.waitForTransactionReceipt({ hash: await vault.write.linkFunding([streamId, BUDGET]) });
  const onchainId = await vault.read.sablierStreamId([account.address]);
  const onchainBudget = await vault.read.publicBudget([account.address]);
  console.log(`   vault.sablierStreamId = ${onchainId}, publicBudget = ${onchainBudget}`);

  console.log(`\nPublic Sablier funding layer wired. Stream #${streamId} funds the vault publicly;`);
  console.log(`   individual salaries remain encrypted via Nox.`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
