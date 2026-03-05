/**
 * Stub: Solana payment removed. Preferred blockchain/payment can be added in Settings later.
 */
export interface PaymentResult {
  success: boolean;
  signature?: string;
  error?: string;
  credits?: number;
  creditsAdded?: number;
  debtPaid?: number;
  balance?: number;
  debtBalance?: number;
}

export class SolanaPaymentService {
  async purchaseCredits(_wallet: any, _packageId: string, _paymentMethod: string = 'SOL'): Promise<PaymentResult> {
    return { success: false, error: 'Blockchain payments are not available in Iqonga v1.' };
  }
}

export const solanaPaymentService = new SolanaPaymentService();
