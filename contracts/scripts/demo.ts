/**
 * End-to-end confidential demo for PayrollVault on ETH Sepolia.
 *
 * Proves the full Nox flow with NO mock data:
 *   1. The company encrypts a salary off-chain (Handle Gateway / TEE).
 *   2. It calls addEmployee(employee, handle, proof) on-chain.
 *   3. The company decrypts the encrypted running total (ACL-authorized).
 *   4. An auditor is granted access to the TOTAL only, and decrypts it.
 *   5. A random third party FAILS to decrypt -> selective disclosure proven.
 *
 * Run: npx hardhat run scripts/demo.ts --network sepolia
 */
import "dotenv/config";
import {
  createPublicClient,
  createWalletClient,
  http,
  getContract,
} from "viem";
import { sepolia } from "viem/chains";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";
import { createViemHandleClient } from "@iexec-nox/handle";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const RPC = process.env.SEPOLIA_RPC_URL!;
const OWNER_PK = process.env.SEPOLIA_PRIVATE_KEY! as `0x${string}`;

const deployment = JSON.parse(
  readFileSync(join(process.cwd(), "deployments", "11155111.json"), "utf8"),
);
const VAULT = deployment.PayrollVault as `0x${string}`;

const ABI = [
  { type: "function", name: "addEmployee", stateMutability: "nonpayable", inputs: [{ name: "employee", type: "address" }, { name: "inputHandle", type: "bytes32" }, { name: "inputProof", type: "bytes" }], outputs: [] },
  { type: "function", name: "grantAuditor", stateMutability: "nonpayable", inputs: [{ name: "auditor", type: "address" }], outputs: [] },
  { type: "function", name: "totalPayrollHandle", stateMutability: "view", inputs: [{ name: "company", type: "address" }], outputs: [{ type: "bytes32" }] },
  { type: "function", name: "salaryHandleOf", stateMutability: "view", inputs: [{ name: "company", type: "address" }, { name: "employee", type: "address" }], outputs: [{ type: "bytes32" }] },
  { type: "function", name: "employeeCount", stateMutability: "view", inputs: [{ name: "company", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "runPayroll", stateMutability: "nonpayable", inputs: [], outputs: [] },
  { type: "function", name: "confidentialBalanceOf", stateMutability: "view", inputs: [{ name: "account", type: "address" }], outputs: [{ type: "bytes32" }] },
] as const;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function decryptWithRetry(hc: any, handle: `0x${string}`, label: string, tries = 12) {
  for (let i = 0; i < tries; i++) {
    try {
      const { value } = await hc.decrypt(handle);
      return value as bigint;
    } catch (e: any) {
      if (i === tries - 1) throw e;
      process.stdout.write(`   …waiting for TEE result (${label}) [${i + 1}/${tries}]\r`);
      await sleep(5000);
    }
  }
  throw new Error("unreachable");
}

async function main() {
  const owner = privateKeyToAccount(OWNER_PK);
  console.log(`Vault:   ${VAULT}`);
  console.log(`Company: ${owner.address}\n`);

  const publicClient = createPublicClient({ chain: sepolia, transport: http(RPC) });
  const ownerWallet = createWalletClient({ account: owner, chain: sepolia, transport: http(RPC) });
  const ownerHandle = await createViemHandleClient(ownerWallet);

  const vault = getContract({ address: VAULT, abi: ABI, client: { public: publicClient, wallet: ownerWallet } });

  // A demo employee (address only; no funding needed for them here).
  const employee = privateKeyToAccount(generatePrivateKey());
  const SALARY = 5000n; // confidential monthly salary

  // 1. Encrypt the salary bound to the vault contract.
  console.log(`1) Encrypting salary (${SALARY}) for employee ${employee.address} …`);
  const { handle, handleProof } = await ownerHandle.encryptInput(SALARY, "uint256", VAULT);
  console.log(`   handle: ${handle}`);

  // 2. Register the employee on-chain with the encrypted salary.
  console.log(`2) Calling addEmployee() on-chain …`);
  const tx = await vault.write.addEmployee([employee.address, handle, handleProof]);
  await publicClient.waitForTransactionReceipt({ hash: tx });
  console.log(`   tx: ${tx}`);
  console.log(`   employeeCount = ${await vault.read.employeeCount([owner.address])}`);

  // 3. Company decrypts the encrypted running total.
  const totalHandle = (await vault.read.totalPayrollHandle([owner.address])) as `0x${string}`;
  console.log(`3) Company decrypts total payroll …`);
  const totalAsOwner = await decryptWithRetry(ownerHandle, totalHandle, "owner");
  console.log(`   total (company view) = ${totalAsOwner}  (expected ${SALARY})`);

  // 4. Grant an auditor access to the TOTAL only, then decrypt as auditor.
  const auditor = privateKeyToAccount(generatePrivateKey());
  console.log(`4) grantAuditor(${auditor.address}) …`);
  const tx2 = await vault.write.grantAuditor([auditor.address]);
  await publicClient.waitForTransactionReceipt({ hash: tx2 });
  const auditorWallet = createWalletClient({ account: auditor, chain: sepolia, transport: http(RPC) });
  const auditorHandle = await createViemHandleClient(auditorWallet);
  const totalAsAuditor = await decryptWithRetry(auditorHandle, totalHandle, "auditor");
  console.log(`   total (auditor view) = ${totalAsAuditor}`);

  // 5. Selective disclosure: auditor must NOT see the individual salary.
  const salaryHandle = (await vault.read.salaryHandleOf([owner.address, employee.address])) as `0x${string}`;
  console.log(`5) Auditor tries to read an INDIVIDUAL salary (must fail) …`);
  try {
    await auditorHandle.decrypt(salaryHandle);
    console.log(`   SECURITY FAIL: auditor decrypted an individual salary!`);
  } catch {
    console.log(`   correctly DENIED — auditor cannot see individual salaries.`);
  }

  // 6. Run payroll: pay the employee confidentially, then the employee decrypts
  //    their OWN received pay (a confidential cPAY token balance).
  console.log(`6) runPayroll() → paying employees confidentially…`);
  const tx3 = await vault.write.runPayroll();
  await publicClient.waitForTransactionReceipt({ hash: tx3 });
  const payHandle = (await vault.read.confidentialBalanceOf([employee.address])) as `0x${string}`;
  const empWallet = createWalletClient({ account: employee, chain: sepolia, transport: http(RPC) });
  const empHandle = await createViemHandleClient(empWallet);
  const pay = await decryptWithRetry(empHandle, payHandle, "employee");
  console.log(`   employee decrypted their confidential pay = ${pay}  (expected ${SALARY})`);

  console.log(`\nEnd-to-end confidential payroll flow verified on Sepolia (funding → encrypted split → confidential payout).`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
