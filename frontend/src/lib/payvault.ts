import { sepolia } from "viem/chains";

// Deployed PayrollVault (multi-tenant) on ETH Sepolia.
export const CHAIN = sepolia;
// Pinned public RPC. The default viem fallback is rate-limited and can make the
// Nox handle-gateway lookup fail intermittently while decrypting; a stable
// endpoint avoids that. Override with VITE_RPC_URL if needed.
export const RPC_URL =
  import.meta.env.VITE_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com";
export const PAYROLL_VAULT_ADDRESS =
  "0x5c37c25e88edfce2b0b19e11f74c9422a42dd5cc" as const;
export const PAYUSD_ADDRESS =
  "0xf187422619859a5be5a2db1a275da7a1532d930a" as const;
export const SABLIER_ADDRESS =
  "0xe61cb9153356419bdaD0A8767c059f92d221a3C4" as const;

export const EXPLORER = "https://sepolia.etherscan.io";
// A demo company (the deployer wallet) with real encrypted payroll, referenced
// by the landing "before / after" proof so visitors see a live example.
export const DEMO_COMPANY =
  "0x8BEE24f6D3F421601BC044667CCD3ADc0CB39288" as const;

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
    name: "revokeAuditor",
    stateMutability: "nonpayable",
    inputs: [{ name: "auditor", type: "address" }],
    outputs: [],
  },
  {
    type: "function",
    name: "isAuditor",
    stateMutability: "view",
    inputs: [
      { name: "company", type: "address" },
      { name: "auditor", type: "address" },
    ],
    outputs: [{ type: "bool" }],
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
  {
    type: "function",
    name: "removeEmployee",
    stateMutability: "nonpayable",
    inputs: [{ name: "employee", type: "address" }],
    outputs: [],
  },
  {
    type: "function",
    name: "employersOf",
    stateMutability: "view",
    inputs: [{ name: "employee", type: "address" }],
    outputs: [{ type: "address[]" }],
  },
  {
    type: "function",
    name: "unwrap",
    stateMutability: "nonpayable",
    inputs: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "amount", type: "bytes32" },
    ],
    outputs: [{ type: "bytes32" }],
  },
  {
    type: "function",
    name: "finalizeUnwrap",
    stateMutability: "nonpayable",
    inputs: [
      { name: "unwrapRequestId", type: "bytes32" },
      { name: "decryptedAmountAndProof", type: "bytes" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "unwrapRequester",
    stateMutability: "view",
    inputs: [{ name: "unwrapAmount", type: "bytes32" }],
    outputs: [{ type: "address" }],
  },
  {
    type: "function",
    name: "underlying",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }],
  },
  {
    type: "event",
    name: "UnwrapRequested",
    inputs: [
      { name: "receiver", type: "address", indexed: true },
      { name: "amount", type: "bytes32", indexed: false },
    ],
  },
  {
    type: "event",
    name: "PayrollRun",
    inputs: [
      { name: "company", type: "address", indexed: true },
      { name: "employeeCount", type: "uint256", indexed: false },
    ],
  },
  {
    type: "function",
    name: "linkFunding",
    stateMutability: "nonpayable",
    inputs: [
      { name: "streamId", type: "uint256" },
      { name: "publicAmount", type: "uint256" },
    ],
    outputs: [],
  },
] as const;

export const PAYUSD_ABI = [
  { type: "function", name: "mint", stateMutability: "nonpayable", inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }], outputs: [] },
  { type: "function", name: "approve", stateMutability: "nonpayable", inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }] },
] as const;

export const SABLIER_ABI = [
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
      { name: "unlockAmounts", type: "tuple", components: [{ name: "start", type: "uint128" }, { name: "cliff", type: "uint128" }] },
      { name: "granularity", type: "uint40" },
      { name: "durations", type: "tuple", components: [{ name: "cliff", type: "uint40" }, { name: "total", type: "uint40" }] },
    ],
    outputs: [{ name: "streamId", type: "uint256" }],
  },
] as const;
