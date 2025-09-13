'use server';
/**
 * @fileOverview Fluxo para buscar preços de mercado de exchanges.
 *
 * - getMarketPrice - Uma função que busca o preço de um ativo em uma exchange específica.
 * - GetMarketPriceInput - O tipo de entrada para a função.
 */

import { ai } from '@/ai/genkit';
import { getMexcPrice } from '@/services/mexc-service';
import { getBitmartPrice } from '@/services/bitmart-service';
import { getGateioPrice } from '@/services/gateio-service';
import { z } from 'zod';

const GetMarketPriceInputSchema = z.object({
  exchange: z.enum(['MEXC', 'Bitmart', 'Gate.io']),
  asset: z.string().describe('O símbolo do ativo (ex: JASMY)'),
  counterpart: z.string().optional().default('USDT').describe('A contraparte (ex: USDT)'),
});
export type GetMarketPriceInput = z.infer<typeof GetMarketPriceInputSchema>;

// Função de invólucro exportada que chama o fluxo Genkit
export async function getMarketPrice(
  input: GetMarketPriceInput
): Promise<number> {
  return getMarketPriceFlow(input);
}

// Definição do fluxo Genkit
const getMarketPriceFlow = ai.defineFlow(
  {
    name: 'getMarketPriceFlow',
    inputSchema: GetMarketPriceInputSchema,
    outputSchema: z.number(),
  },
  async (input) => {
    console.log(
      `Buscando preço para ${input.asset} na exchange ${input.exchange}`
    );

    let price = 0;
    
    // Lógica robusta para limpar e formatar o par de moedas
    const cleanAsset = input.asset.toUpperCase().split('/')[0].trim();
    const cleanCounterpart = (input.counterpart ?? 'USDT').toUpperCase().trim();

    switch (input.exchange) {
      case 'MEXC':
        // MEXC espera o formato: JASMYUSDT
        const mexcPair = `${cleanAsset}${cleanCounterpart}`;
        const mexcResponse = await getMexcPrice(mexcPair);
        price = parseFloat(mexcResponse.price);
        break;
      case 'Bitmart':
        // Bitmart espera o formato: JASMY_USDT
        const bitmartPair = `${cleanAsset}_${cleanCounterpart}`;
        const bitmartResponse = await getBitmartPrice(bitmartPair);
        price = parseFloat(bitmartResponse.last_price);
        break;
      case 'Gate.io':
        // Gate.io espera o formato: JASMY_USDT
        const gateioPair = `${cleanAsset}_${cleanCounterpart}`;
        const gateioResponse = await getGateioPrice(gateioPair);
        price = parseFloat(gateioResponse.last);
        break;
      default:
        throw new Error(`Exchange desconhecida: ${input.exchange}`);
    }

    if (isNaN(price) || price <= 0) {
      throw new Error(`Preço inválido recebido da exchange ${input.exchange}.`);
    }

    return price;
  }
);
