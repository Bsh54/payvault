import { sepolia } from "viem/chains";

// Deployed PayrollVault (multi-tenant) on ETH Sepolia.
export const CHAIN = sepolia;
export const PAYROLL_VAULT_ADDRESS =
  "0x48e48f43ee633da6ae5a5a433f4f1c3f69ea5d8f" as const;
export const PAYUSD_ADDRESS =
  "0xda4db7f6f01c01969043521adca9dbe75d7be3ee" as const;
export const SABLIER_ADDRESS =
  "0xe61cb9153356419bdaD0A8767c059f92d221a3C4" as const;

export const EXPLORER = "https://sepolia.etherscan.io";

// Live proof on the public block explorer:
// BEFORE = a normal ERC-20 transfer (amount visible in cleartext).
// AFTER  = an addEmployee() call on PayVault (salary is an encrypted handle).
export const DEMO_PUBLIC_TX =
  "0x15b3d657ac8f7640014dc817b52e2e00f64a8adb526f529add74bb0a6da8c645";
export const DEMO_CONFIDENTIAL_TX =
  "0x7fc72ce7259e112d2a1097d7f98a31089a5b0c160bdd54ce17d4d372d8cd66aa";

export const PAYROLL_VAULT_ABI = [
  {
    type: "function",
    name: "addEmployee",
    stateMutability: "nonpayable",
    inputs: [
      { name: "employee", type: "address" },
      { name: "inputHandle", type: "bytes32" },
      { name: "inputProof", type: "bytes" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "updateSalary",
    stateMutability: "nonpayable",
    inputs: [
      { name: "employee", type: "address" },
      { name: "inputHandle", type: "bytes32" },
      { name: "inputProof", type: "bytes" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "grantAuditor",
    stateMutability: "nonpayable",
    inputs: [{ name: "auditor", type: "address" }],
    outputs: [],
  },
  {
    type: "function",
    name: "totalPayrollHandle",
    stateMutability: "view",
    inputs: [{ name: "company", type: "address" }],
    outputs: [{ type: "bytes32" }],
  },
  {
    type: "function",
    name: "salaryHandleOf",
    stateMutability: "view",
    inputs: [
      { name: "company", type: "address" },
      { name: "employee", type: "address" },
    ],
    outputs: [{ type: "bytes32" }],
  },
  {
    type: "function",
    name: "isInitialized",
    stateMutability: "view",
    inputs: [{ name: "company", type: "address" }],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "employeeCount",
    stateMutability: "view",
    inputs: [{ name: "company", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "employees",
    stateMutability: "view",
    inputs: [{ name: "company", type: "address" }],
    outputs: [{ type: "address[]" }],
  },
  {
    type: "function",
    name: "isEmployee",
    stateMutability: "view",
    inputs: [
      { name: "company", type: "address" },
      { name: "employee", type: "address" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "sablierStreamId",
    stateMutability: "view",
    inputs: [{ name: "company", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "publicBudget",
    stateMutability: "view",
    inputs: [{ name: "company", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "runPayroll",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    type: "function",
    name: "confidentialBalanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "bytes32" }],
  },
] as const;
