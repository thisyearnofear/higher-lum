"use client";

import "@rainbow-me/rainbowkit/styles.css";
import {
  RainbowKitProvider,
  ConnectButton,
  getDefaultConfig,
} from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { mainnet } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { baseSepolia, scrollSepolia } from "@/config/wallet-config";

const config = getDefaultConfig({
  appName: "Higher-Coded",
  projectId: "bb610aae7a8414e57b6186fc724ef657",
  chains: [baseSepolia, scrollSepolia, mainnet],
  ssr: true,
});

const queryClient = new QueryClient();

export function WalletButton() {
  return (
    <div className="fixed top-5 left-5 z-50">
      <ConnectButton />
    </div>
  );
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>{children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
