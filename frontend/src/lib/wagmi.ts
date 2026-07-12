import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { sepolia } from "wagmi/chains";
import { http } from "wagmi";
import { RPC_URL } from "./payvault";

// WalletConnect projectId enables the mobile QR flow. Get a free one at
// https://cloud.reown.com and set VITE_WC_PROJECT_ID. Injected wallets
// (MetaMask, etc.) work without it.
const projectId =
  import.meta.env.VITE_WC_PROJECT_ID || "00000000000000000000000000000000";

export const wagmiConfig = getDefaultConfig({
  appName: "PayVault",
  projectId,
  chains: [sepolia],
  transports: {
    [sepolia.id]: http(RPC_URL),
  },
  ssr: false,
});
