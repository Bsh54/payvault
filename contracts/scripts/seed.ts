/**
 * Seed PayrollVault v3 with the REAL Sablier money loop:
 *   company -> Sablier public stream -> vault.pullFunding() -> confidential payout.
 *   1. Mint PayUSD to the company, approve Sablier.
 *   2. Create a public Sablier stream (recipient = vault), short duration so it vests fast.
 *   3. linkFunding, then vault.pullFunding() pulls the vested PayUSD into the vault.
 *   4. Add Employee 1 (salary in 18 decimals), run payroll, grant the demo auditor.
 */
import "dotenv/config";
import { createPublicClient, createWalletClient, http, getContract, parseUnits } from "viem";
import { sepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { createViemHandleClient } from "@iexec-nox/handle";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const RPC = process.env.SEPOLIA_RPC_URL!;
const PK = process.env.SEPOLIA_PRIVATE_KEY! as `0x${string}`;
const EMP1 = "0x93bAeae8EFaAf24a7CE58DE3E2ee9925247e38B1" as `0x${string}`;
const AUDITOR = "0xbB1fc0E2A7Db1804cf17f3A6921C9BBBd0e04DDe" as `0x${string}`;
const SALARY = parseUnits("5000", 18);
const BUDGET = parseUnits("120000", 18);

const d = JSON.parse(readFileSync(join(process.cwd(), "deployments", "11155111.json"), "utf8"));
const VAULT = d.PayrollVault as `0x${string}`;
const PAYUSD = d.PayUSD as `0x${string}`;
const SABLIER = d.SablierLockup as `0x${string}`;

const ERC20 = [
  { type: "function", name: "mint", stateMutability: "nonpayable", inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }], outputs: [] },
  { type: "function", name: "approve", stateMutability: "nonpayable", inputs: [{ name: "s", type: "address" }, { name: "a", type: "uint256" }], outputs: [{ type: "bool" }] },
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ name: "a", type: "address" }], outputs: [{ type: "uint256" }] },
] as const;
const SAB = [
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
const V = [
  { type: "function", name: "linkFunding", stateMutability: "nonpayable", inputs: [{ name: "s", type: "uint256" }, { name: "a", type: "uint256" }], outputs: [] },
  { type: "function", name: "pullFunding", stateMutability: "payable", inputs: [], outputs: [] },
  { type: "function", name: "addEmployee", stateMutability: "nonpayable", inputs: [{ name: "e", type: "address" }, { name: "h", type: "bytes32" }, { name: "p", type: "bytes" }], outputs: [] },
  { type: "function", name: "runPayroll", stateMutability: "nonpayable", inputs: [], outputs: [] },
  { type: "function", name: "grantAuditor", stateMutability: "nonpayable", inputs: [{ name: "a", type: "address" }], outputs: [] },
  { type: "function", name: "confidentialBalanceOf", stateMutability: "view", inputs: [{ name: "a", type: "address" }], outputs: [{ type: "bytes32" }] },
] as const;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const acc = privateKeyToAccount(PK);
  const pc = createPublicClient({ chain: sepolia, transport: http(RPC) });
  const w = createWalletClient({ account: acc, chain: sepolia, transport: http(RPC) });
  const wait = async (p: Promise<`0x${string}`>) => { const h = await p; await pc.waitForTransactionReceipt({ hash: h }); return h; };
  const hc = await createViemHandleClient(w);
  const usd = getContract({ address: PAYUSD, abi: ERC20, client: { public: pc, wallet: w } });
  const vault = getContract({ address: VAULT, abi: V, client: { public: pc, wallet: w } });

  console.log(`Company ${acc.address}\nVault ${VAULT}`);
  console.log("1) Mint PayUSD + approve Sablier...");
  await wait(usd.write.mint([acc.address, BUDGET]));
  await wait(usd.write.approve([SABLIER, BUDGET]));

  console.log("2) Create public Sablier stream (recipient = vault, short vest)...");
  const streamId = (await pc.readContract({ address: SABLIER, abi: SAB, functionName: "nextStreamId" })) as bigint;
  await wait(w.writeContract({ address: SABLIER, abi: SAB, functionName: "createWithDurationsLL", args: [
    { sender: acc.address, recipient: VAULT, depositAmount: BUDGET, token: PAYUSD, cancelable: false, transferable: true, shape: "PayVault confidential payroll" },
    { start: 0n, cliff: 0n }, 0, { cliff: 0, total: 1 },
  ] }));
  await wait(vault.write.linkFunding([streamId, BUDGET]));
  console.log(`   stream #${streamId} linked; waiting for vest...`);
  await sleep(6000);

  console.log("3) pullFunding(): probing Sablier withdrawal fee...");
  const candidates = [parseUnits("0", 18), parseUnits("0.0002", 18), parseUnits("0.0005", 18), parseUnits("0.001", 18), parseUnits("0.003", 18)];
  let fee = candidates[candidates.length - 1];
  for (const v of candidates) {
    try {
      await pc.simulateContract({ address: VAULT, abi: V, functionName: "pullFunding", account: acc.address, value: v });
      fee = v; break;
    } catch { /* need more fee */ }
  }
  console.log(`   fee = ${fee.toString()} wei; withdrawing from stream...`);
  await wait(w.writeContract({ address: VAULT, abi: V, functionName: "pullFunding", value: fee }));
  const vbal = (await pc.readContract({ address: PAYUSD, abi: ERC20, functionName: "balanceOf", args: [VAULT] })) as bigint;
  console.log(`   vault PayUSD balance = ${vbal.toString()} (backing from the stream)`);

  console.log("4) Add Employee 1 (5000, 18 dec), run payroll, grant auditor...");
  const { handle, handleProof } = await hc.encryptInput(SALARY, "uint256", VAULT);
  await wait(vault.write.addEmployee([EMP1, handle, handleProof]));
  await wait(vault.write.runPayroll());
  await wait(vault.write.grantAuditor([AUDITOR]));

  const bal = (await vault.read.confidentialBalanceOf([EMP1])) as `0x${string}`;
  const ZERO = "0x" + "0".repeat(64);
  console.log(`   Employee 1 cPAY: ${bal === ZERO ? "EMPTY (problem)" : "present OK"}`);
  console.log("Seed v3 complete.");
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
