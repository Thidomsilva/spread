'use server';
/**
 * @fileOverview Um agente de IA para análise de paridade de mercado.
 *
 * - liveParityComparison - Uma função que busca e compara os preços dos ativos.
 * - LiveParityComparisonInput - O tipo de entrada para a função.
 * - LiveParityComparisonOutput - O tipo de retorno para a função.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

// Definição do esquema de entrada com os nomes dos ativos
export const LiveParityComparisonInputSchema = z.object({
  assetA: z.string().describe('O nome/símbolo do primeiro ativo (ex: JASMY)'),
  assetB: z.string().describe('O nome/símbolo do segundo ativo (ex: PEPE)'),
});
export type LiveParityComparisonInput = z.infer<
  typeof LiveParityComparisonInputSchema
>;

// Definição do esquema de saída com os preços e fator encontrados
export const LiveParityComparisonOutputSchema = z.object({
  priceA: z.number().describe('O preço de compra do Ativo A em USDT.'),
  priceB: z.number().describe('O preço de venda do Ativo B em USDT.'),
  factorAB: z.number().describe('O fator de conversão direto do Ativo A para o Ativo B.'),
});
export type LiveParityComparisonOutput = z.infer<
  typeof LiveParityComparisonOutputSchema
>;

// Função de invólucro exportada que chama o fluxo Genkit
export async function liveParityComparison(
  input: LiveParityComparisonInput
): Promise<LiveParityComparisonOutput> {
  return liveParityComparisonFlow(input);
}

// Definição do fluxo Genkit
const liveParityComparisonFlow = ai.defineFlow(
  {
    name: 'liveParityComparisonFlow',
    inputSchema: LiveParityComparisonInputSchema,
    outputSchema: LiveParityComparisonOutputSchema,
  },
  async (input) => {
    // NOTA: Em um cenário real, aqui seria o local para chamar APIs de exchanges
    // para obter os preços em tempo real. Como não temos acesso, vamos retornar
    // dados de exemplo para simular o comportamento da IA.
    console.log(
      `Analisando paridade para ${input.assetA} -> ${input.assetB}`
    );

    // Simulando a busca de preços para o exemplo (JASMY -> PEPE)
    // Estes são os valores do exemplo que usamos antes.
    return {
      priceA: 0.0067035, // Preço de compra de JASMY/USDT
      priceB: 0.4920,    // Preço de venda de PEPE/USDT (exemplo, não é o preço real)
      factorAB: 0.0133,  // Fator de conversão JASMY -> PEPE
    };
  }
);
