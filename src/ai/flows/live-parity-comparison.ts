'use server';

/**
 * @fileOverview Flow for calculating and displaying XPR_equivalente_USDT_via_rede and Delta_relativo_% using live market rates.
 *
 * - calculateParity - A function that handles the parity calculation process.
 * - CalculateParityInput - The input type for the calculateParity function.
 * - CalculateParityOutput - The return type for the calculateParity function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CalculateParityInputSchema = z.object({
  vaultaUsdtPrice: z.number().describe('The price of VAULTA in USDT.'),
  xprVaultaFactor: z.number().describe('The factor for converting XPR to VAULTA.'),
  xprUsdtPrice: z.number().describe('The price of XPR in USDT.')
});
export type CalculateParityInput = z.infer<typeof CalculateParityInputSchema>;

const CalculateParityOutputSchema = z.object({
  xprEquivalenteUsdtViaRede: z.number().describe('The equivalent USDT value of XPR via the VAULTA network.'),
  deltaRelativoPercentage: z.number().describe('The relative percentage difference between XPR price and its equivalent via VAULTA network.'),
});
export type CalculateParityOutput = z.infer<typeof CalculateParityOutputSchema>;

export async function calculateParity(input: CalculateParityInput): Promise<CalculateParityOutput> {
  return calculateParityFlow(input);
}

const calculateParityPrompt = ai.definePrompt({
  name: 'calculateParityPrompt',
  input: {schema: CalculateParityInputSchema},
  output: {schema: CalculateParityOutputSchema},
  prompt: `Calculate the equivalent USDT value of XPR via the VAULTA network and the relative percentage difference.

VAULTA/USDT Price: {{{vaultaUsdtPrice}}}
XPR to VAULTA Factor: {{{xprVaultaFactor}}}
XPR/USDT Price: {{{xprUsdtPrice}}}

XPR_equivalente_USDT_via_rede = VAULTA/USDT Price * XPR to VAULTA Factor
Delta_relativo_% = ((XPR_equivalente_USDT_via_rede - XPR/USDT Price) / XPR/USDT Price) * 100

Return the calculated XPR_equivalente_USDT_via_rede and Delta_relativo_%.`,
});

const calculateParityFlow = ai.defineFlow(
  {
    name: 'calculateParityFlow',
    inputSchema: CalculateParityInputSchema,
    outputSchema: CalculateParityOutputSchema,
  },
  async input => {
    const {output} = await calculateParityPrompt(input);
    return output!;
  }
);
