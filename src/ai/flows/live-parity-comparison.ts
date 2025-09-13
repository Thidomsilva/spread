'use server';

/**
 * @fileOverview Flow for calculating and displaying XPR_equivalente_USDT_via_rede and Delta_relativo_% using live market rates.
 *
 * - calculateParity - A function that handles the parity calculation process.
 * - CalculateParityInput - The input type for the calculateParity function.
 * - CalculateParityOutput - The return type for the calculateParity function.
 */

export interface CalculateParityInput {
  vaultaUsdtPrice: number;
  xprVaultaFactor: number;
  xprUsdtPrice: number;
}

export interface CalculateParityOutput {
  xprEquivalenteUsdtViaRede: number;
  deltaRelativoPercentage: number;
}

export async function calculateParity(input: CalculateParityInput): Promise<CalculateParityOutput> {
  const xprEquivalenteUsdtViaRede = input.vaultaUsdtPrice * input.xprVaultaFactor;
  const deltaRelativoPercentage = ((xprEquivalenteUsdtViaRede - input.xprUsdtPrice) / input.xprUsdtPrice) * 100;

  return Promise.resolve({
    xprEquivalenteUsdtViaRede,
    deltaRelativoPercentage,
  });
}
