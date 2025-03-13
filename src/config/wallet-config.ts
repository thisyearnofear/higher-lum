import { Chain } from "viem";

export const baseMainnet = {
  id: 8453,
  name: "Base",
  nativeCurrency: {
    decimals: 18,
    name: "Ether",
    symbol: "ETH",
  },
  rpcUrls: {
    default: {
      http: ["https://mainnet.base.org"],
    },
    public: {
      http: ["https://mainnet.base.org"],
    },
  },
  blockExplorers: {
    default: {
      name: "Basescan",
      url: "https://basescan.org",
    },
    blockscout: {
      name: "Blockscout",
      url: "https://base.blockscout.com",
    },
  },
  contracts: {
    multicall3: {
      address: "0xca11bde05977b3631167028862be2a173976ca11",
      blockCreated: 5022,
    },
  },
} as const satisfies Chain;

export const baseSepolia = {
  id: 84532,
  name: "Base Sepolia",
  nativeCurrency: {
    decimals: 18,
    name: "Ether",
    symbol: "ETH",
  },
  rpcUrls: {
    default: {
      http: [
        `https://base-sepolia.g.alchemy.com/v2/Tx9luktS3qyIwEKVtjnQrpq8t3MNEV-B`,
      ],
    },
    public: {
      http: [
        `https://base-sepolia.g.alchemy.com/v2/Tx9luktS3qyIwEKVtjnQrpq8t3MNEV-B`,
      ],
    },
  },
  blockExplorers: {
    default: {
      name: "Basescan",
      url: "https://sepolia.basescan.org",
    },
  },
  contracts: {
    multicall3: {
      address: "0xca11bde05977b3631167028862be2a173976ca11",
      blockCreated: 1059647,
    },
  },
  testnet: true,
} as const satisfies Chain;
