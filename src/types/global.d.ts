interface Window {
  ethereum?: {
    isMetaMask?: boolean;
    request: (request: {
      method: string;
      params?: Array<Record<string, string> | string | number>;
    }) => Promise<unknown>;
    on: (eventName: string, callback: (params: unknown) => void) => void;
    removeListener: (
      eventName: string,
      callback: (params: unknown) => void
    ) => void;
  };
}

interface ImportMetaEnv {
  NEXT_PUBLIC_ALCHEMY_API_KEY: string;
  NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID: string;
}
