import {
  createWalletClient,
  createPublicClient,
  custom,
  http,
  getContract,
  type Address,
  type WalletClient,
  type PublicClient,
} from "viem";
import { createViemHandleClient } from "@iexec-nox/handle";
import { CHAIN, PAYROLL_VAULT_ABI, PAYROLL_VAULT_ADDRESS } from "./payvault";

export const ZERO_HANDLE =
  "0x0000000000000000000000000000000000000000000000000000000000000000";

declare global {
  interface Window {
    ethereum?: any;
  }
}

export function hasWallet(): boolean {
  return typeof window !== "undefined" && !!window.ethereum;
}

export async function connectWallet(): Promise<Address> {
  if (!hasWallet()) throw new Error("No wallet found. Install MetaMask.");
  const [account] = (await window.ethereum.request({
    method: "eth_requestAccounts",
  })) as Address[];
  await ensureChain();
  return account;
}

export async function ensureChain(): Promise<void> {
  const hexId = "0x" + CHAIN.id.toString(16);
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: hexId }],
    });
  } catch (err: any) {
    if (err?.code === 4902) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: hexId,
            chainName: CHAIN.name,
            nativeCurrency: CHAIN.nativeCurrency,
            rpcUrls: [CHAIN.rpcUrls.default.http[0]],
            blockExplorerUrls: ["https://sepolia.etherscan.io"],
          },
        ],
      });
    } else {
      throw err;
    }
  }
}

export function publicClient(): PublicClient {
  return createPublicClient({ chain: CHAIN, transport: http() });
}

export function walletClient(account: Address): WalletClient {
  return createWalletClient({
    account,
    chain: CHAIN,
    transport: custom(window.ethereum),
  });
}

export function vaultContract(account: Address) {
  return getContract({
    address: PAYROLL_VAULT_ADDRESS,
    abi: PAYROLL_VAULT_ABI,
    client: { public: publicClient(), wallet: walletClient(account) },
  });
}

export async function handleClient(account: Address) {
  return createViemHandleClient(walletClient(account));
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Decrypt a handle, retrying while the off-chain TEE computes the result. */
export async function decryptWithRetry(
  account: Address,
  handle: `0x${string}`,
  tries = 15,
): Promise<bigint> {
  const hc = await handleClient(account);
  let lastErr: any;
  for (let i = 0; i < tries; i++) {
    try {
      const { value } = await hc.decrypt(handle);
      return value as bigint;
    } catch (e) {
      lastErr = e;
      await sleep(4000);
    }
  }
  throw lastErr;
}
