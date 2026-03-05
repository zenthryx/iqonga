/**
 * Stub: ZTR/Solana payment removed. Preferred blockchain can be added in Settings later.
 */
export interface ZTRPriceInfo {
  ztrPriceUSD: number;
  userBalance: number;
  tokenAddress: string;
  lastUpdated: number | null;
  bonusPercentage: number;
  isDefaultPrice?: boolean;
  exampleCalculation?: any;
}

export interface ZTRPurchaseResult {
  success: boolean;
  credits?: number;
  error?: string;
  message?: string;
}

class ZTRPaymentService {
  async getPriceInfo(): Promise<ZTRPriceInfo> {
    return {
      ztrPriceUSD: 0,
      userBalance: 0,
      tokenAddress: '',
      lastUpdated: null,
      bonusPercentage: 0,
      isDefaultPrice: true,
    };
  }
  async purchaseCreditsWithZTR(_packageId: string | number): Promise<ZTRPurchaseResult> {
    return { success: false, error: 'Blockchain payments are not available in Iqonga v1.' };
  }
  /** Alias for UI that calls purchaseCredits(wallet, packageId) */
  async purchaseCredits(_wallet: unknown, packageId: string | number): Promise<ZTRPurchaseResult> {
    return this.purchaseCreditsWithZTR(packageId);
  }
}

export const ztrPaymentService = new ZTRPaymentService();
