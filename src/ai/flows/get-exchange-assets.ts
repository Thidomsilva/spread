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
    try {
        const dbAssets = await getAssetsFromDB({ exchange: input.exchange });
        if (dbAssets.assets.length > 0) {
            console.log(`Ativos para ${input.exchange} carregados do Firestore.`);
            // Combina e remove duplicatas, dando preferência aos dados do DB
            const combined = [...new Set([...dbAssets.assets, ...localAssets])];
            return { assets: combined.sort() };
        }
    } catch (error) {
        console.error(`Erro ao buscar ativos do Firestore para ${input.exchange}. Usando apenas a lista local.`, error);
        // A falha aqui não é crítica, pois já temos a lista local para retornar.
    }

    // 3. Se o DB estiver vazio ou a busca falhar, retorna a lista local imediatamente.
    console.log(`Usando lista simulada para ${input.exchange}. O salvamento no DB ocorrerá em segundo plano se necessário.`);
    
    // 4. Salva os ativos locais no Firestore se eles ainda não estiverem lá.
    // Isso é feito em "segundo plano" (fire-and-forget) para não atrasar a resposta ao usuário.
    if (localAssets.length > 0) {
        (async () => {
            try {
                for (const asset of localAssets) {
                    // addAssetToDB já contém a lógica para não duplicar.
                    await addAssetToDB({ exchange: input.exchange, asset });
                }
                console.log(`Lista de ativos simulados para ${input.exchange} verificada/salva no Firestore.`);
            } catch (error) {
                console.error(`Erro ao salvar ativos simulados no Firestore em segundo plano para ${input.exchange}:`, error);
            }
        })();
    }

    return { assets: localAssets.sort() };
  }
);
