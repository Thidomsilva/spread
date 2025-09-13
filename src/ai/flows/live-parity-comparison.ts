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

// Ferramenta para a IA "buscar" dados de mercado simulados
const getMarketData = ai.defineTool(
  {
    name: 'getMarketData',
    description: 'Obtém dados de mercado simulados para um par de moedas. Use USDT como contraparte para preços e o par direto para o fator de conversão.',
    inputSchema: z.object({
      pair: z.string().describe('O par de moedas no formato ATIVO/CONTRA-MOEDA (ex: JASMY/USDT).'),
    }),
    outputSchema: z.object({
      price: z.number().describe('O preço de mercado simulado para o par.'),
    }),
  },
  async ({pair}) => {
    // Em um cenário real, aqui você chamaria a API de uma exchange.
    // Para esta simulação, a IA irá gerar um preço realista.
    console.log(`Buscando dados de mercado simulados para o par: ${pair}`);
    // O retorno é apenas uma estrutura, a IA preencherá o valor durante a execução.
    return { price: 0 }; 
  }
);


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
  factorAB: z
    .number()
    .describe('O fator de conversão direto do Ativo A para o Ativo B.'),
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

// Definição do prompt que será usado pela IA
const liveParityPrompt = ai.definePrompt({
  name: 'liveParityPrompt',
  input: {schema: LiveParityComparisonInputSchema},
  output: {schema: LiveParityComparisonOutputSchema},
  tools: [getMarketData],
  prompt: `Você é um expert em trading de criptomoedas e sua tarefa é encontrar preços de mercado para uma operação de arbitragem triangular.

    Ativos da operação:
    - Ativo de Compra: {{{assetA}}}
    - Ativo de Venda: {{{assetB}}}

    Instruções:
    1.  **priceA**: Use a ferramenta \`getMarketData\` para encontrar o preço de COMPRA para o par {{{assetA}}}/USDT.
    2.  **priceB**: Use a ferramenta \`getMarketData\` para encontrar o preço de VENDA para o par {{{assetB}}}/USDT.
    3.  **factorAB**: Use a ferramenta \`getMarketData\` para encontrar a taxa de conversão (fator de troca) para o par {{{assetA}}}/{{{assetB}}}.

    Após obter todos os dados, retorne os três valores no formato JSON especificado.`,
});


// Definição do fluxo Genkit que usa o prompt
const liveParityComparisonFlow = ai.defineFlow(
  {
    name: 'liveParityComparisonFlow',
    inputSchema: LiveParityComparisonInputSchema,
    outputSchema: LiveParityComparisonOutputSchema,
  },
  async (input) => {
    console.log(
      `Analisando paridade com IA para ${input.assetA} -> ${input.assetB}`
    );

    const {output} = await liveParityPrompt(input);
    
    // Se a IA não retornar um resultado, lança um erro.
    if (!output) {
      throw new Error('A análise da IA não retornou um resultado válido.');
    }
    
    return output;
  }
);
