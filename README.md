# PayVault — Confidential Payroll & Treasury on Nox

> Pay your team on-chain **without ever revealing salaries** — while staying fully auditable.
> Built for the **iExec WTF Hackathon (Summer Edition)** on **Nox**, iExec's confidential smart-contract layer.

**Live demo:** https://payvault.shadrakbessanh.me
**Network:** Ethereum Sepolia (chainId 11155111)

---

## The problem

Public blockchains expose **everything**. If a company pays its team on-chain (e.g. via a Sablier stream or a Safe treasury), the whole world can see **who earns how much**. That is a non-starter for real businesses. But if you hide *everything*, how does an auditor or tax authority verify compliance?

## The solution

**PayVault** layers confidentiality over **existing public protocols** using **Nox**, without modifying them and without breaking composability:

1. **Confidential payroll** — salary amounts are encrypted (`euint256` handles). They are never visible on-chain; only the company and the employee can decrypt their own figures.
2. **Selective disclosure** — the company can grant an auditor access to the **aggregate** payroll only. The auditor decrypts the total, but **cannot** read any individual salary.
3. **Public funding layer (Sablier)** — the company funds the vault with **one public Sablier lump-sum stream**. The public sees only the aggregate budget flowing in; the **per-employee split stays encrypted** inside Nox.
4. **Confidential payout (ERC-7984)** — `runPayroll()` pays each employee a confidential **cPAY** token balance (ERC-7984) equal to their encrypted salary. Amounts stay hidden on-chain; only each employee can decrypt their own received pay.

```
Company (MetaMask)
   |  1 public Sablier stream (lump sum)         <- public sees only the total
   v
PayrollVault (Nox confidential contract)         <- per-employee salaries = euint256 (encrypted)
   |  ACL: company + employee can read a salary
   |  ACL: auditor can read ONLY the total       <- selective disclosure
   v
Off-chain TEE (Nox Runner) computes on encrypted data
```

## Roles (three separate surfaces)

| Role | URL | What it does |
|---|---|---|
| **Company** | `/app` | Fund payroll, add employees with encrypted salaries, run confidential payout, grant auditors. |
| **Auditor** | `/audit` | Decrypt the aggregate a company granted, never an individual salary. |
| **Employee** | `/mypay` | Decrypt only their own received pay. |

## Deployed addresses (Sepolia)

| Contract | Address |
|---|---|
| **PayrollVault** (also the cPAY ERC-7984 token) | [`0x5c37c25e88edfce2b0b19e11f74c9422a42dd5cc`](https://sepolia.etherscan.io/address/0x5c37c25e88edfce2b0b19e11f74c9422a42dd5cc) |
| **PayUSD** (test payroll token) | [`0xf187422619859a5be5a2db1a275da7a1532d930a`](https://sepolia.etherscan.io/address/0xf187422619859a5be5a2db1a275da7a1532d930a) |
| **Sablier Lockup** (external, unmodified) | [`0xe61cb9153356419bdaD0A8767c059f92d221a3C4`](https://sepolia.etherscan.io/address/0xe61cb9153356419bdaD0A8767c059f92d221a3C4) |

## Repository layout

```
contracts/                Hardhat 3 + Nox — confidential smart contracts
  contracts/
    PayrollVault.sol        multi-tenant confidential payroll + selective disclosure + Sablier link
    PayUSD.sol              test ERC-20 payroll currency
    ConfidentialPiggyBank.sol   Nox hello-world smoke test
  scripts/
    deploy.ts               deploy PayrollVault + PayUSD
    demo.ts                 end-to-end confidential flow (no mock data)
    fund-sablier.ts         create a real public Sablier stream funding the vault
frontend/                 Vite + React dashboard (Company / Auditor / Employee)
  src/
    App.tsx                 routing + company dashboard, auditor and employee pages
    Landing.tsx             public landing (before/after proof, roles, live links)
    lib/                    contract addresses, ABIs, wagmi config, Nox handle client
serve.py                  static SPA server (behind a Cloudflare tunnel)
```

## How Nox is used

- Encrypted type `euint256` for every salary and the running total.
- `Nox.fromExternal(handle, proof)` to accept SDK-encrypted inputs.
- `Nox.add` / `Nox.sub` to keep the encrypted total in sync.
- ACL: `Nox.allowThis`, `Nox.allow(handle, addr)` after every operation — the core of **selective disclosure** (grant the auditor the total handle only).
- JS SDK `@iexec-nox/handle`: `encryptInput`, `decrypt` (gasless, EIP-712) in both the scripts and the browser dashboard.

## Getting started (contracts)

```bash
cd contracts
npm install
cp .env.example .env          # set SEPOLIA_RPC_URL + a funded test SEPOLIA_PRIVATE_KEY
npx hardhat build             # compile (solc 0.8.35, evm osaka)
npm run deploy:sepolia        # deploy PayrollVault + PayUSD
npx hardhat run scripts/demo.ts         --network sepolia   # confidential flow
npx hardhat run scripts/fund-sablier.ts --network sepolia   # public Sablier funding
```

## Getting started (frontend)

```bash
cd frontend
npm install
npm run dev        # local dev at http://localhost:5173
npm run build      # static build -> dist/
```

Optional env: `VITE_RPC_URL` (pinned Sepolia RPC) and `VITE_WC_PROJECT_ID` (WalletConnect QR).

The dashboard connects MetaMask, switches to Sepolia, and lets you:
- **Company:** add employees with encrypted salaries, decrypt your own total, run payroll, grant an auditor.
- **Auditor:** decrypt the aggregate you were granted — never an individual salary.
- **Employee:** decrypt your own confidential pay, then withdraw it to real PayUSD when you choose (unwrap via public-decryption proof).

## Try the live demo

1. Open https://payvault.shadrakbessanh.me and click **Get started** (Company).
2. Fund payroll, add an employee, run payroll.
3. Open `/mypay` as the employee to decrypt your own pay.
4. Open `/audit` as an auditor to decrypt the company total (never a salary).

## Deliverables

- [x] Public GitHub repository with viewable code
- [x] Functional front-end (live)
- [x] Deployed on ETH Sepolia
- [x] `feedback.md` on iExec tools
- [x] Real integration with an existing public protocol (Sablier), unmodified
- [ ] 4-min demo video
- [ ] X post tagging @iEx_ec

## License

MIT
