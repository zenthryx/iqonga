/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PRIVY_APP_ID: string;
  readonly VITE_SOLANA_RPC_URL?: string;
  readonly REACT_APP_API_URL?: string;
  readonly REACT_APP_ENVIRONMENT?: string;
  readonly REACT_APP_SOLANA_CLUSTER?: string;
  readonly REACT_APP_SOLANA_RPC_URL?: string;
  readonly REACT_APP_SOLANA_NETWORK?: string;
  readonly REACT_APP_DOMAIN?: string;
  readonly REACT_APP_PLATFORM_NAME?: string;
  readonly REACT_APP_AGENT_CREATION_COST?: string;
  readonly REACT_APP_PREMIUM_SUBSCRIPTION_COST?: string;
  readonly REACT_APP_PLATFORM_CONNECTION_COST?: string;
  readonly REACT_APP_PLATFORM_WALLET?: string;
  readonly REACT_APP_ENABLE_PAYMENTS?: string;
  readonly REACT_APP_ENABLE_MAINNET?: string;
  readonly REACT_APP_ENABLE_WALLET_AUTH?: string;
  readonly REACT_APP_ENABLE_ANALYTICS?: string;
  readonly REACT_APP_DEBUG?: string;
  // Add other environment variables as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

