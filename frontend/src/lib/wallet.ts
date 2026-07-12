import {
  createPublicClient,
  http,
  getContract,
  encodeFunctionData,
  decodeEventLog,
  type WalletClient,
  type PublicClient,
} from "viem";
import { createViemHandleClient } from "@iexec-nox/handle";
import { CHAIN, RPC_URL, PAYROLL_VAULT_ABI, PAYROLL_VAULT_ADDRESS } from "./payvault";

export const ZERO_HANDLE =
  "0x0000000000000000000000000000000000000000000000000000000000000000";

export function publicClient(): PublicClient {
  return createPublicClient({ chain: CHAIN, transport: http(RPC_URL) });
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

/**
 * Withdraw the caller's full confidential cPAY balance back into public PayUSD.
 * Two on-chain steps around one off-chain public decryption:
 *   1. unwrap(): burns the confidential balance, marks the amount publicly decryptable.
 *   2. publicDecrypt(): the Nox gateway produces the plaintext + a validity proof.
 *   3. finalizeUnwrap(): the vault validates the proof and transfers real PayUSD.
 * Returns the withdrawn amount (public only from this point on).
 */
export async function withdrawAll(
  walletClient: WalletClient,
  onStatus?: (s: string) => void,
): Promise<bigint> {
  const account = walletClient.account!.address;
  const handle = (await readVault().read.confidentialBalanceOf([account])) as `0x${string}`;
  if (handle === ZERO_HANDLE) throw new Error("No pay to withdraw yet.");

  onStatus?.("Requesting withdrawal…");
  const tx1 = await sendVaultTx(walletClient, "unwrap", [account, account, handle]);
  const receipt = await publicClient().waitForTransactionReceipt({ hash: tx1 });

  let requestId: `0x${string}` | undefined;
  for (const log of receipt.logs) {
    try {
      const ev = decodeEventLog({ abi: PAYROLL_VAULT_ABI, data: log.data, topics: log.topics });
      if (ev.eventName === "UnwrapRequested") {
        requestId = (ev.args as { amount: `0x${string}` }).amount;
        break;
      }
    } catch {
      /* not our event */
    }
  }
  if (!requestId) throw new Error("Unwrap request not found in logs.");

  onStatus?.("Decrypting your amount…");
  const hc = await handleClient(walletClient);
  let proof: `0x${string}`;
  let value: bigint;
  for (let i = 0; ; i++) {
    try {
      const res = await hc.publicDecrypt(requestId);
      proof = res.decryptionProof as `0x${string}`;
      value = res.value as bigint;
      break;
    } catch (e) {
      if (i >= 10) throw e;
      await sleep(4000);
    }
  }

  onStatus?.("Finalizing withdrawal…");
  const tx2 = await sendVaultTx(walletClient, "finalizeUnwrap", [requestId, proof]);
  await publicClient().waitForTransactionReceipt({ hash: tx2 });
  return value;
}

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
