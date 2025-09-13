'use server';
/**
 * @fileOverview Fluxo para buscar preços de mercado de exchanges.
 *
 * - getMarketPrice - Uma função que busca o preço de um ativo em uma exchange específica.
 * - GetMarketPriceInput - O tipo de entrada para a função.
 */

import { ai } from '@/ai/genkit';
import { getBinancePrice } from '@/services/binance-service';
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
    const counterpart = input.counterpart ?? 'USDT';

    switch (input.exchange) {
      // O caso da Binance foi removido temporariamente devido a bloqueios de região (erro 451)
      // case 'Binance':
      //   const pair = `${input.asset.toUpperCase()}${counterpart.toUpperCase()}`;
      //   const response = await getBinancePrice(pair);
      //   price = parseFloat(response.price);
      //   break;
      case 'MEXC':
      case 'Bitmart':
      case 'Gate.io':
        throw new Error(`A exchange ${input.exchange} ainda não foi implementada.`);
      default:
        throw new Error(`Exchange desconhecida: ${input.exchange}`);
    }

    if (isNaN(price) || price <= 0) {
      throw new Error(`Preço inválido recebido da exchange ${input.exchange}.`);
    }

    return price;
  }
);
