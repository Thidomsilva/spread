'use server';
/**
 * @fileOverview Fluxo para gerenciar ativos no banco de dados Firestore.
 *
 * - getAssetsFromDB - Busca a lista de ativos para uma exchange.
 * - addAssetToDB - Adiciona um novo ativo a uma exchange, evitando duplicatas.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, setDoc, getDoc } from 'firebase/firestore';

// Esquema de entrada para buscar ativos
const GetAssetsInputSchema = z.object({
  exchange: z.string().describe('O nome da exchange (ex: MEXC).'),
});
export type GetAssetsInput = z.infer<typeof GetAssetsInputSchema>;

// Esquema de saída para buscar ativos
const GetAssetsOutputSchema = z.object({
  assets: z.array(z.string()).describe('A lista de ativos conhecidos para a exchange.'),
});
export type GetAssetsOutput = z.infer<typeof GetAssetsOutputSchema>;

// Função para buscar ativos do banco de dados
export async function getAssetsFromDB(
  input: GetAssetsInput
): Promise<GetAssetsOutput> {
  return getAssetsFlow(input);
}

const getAssetsFlow = ai.defineFlow(
  {
    name: 'getAssetsFromDBFlow',
    inputSchema: GetAssetsInputSchema,
    outputSchema: GetAssetsOutputSchema,
  },
  async ({ exchange }) => {
    // A captura de erros (try/catch) deve ser feita pelo chamador (get-exchange-assets.ts),
    // pois ele tem o contexto para implementar uma lógica de fallback.
    const docRef = doc(db, 'exchanges', exchange);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists() && docSnap.data().assets) {
      return { assets: docSnap.data().assets as string[] };
    } else {
      return { assets: [] };
    }
  }
);


// Esquema de entrada para adicionar um ativo
const AddAssetInputSchema = z.object({
  exchange: z.string().describe('O nome da exchange (ex: MEXC).'),
  asset: z.string().describe('O símbolo do ativo a ser adicionado (ex: BTC).'),
});
export type AddAssetInput = z.infer<typeof AddAssetInputSchema>;


// Função para adicionar um ativo ao banco de dados
export async function addAssetToDB(
  input: AddAssetInput
): Promise<void> {
   await addAssetFlow(input);
}

const addAssetFlow = ai.defineFlow(
  {
    name: 'addAssetToDBFlow',
    inputSchema: AddAssetInputSchema,
  },
  async ({ exchange, asset }) => {
    const assetUpperCase = asset.toUpperCase();
    const docRef = doc(db, 'exchanges', exchange);
    
    try {
        const docSnap = await getDoc(docRef);

        let currentAssets: string[] = [];
        if (docSnap.exists() && Array.isArray(docSnap.data().assets)) {
          currentAssets = docSnap.data().assets;
        }

        if (!currentAssets.some(a => a.toUpperCase() === assetUpperCase)) {
          const newAssets = [...currentAssets, assetUpperCase];
          await setDoc(docRef, { assets: newAssets }, { merge: true });
          console.log(`Ativo '${assetUpperCase}' adicionado à exchange '${exchange}' no Firestore.`);
        } else {
          console.log(`Ativo '${assetUpperCase}' já existe na exchange '${exchange}'. Nenhum dado foi alterado.`);
        }
    } catch (error) {
        console.error(`Falha ao adicionar/verificar o ativo '${assetUpperCase}' para a exchange '${exchange}':`, error);
    }
  }
);
