import { sepolia } from "viem/chains";

// Deployed PayrollVault (multi-tenant) on ETH Sepolia.
export const CHAIN = sepolia;
export const PAYROLL_VAULT_ADDRESS =
  "0xb3ce25d55ee903184ed4158c69a619e222ec1840" as const;
export const PAYUSD_ADDRESS =
  "0xffedd1cbab8b30f2c1c3e96439fd666ad20ca017" as const;
export const SABLIER_ADDRESS =
  "0xe61cb9153356419bdaD0A8767c059f92d221a3C4" as const;

export const EXPLORER = "https://sepolia.etherscan.io";

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
] as const;
