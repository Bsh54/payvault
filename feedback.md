# Feedback on iExec / Nox tools

> Required deliverable — living document. We record our real experience using the iExec Nox tooling as we build PayVault.

## Setup experience
- Docs moved from `docs.iex.ec/nox-protocol` to `docs.noxprotocol.io` (old link 308-redirects). The links in the hackathon announcement still point to the old domain — worth updating.
- npm packages: `@iexec-nox/nox-protocol-contracts` (contracts, v0.2.4) and `@iexec-nox/handle` (JS SDK, v0.1.0-beta.13). Note: the announcement mentions `@iexec-nox/sdk` which is a 404 on npm — the real SDK package is `@iexec-nox/handle`.
- `nox-hardhat-plugin` README is still a template placeholder ("TODO update readme"), and there is no `nox-hardhat-starter` repo (404) despite being linked. A working starter would speed onboarding a lot.

## Documentation
- Hello-World (Confidential Piggy Bank) is excellent and clear. The euint256 / `Nox.fromExternal` / ACL pattern is easy to follow.
- Very helpful callout: "Forgetting `Nox.allowThis`/`Nox.allow` after each op makes the handle inaccessible next tx (transient access cleared at end-of-tx)." This is a real footgun — good that it's flagged.
- Networks: ETH Sepolia (11155111) NoxCompute `0x24ef36ec5b626d7dcd09a98f3083c2758f0f77bf`; Arbitrum Sepolia (421614) `0xd464B198f06756a1d00be223634b85E0a731c229`.

## Nox packages (npm `@iexec-nox/*`)
- _(DX notes)_

## Confidential smart contract wizard (cdefi-wizard)
- _(notes)_

## Deployment on ETH Sepolia
- _(what worked / what didn't)_

## Overall
- _(summary + suggestions to the iExec team)_
