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
- `@iexec-nox/nox-protocol-contracts` (contracts) and `@iexec-nox/handle` (JS SDK) both install cleanly and work with Hardhat 3 + viem.
- The Solidity model (`euint256`, `Nox.fromExternal`, `Nox.add/sub`, ACL) is intuitive. We reproduced a working Hardhat 3 config from `nox-confidential-contracts` (solc 0.8.35, evm `osaka`, `npmFilesToBuild` to link `Nox.sol`) — this specific config is essential and not obvious; documenting it in the hardhat plugin README would help.
- The **ACL footgun** (must `allowThis` + `allow` after *every* op or the handle is unusable next tx) bit us once; the docs warning is accurate and saved us.
- The off-chain TEE result is **asynchronous**: right after a tx, `decrypt()` can fail for a few seconds until the Runner computes the handle. We added a retry loop. It would help if the docs stated a typical latency and recommended a retry pattern explicitly.
- `@iexec-nox/handle` bundling in the browser: Vite emits a warning about `ethers` `BrowserProvider` not being exported (optional peer dep). Harmless when using the viem client, but confusing at first — a note in the SDK README would help.

## Confidential smart contract wizard (cdefi-wizard)
- Not used for the final build; we hand-wrote contracts. The Hello-World tutorial was enough to get productive.

## Deployment on ETH Sepolia
- Worked first try. NoxCompute on Sepolia: `0x24ef36ec5b626d7dcd09a98f3083c2758f0f77bf`. Faucet (Google Cloud Web3) was reliable.
- Deployed PayrollVault + PayUSD, ran an end-to-end confidential demo, and created a real Sablier LockupLinear stream funding the vault — all on Sepolia, no mock data.

## Overall
- Great DX for a young protocol. The mental model "public addresses/calls, encrypted amounts" is easy to reason about, and selective disclosure via ACL is powerful and maps perfectly to real compliance needs (our whole product relies on it).
- Top asks: (1) update the hackathon links (docs moved to `docs.noxprotocol.io`, SDK is `@iexec-nox/handle` not `@iexec-nox/sdk`); (2) ship a real `nox-hardhat-starter`; (3) document TEE result latency + a canonical retry snippet.
