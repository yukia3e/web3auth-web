import { SafeEventEmitter } from "@toruslabs/openlogin-jrpc";

import { getChainConfig } from "..";
import { AdapterNamespaceType, ChainNamespaceType, CustomChainConfig } from "../chain/IChainInterface";
import { WalletInitializationError, WalletLoginError } from "../errors";
import { SafeEventEmitterProvider } from "../provider/IProvider";

export type UserInfo = {
  /**
   * Email of the logged in user
   */
  email: string;
  /**
   * Full name of the logged in user
   */
  name: string;
  /**
   * Profile image of the logged in user
   */
  profileImage: string;
  /**
   * verifier of the logged in user (google, facebook etc)
   */
  verifier: string;
  /**
   * Verifier Id of the logged in user
   *
   * email for google,
   * id for facebook,
   * username for reddit,
   * id for twitch,
   * id for discord
   */
  verifierId: string;
};

export const ADAPTER_CATEGORY = {
  EXTERNAL: "external",
  IN_APP: "in_app",
} as const;
export type ADAPTER_CATEGORY_TYPE = typeof ADAPTER_CATEGORY[keyof typeof ADAPTER_CATEGORY];

export interface AdapterInitOptions {
  /**
   * Whether to auto connect to the adapter based on redirect mode or saved adapters
   */
  autoConnect?: boolean;
}

export const ADAPTER_STATUS = {
  NOT_READY: "not_ready",
  READY: "ready",
  CONNECTING: "connecting",
  CONNECTED: "connected",
  DISCONNECTED: "disconnected",
  ERRORED: "errored",
} as const;
export type ADAPTER_STATUS_TYPE = typeof ADAPTER_STATUS[keyof typeof ADAPTER_STATUS];

export type CONNECTED_EVENT_DATA = {
  adapter: string;
  reconnected: boolean;
};
export interface IAdapter<T> extends SafeEventEmitter {
  adapterNamespace: AdapterNamespaceType;
  currentChainNamespace: ChainNamespaceType;
  chainConfigProxy: CustomChainConfig | undefined;
  type: ADAPTER_CATEGORY_TYPE;
  name: string;
  status: ADAPTER_STATUS_TYPE;
  provider: SafeEventEmitterProvider | null;
  adapterData?: unknown;
  init(options?: AdapterInitOptions): Promise<void>;
  connect(params?: T): Promise<SafeEventEmitterProvider | void>;
  disconnect(): Promise<void>;
  getUserInfo(): Promise<Partial<UserInfo>>;
  setChainConfig(customChainConfig: CustomChainConfig): void;
  setAdapterSettings(adapterSettings: unknown): void;
}

export abstract class BaseAdapter<T> extends SafeEventEmitter implements IAdapter<T> {
  public adapterData?: unknown = {};

  // should be added in constructor or from setChainConfig function
  // before calling init function.
  protected chainConfig: CustomChainConfig | undefined;

  public abstract adapterNamespace: AdapterNamespaceType;

  public abstract currentChainNamespace: ChainNamespaceType;

  public abstract type: ADAPTER_CATEGORY_TYPE;

  public abstract name: string;

  public abstract status: ADAPTER_STATUS_TYPE;

  public abstract provider: SafeEventEmitterProvider | null;

  get chainConfigProxy(): CustomChainConfig | undefined {
    return this.chainConfig ? { ...this.chainConfig } : undefined;
  }

  setChainConfig(customChainConfig: CustomChainConfig): void {
    if (this.status === ADAPTER_STATUS.READY) return;
    if (!customChainConfig.chainNamespace) throw WalletInitializationError.notReady("ChainNamespace is required while setting chainConfig");
    const defaultChainConfig = getChainConfig(customChainConfig.chainNamespace, customChainConfig.chainId);
    this.chainConfig = { ...defaultChainConfig, ...customChainConfig };
  }

  checkConnectionRequirements(): void {
    if (this.status === ADAPTER_STATUS.CONNECTING) throw WalletLoginError.connectionError("Already pending connection");
    if (this.status === ADAPTER_STATUS.CONNECTED) throw WalletLoginError.connectionError("Already connected");
    if (this.status !== ADAPTER_STATUS.READY) throw WalletLoginError.connectionError("Wallet adapter is not ready yet");
  }

  checkInitializationRequirements(): void {
    if (this.status === ADAPTER_STATUS.NOT_READY) return;
    if (this.status === ADAPTER_STATUS.CONNECTING) throw WalletInitializationError.notReady("Already pending connection");
    if (this.status === ADAPTER_STATUS.CONNECTED) throw WalletInitializationError.notReady("Already connected");
    if (this.status === ADAPTER_STATUS.READY) throw WalletInitializationError.notReady("Adapter is already initialized");
  }

  abstract init(options?: AdapterInitOptions): Promise<void>;
  abstract connect(params?: T): Promise<SafeEventEmitterProvider | void>;
  abstract disconnect(): Promise<void>;
  abstract getUserInfo(): Promise<Partial<UserInfo>>;

  abstract setAdapterSettings(adapterSettings: unknown): void;
}

export interface BaseAdapterConfig {
  label: string;
  showOnModal?: boolean;
  showOnMobile?: boolean;
  showOnDesktop?: boolean;
}

export type LoginMethodConfig = Record<
  string,
  {
    /**
     * Display Name. If not provided, we use the default for openlogin app
     */
    name: string;
    /**
     * Description for button. If provided, it renders as a full length button. else, icon button
     */
    description?: string;
    /**
     * Logo to be shown on mouse hover. If not provided, we use the default for openlogin app
     */
    logoHover?: string;
    /**
     * Logo to be shown on dark background (dark theme). If not provided, we use the default for openlogin app
     */
    logoLight?: string;
    /**
     * Logo to be shown on light background (light theme). If not provided, we use the default for openlogin app
     */
    logoDark?: string;
    /**
     * Show login button on the main list
     */
    mainOption?: boolean;
    /**
     * Whether to show the login button on modal or not
     */
    showOnModal?: boolean;
    /**
     * Whether to show the login button on desktop
     */
    showOnDesktop?: boolean;
    /**
     * Whether to show the login button on mobile
     */
    showOnMobile?: boolean;
  }
>;

export interface WalletConnectV1Data {
  uri: string;
}