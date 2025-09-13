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
    console.log(
      `Buscando todos os ativos para a exchange ${input.exchange}`
    );

    // 1. Define a lista de fallback simulada PRIMEIRO para garantir uma resposta rápida.
    const simulatedAssetDb: Record<string, string[]> = {
        MEXC: ['JASMY', 'PEPE', 'BTC', 'ETH', 'SOL', 'DOGE', 'SHIB', 'MATIC', 'AVAX', 'LINK'],
        Bitmart: ['JASMY', 'PEPE', 'BTC', 'ETH', 'SOL', 'DOGE', 'SHIB', 'TRX', 'LTC', 'XRP'],
        'Gate.io': ['JASMY', 'PEPE', 'BTC', 'ETH', 'SOL', 'ADA', 'DOT', 'XLM', 'BCH', 'FIL'],
        Poloniex: ['JASMY', 'PEPE', 'BTC', 'ETH', 'SOL', 'USDC', 'TRX', 'DOGE', 'SHIB', 'LTC'],
    };
    const localAssets = simulatedAssetDb[input.exchange] || [];

    // 2. Tenta buscar os ativos do Firestore em segundo plano.
    // Esta operação é "fire-and-forget" para não atrasar a resposta principal.
    (async () => {
      try {
        const dbAssets = await getAssetsFromDB({ exchange: input.exchange });
        if (dbAssets.assets.length === 0 && localAssets.length > 0) {
            console.log(`Banco de dados para ${input.exchange} está vazio. Tentando salvar a lista local...`);
            // Se o DB estiver vazio, salva a lista local nele.
            for (const asset of localAssets) {
                // addAssetToDB já contém a lógica para não duplicar.
                await addAssetToDB({ exchange: input.exchange, asset });
            }
            console.log(`Lista de ativos simulados para ${input.exchange} salva no Firestore em segundo plano.`);
        } else {
            console.log(`Ativos para ${input.exchange} já existem no DB ou a lista local está vazia. Nenhuma ação necessária.`);
        }
      } catch (error) {
          console.error(`Erro ao verificar/salvar ativos no Firestore em segundo plano para ${input.exchange}:`, error);
      }
    })();
    
    // 3. Retorna a lista local imediatamente, sem esperar pelo banco de dados.
    return { assets: localAssets.sort() };
  }
);