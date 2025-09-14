'use server';
/**
 * @fileOverview Fluxo para buscar todos os ativos negociáveis de uma exchange.
 *
 * - getExchangeAssets - Uma função que busca os símbolos de ativos.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getAssetsFromDB, addAssetToDB } from './manage-assets-db';


const GetExchangeAssetsInputSchema = z.object({
  exchange: z.enum(['MEXC', 'Bitmart', 'Gate.io', 'Poloniex']),
});
type GetExchangeAssetsInput = z.infer<
  typeof GetExchangeAssetsInputSchema
>;

const GetExchangeAssetsOutputSchema = z.object({
    assets: z.array(z.string()).describe('A lista de símbolos de ativos (ex: JASMY, PEPE, BTC).'),
});
type GetExchangeAssetsOutput = z.infer<
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
    // Retorna uma lista estática e imediata para máxima performance.
    // A lógica de adicionar novos ativos ao DB ainda funciona através da função 'addNewAssetToDB' na UI.
    const simulatedAssetDb: Record<string, string[]> = {
        MEXC: ['JASMY', 'PEPE', 'BTC', 'ETH', 'SOL', 'DOGE', 'SHIB', 'MATIC', 'AVAX', 'LINK'],
        Bitmart: ['JASMY', 'PEPE', 'BTC', 'ETH', 'SOL', 'DOGE', 'SHIB', 'TRX', 'LTC', 'XRP'],
        'Gate.io': ['JASMY', 'PEPE', 'BTC', 'ETH', 'SOL', 'ADA', 'DOT', 'XLM', 'BCH', 'FIL'],
        Poloniex: ['JASMY', 'PEPE', 'BTC', 'ETH', 'SOL', 'USDC', 'TRX', 'DOGE', 'SHIB', 'LTC'],
    };
    const localAssets = simulatedAssetDb[input.exchange] || [];
    
    // Retorna a lista local imediatamente.
    return { assets: localAssets.sort() };
  }
);
