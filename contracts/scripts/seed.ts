/**
 * Re-seed the freshly deployed PayrollVault v2 so the live demo is immediately alive:
 *   1. Mint PayUSD backing into the vault (so employee unwrap/withdraw works).
 *   2. Create a real public Sablier stream (company -> vault) and record it.
 *   3. Add Employee 1 with an encrypted salary.
 *   4. Run payroll (mint confidential cPAY to the employee).
 *   5. Verify the employee has a confidential balance.
 *
 * Run: npx hardhat run scripts/seed.ts --network sepolia
 */
import "dotenv/config";
import {
  createPublicClient, createWalletClient, http, getContract, parseUnits,
} from "viem";
import { sepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { createViemHandleClient } from "@iexec-nox/handle";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const RPC = process.env.SEPOLIA_RPC_URL!;
const PK = process.env.SEPOLIA_PRIVATE_KEY! as `0x${string}`;
const EMP1 = "0x93bAeae8EFaAf24a7CE58DE3E2ee9925247e38B1" as `0x${string}`;
const SALARY = 5000n;
const BUDGET = parseUnits("120000", 18);

const d = JSON.parse(readFileSync(join(process.cwd(), "deployments", "11155111.json"), "utf8"));
const VAULT = d.PayrollVault as `0x${string}`;
const PAYUSD = d.PayUSD as `0x${string}`;
const SABLIER = d.SablierLockup as `0x${string}`;

const ERC20_ABI = [
  { type: "function", name: "mint", stateMutability: "nonpayable", inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }], outputs: [] },
  { type: "function", name: "approve", stateMutability: "nonpayable", inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }] },
] as const;
const SABLIER_ABI = [
  { type: "function", name: "nextStreamId", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "createWithDurationsLL", stateMutability: "payable", inputs: [
    { name: "params", type: "tuple", components: [
      { name: "sender", type: "address" }, { name: "recipient", type: "address" }, { name: "depositAmount", type: "uint128" },
      { name: "token", type: "address" }, { name: "cancelable", type: "bool" }, { name: "transferable", type: "bool" }, { name: "shape", type: "string" }] },
    { name: "unlockAmounts", type: "tuple", components: [{ name: "start", type: "uint128" }, { name: "cliff", type: "uint128" }] },
    { name: "granularity", type: "uint40" },
    { name: "durations", type: "tuple", components: [{ name: "cliff", type: "uint40" }, { name: "total", type: "uint40" }] },
  ], outputs: [{ name: "streamId", type: "uint256" }] },
] as const;
const VAULT_ABI = [
  { type: "function", name: "addEmployee", stateMutability: "nonpayable", inputs: [{ name: "employee", type: "address" }, { name: "inputHandle", type: "bytes32" }, { name: "inputProof", type: "bytes" }], outputs: [] },
  { type: "function", name: "runPayroll", stateMutability: "nonpayable", inputs: [], outputs: [] },
  { type: "function", name: "linkFunding", stateMutability: "nonpayable", inputs: [{ name: "streamId", type: "uint256" }, { name: "publicAmount", type: "uint256" }], outputs: [] },
  { type: "function", name: "employeeCount", stateMutability: "view", inputs: [{ name: "c", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "confidentialBalanceOf", stateMutability: "view", inputs: [{ name: "a", type: "address" }], outputs: [{ type: "bytes32" }] },
] as const;

const wait = (pc: any) => async (p: Promise<`0x${string}`>) => { const h = await p; await pc.waitForTransactionReceipt({ hash: h }); return h; };

async function main() {
  const account = privateKeyToAccount(PK);
  const pc = createPublicClient({ chain: sepolia, transport: http(RPC) });
  const wallet = createWalletClient({ account, chain: sepolia, transport: http(RPC) });
  const w = wait(pc);
  const hc = await createViemHandleClient(wallet);
  const usd = getContract({ address: PAYUSD, abi: ERC20_ABI, client: { public: pc, wallet } });
  const vault = getContract({ address: VAULT, abi: VAULT_ABI, client: { public: pc, wallet } });

  console.log(`Company: ${account.address}`);
  console.log(`Vault:   ${VAULT}`);

  console.log("1) Minting PayUSD backing into the vault...");
  await w(usd.write.mint([VAULT, BUDGET]));

  console.log("2) Creating public Sablier stream (company -> vault)...");
  await w(usd.write.mint([account.address, BUDGET]));
  await w(usd.write.approve([SABLIER, BUDGET]));
  const streamId = (await pc.readContract({ address: SABLIER, abi: SABLIER_ABI, functionName: "nextStreamId" })) as bigint;
  await w(wallet.writeContract({ address: SABLIER, abi: SABLIER_ABI, functionName: "createWithDurationsLL", args: [
    { sender: account.address, recipient: VAULT, depositAmount: BUDGET, token: PAYUSD, cancelable: true, transferable: true, shape: "PayVault confidential payroll" },
    { start: 0n, cliff: 0n }, 0, { cliff: 0, total: 30 * 24 * 60 * 60 },
  ] }));
  await w(vault.write.linkFunding([streamId, BUDGET]));
  console.log(`   stream #${streamId} linked`);

  console.log(`3) Adding Employee 1 (${EMP1}) with encrypted salary ${SALARY}...`);
  const { handle, handleProof } = await hc.encryptInput(SALARY, "uint256", VAULT);
  await w(vault.write.addEmployee([EMP1, handle, handleProof]));
  console.log(`   employeeCount = ${await vault.read.employeeCount([account.address])}`);

  console.log("4) Running payroll...");
  await w(vault.write.runPayroll());

  const bal = (await vault.read.confidentialBalanceOf([EMP1])) as `0x${string}`;
  const ZERO = "0x" + "0".repeat(64);
  console.log(`5) Employee 1 confidential balance: ${bal === ZERO ? "EMPTY (problem!)" : "present (cPAY minted) OK"}`);
  console.log("\nSeed complete.");
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
