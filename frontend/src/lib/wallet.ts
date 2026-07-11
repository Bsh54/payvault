import {
  createPublicClient,
  http,
  getContract,
  encodeFunctionData,
  type WalletClient,
  type PublicClient,
} from "viem";
import { createViemHandleClient } from "@iexec-nox/handle";
import { CHAIN, PAYROLL_VAULT_ABI, PAYROLL_VAULT_ADDRESS } from "./payvault";

export const ZERO_HANDLE =
  "0x0000000000000000000000000000000000000000000000000000000000000000";

export function publicClient(): PublicClient {
  return createPublicClient({ chain: CHAIN, transport: http() });
}

/** Read-only contract instance (no wallet needed). */
export function readVault() {
  return getContract({
    address: PAYROLL_VAULT_ADDRESS,
    abi: PAYROLL_VAULT_ABI,
    client: publicClient(),
  });
}

/** Nox handle client bound to the connected wallet (for encrypt/decrypt). */
export async function handleClient(walletClient: WalletClient) {
  return createViemHandleClient(walletClient);
}

/**
 * Send a PayrollVault transaction via the connected wallet client.
 * We only pass { to, data } and let the wallet estimate gas — this keeps
 * compatibility with both classic EOAs and smart accounts.
 */
export async function sendVaultTx(
  walletClient: WalletClient,
  functionName: string,
  args: readonly unknown[],
): Promise<`0x${string}`> {
  const data = encodeFunctionData({
    abi: PAYROLL_VAULT_ABI,
    functionName: functionName as any,
    args: args as any,
  });
  const hash = await walletClient.sendTransaction({
    account: walletClient.account!,
    chain: CHAIN,
    to: PAYROLL_VAULT_ADDRESS,
    data,
  });
  return hash;
}

/** Encode + send a call to any contract via the connected wallet. */
export async function sendTo(
  walletClient: WalletClient,
  to: `0x${string}`,
  abi: any,
  functionName: string,
  args: readonly unknown[],
): Promise<`0x${string}`> {
  const data = encodeFunctionData({ abi, functionName: functionName as any, args: args as any });
  return walletClient.sendTransaction({
    account: walletClient.account!,
    chain: CHAIN,
    to,
    data,
  });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Decrypt a handle, retrying while the off-chain TEE computes the result. */
export async function decryptWithRetry(
  walletClient: WalletClient,
  handle: `0x${string}`,
  tries = 15,
): Promise<bigint> {
  const hc = await handleClient(walletClient);
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
