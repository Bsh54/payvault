import { network } from "hardhat";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

// Deploys PayrollVault to the selected network (use --network sepolia).
// Writes the deployed address to ../deployments/<chainId>.json for the frontend.
async function main() {
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();
  const chainId = await publicClient.getChainId();

  const [deployer] = await viem.getWalletClients();
  console.log(`Deployer: ${deployer.account.address}`);
  console.log(`Chain ID: ${chainId}`);

  const vault = await viem.deployContract("PayrollVault", [], { gas: 6_000_000n });
  console.log(`PayrollVault deployed at: ${vault.address}`);

  const payusd = await viem.deployContract("PayUSD");
  console.log(`PayUSD deployed at: ${payusd.address}`);

  const out = {
    chainId,
    PayrollVault: vault.address,
    PayUSD: payusd.address,
    SablierLockup: "0xe61cb9153356419bdaD0A8767c059f92d221a3C4",
    deployer: deployer.account.address,
    deployedAt: new Date().toISOString(),
  };
  const dir = join(process.cwd(), "deployments");
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `${chainId}.json`);
  writeFileSync(file, JSON.stringify(out, null, 2));
  console.log(`Wrote ${file}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
