# PayVault — Confidential Payroll & Treasury on Nox

> Pay your team on-chain **without ever revealing salaries** — while staying fully auditable.
> Built for the **iExec WTF Hackathon (Summer Edition)** on **Nox**, iExec's confidential smart contract layer.

**Live demo:** https://payvault.shadrakbessanh.me

---

## The problem

Public blockchains expose **everything**. If a company pays its team on-chain (e.g. via Sablier streams or a Safe treasury), the whole world can see **who earns how much**. That is a non-starter for real businesses.

But if you hide *everything*, how does an auditor or tax authority verify compliance?

## The solution

**PayVault** adds a confidentiality layer over **existing public protocols (Safe / Sablier)** using **Nox**, without modifying them and without breaking composability:

1. **Confidential payroll** — salary amounts are encrypted; payments still settle on real Safe/Sablier contracts, but amounts stay hidden on-chain.
2. **Selective disclosure** — an authorized auditor can generate a proof (e.g. *"total payroll = X, taxes paid"*) **without revealing individual salaries**.
3. *(stretch)* **Yield-bearing treasury** — idle funds earn yield on Aave, amounts kept private.

## Architecture (high level)

```
Front-end (Next.js) ──encrypt──▶ Nox confidential contracts (TEE)
                                        │ payment order (no amounts revealed)
                                        ▼
                         Public protocols: Safe · Sablier   (ETH Sepolia)
```

## Status

🚧 **Phase 0 — foundations laid.** Placeholder deployed, infra wired. Development in progress.

## Deliverables checklist (hackathon)

- [ ] Public GitHub repo with viewable code
- [ ] Functional front-end
- [ ] Deployed on ETH Sepolia
- [ ] `feedback.md` on iExec tools
- [ ] 4-min demo video
- [ ] X post tagging @iEx_ec

## Tech stack

Next.js · React · Tailwind · Wagmi/RainbowKit · Solidity · Nox Hardhat plugin · Safe · Sablier

## License

MIT
