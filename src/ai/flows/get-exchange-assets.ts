'use server';
/**
 * @fileOverview Fluxo para buscar todos os ativos negociáveis de uma exchange.
 *
 * - getExchangeAssets - Uma função que busca os símbolos de ativos.
 * - GetExchangeAssetsInput - O tipo de entrada para a função.
 * - GetExchangeAssetsOutput - O tipo de retorno para a função.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const GetExchangeAssetsInputSchema = z.object({
  exchange: z.enum(['MEXC', 'Bitmart', 'Gate.io']),
});
export type GetExchangeAssetsInput = z.infer<
  typeof GetExchangeAssetsInputSchema
>;

const GetExchangeAssetsOutputSchema = z.object({
    assets: z.array(z.string()).describe('A lista de símbolos de ativos (ex: JASMY, PEPE, BTC).'),
});
export type GetExchangeAssetsOutput = z.infer<
    typeof GetExchangeAssetsOutputSchema
>;


// Função de invólucro exportada que chama o fluxo Genkit
export async function getExchangeAssets(
  input: GetExchangeAssetsInput
): Promise<GetExchangeAssetsOutput> {
  return getExchangeAssetsFlow(input);
}

// Definição do fluxo Genkit
const getExchangeAssetsFlow = ai.defineFlow(
  {
    name: 'getExchangeAssetsFlow',
    inputSchema: GetExchangeAssetsInputSchema,
    outputSchema: GetExchangeAssetsOutputSchema,
  },
  async (input) => {
    console.log(
      `Buscando todos os ativos para a exchange ${input.exchange}`
    );

    // !! NOTA DE SIMULAÇÃO !!
    // Em um aplicativo real, esta função faria uma chamada de API para a exchange
    // para obter a lista completa de ativos. Para agilizar, estamos simulando a resposta.
    const assetDb: Record<string, string[]> = {
        MEXC: ['JASMY', 'PEPE', 'BTC', 'ETH', 'SOL', 'DOGE', 'SHIB', 'MATIC', 'AVAX', 'LINK'],
        Bitmart: ['JASMY', 'PEPE', 'BTC', 'ETH', 'SOL', 'DOGE', 'SHIB', 'TRX', 'LTC', 'XRP'],
        'Gate.io': ['JASMY', 'PEPE', 'BTC', 'ETH', 'SOL', 'ADA', 'DOT', 'XLM', 'BCH', 'FIL'],
    };

    const assets = assetDb[input.exchange] || [];
    
    // Filtra apenas os pares que terminam com USDT e retorna o nome base
    // Ex: Em uma API real, o retorno seria 'JASMYUSDT', e queremos apenas 'JASMY'
    // Como estamos simulando, já retornamos a lista limpa.

    return { assets: assets.sort() };
  }
);

    