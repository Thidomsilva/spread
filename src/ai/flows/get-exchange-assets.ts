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
import { getAssetsFromDB, addAssetToDB } from './manage-assets-db';


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

    // 1. Tenta buscar os ativos do Firestore
    try {
        const dbAssets = await getAssetsFromDB({ exchange: input.exchange });
        if (dbAssets.assets.length > 0) {
            console.log(`Ativos para ${input.exchange} carregados do Firestore.`);
            return { assets: dbAssets.assets.sort() };
        }
    } catch (error) {
        console.error(`Erro ao buscar ativos do Firestore para ${input.exchange}. Usando fallback.`, error);
        // Não faz nada, apenas loga. O código abaixo cuidará do fallback.
    }

    // 2. Fallback: Usa a lista simulada se o DB estiver vazio ou se a busca falhou
    console.log(`Nenhum ativo encontrado no Firestore para ${input.exchange} ou falha na conexão. Usando lista simulada e populando o DB.`);
    const simulatedAssetDb: Record<string, string[]> = {
        MEXC: ['JASMY', 'PEPE', 'BTC', 'ETH', 'SOL', 'DOGE', 'SHIB', 'MATIC', 'AVAX', 'LINK'],
        Bitmart: ['JASMY', 'PEPE', 'BTC', 'ETH', 'SOL', 'DOGE', 'SHIB', 'TRX', 'LTC', 'XRP'],
        'Gate.io': ['JASMY', 'PEPE', 'BTC', 'ETH', 'SOL', 'ADA', 'DOT', 'XLM', 'BCH', 'FIL'],
    };

    const assetsToSave = simulatedAssetDb[input.exchange] || [];

    // 3. Salva os ativos simulados no Firestore para futuras buscas
    if (assetsToSave.length > 0) {
        try {
            for (const asset of assetsToSave) {
                // Adiciona um por um para usar a lógica de "não duplicar"
                await addAssetToDB({ exchange: input.exchange, asset });
            }
            console.log(`Lista de ativos simulados para ${input.exchange} salva no Firestore.`);
        } catch (error) {
            console.error(`Erro ao salvar ativos simulados no Firestore para ${input.exchange}:`, error);
            // Se o salvamento falhar, não impede o retorno dos dados para o usuário
        }
    }

    return { assets: assetsToSave.sort() };
  }
);
