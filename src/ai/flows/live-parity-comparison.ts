'use server';
/**
 * @fileOverview Um agente de IA para análise de paridade de mercado.
 *
 * - liveParityComparison - Uma função que busca e compara os preços dos ativos.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

// Ferramenta para a IA "buscar" dados de mercado simulados
const getMarketData = ai.defineTool(
  {
    name: 'getMarketData',
    description: 'Obtém dados de mercado simulados para um par de moedas. Use USDT como contraparte para preços.',
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

// Ferramenta para a IA buscar informações (taxas) de uma exchange
const getExchangeInfo = ai.defineTool(
  {
      name: 'getExchangeInfo',
      description: 'Obtém informações sobre uma exchange, como suas taxas de negociação.',
      inputSchema: z.object({
          exchange: z.string().describe('O nome da exchange (ex: MEXC, Bitmart, Gate.io, Poloniex).'),
      }),
      outputSchema: z.object({
          tradeFeePercent: z.number().describe('A taxa de negociação padrão em porcentagem (ex: 0.1).'),
      }),
  },
  async ({ exchange }) => {
      // Simulação das taxas de negociação
      const fees: Record<string, number> = {
          'MEXC': 0.1,
          'Bitmart': 0.1,
          'Gate.io': 0.2,
          'Poloniex': 0.14,
      };
      const fee = fees[exchange] || 0.1; // Padrão de 0.1% se não encontrada
      return { tradeFeePercent: fee };
  }
);


// Definição do esquema de entrada com os nomes dos ativos
const LiveParityComparisonInputSchema = z.object({
  assetA: z.string().describe('O nome/símbolo do primeiro ativo (ex: JASMY)'),
  assetB: z.string().describe('O nome/símbolo do segundo ativo (ex: PEPE)'),
  exchangeA: z.string().describe('A exchange onde o ativo A será negociado.'),
  exchangeB: z.string().describe('A exchange onde o ativo B será negociado.'),
});
type LiveParityComparisonInput = z.infer<
  typeof LiveParityComparisonInputSchema
>;

// Definição do esquema de saída com os preços e fator encontrados
const LiveParityComparisonOutputSchema = z.object({
  priceA: z.number().describe('O preço de compra do Ativo A em USDT.'),
  priceB: z.number().describe('O preço de venda do Ativo B em USDT.'),
  feeA: z.number().describe('A taxa de negociação da Exchange A em porcentagem.'),
  feeB: z.number().describe('A taxa de negociação da Exchange B em porcentagem.'),
});
type LiveParityComparisonOutput = z.infer<
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
  tools: [getMarketData, getExchangeInfo],
  prompt: `Você é um expert em trading de criptomoedas e sua tarefa é encontrar preços de mercado e taxas para uma operação de arbitragem.

    Ativos da operação:
    - Ativo de Compra: {{{assetA}}} na exchange {{{exchangeA}}}
    - Ativo de Venda: {{{assetB}}} na exchange {{{exchangeB}}}

    Instruções:
    1.  **priceA**: Use a ferramenta \`getMarketData\` para encontrar o preço de COMPRA para o par {{{assetA}}}/USDT.
    2.  **priceB**: Use a ferramenta \`getMarketData\` para encontrar o preço de VENDA para o par {{{assetB}}}/USDT.
    3.  **feeA**: Use a ferramenta \`getExchangeInfo\` para obter a taxa de negociação da exchange {{{exchangeA}}}.
    4.  **feeB**: Use a ferramenta \`getExchangeInfo\` para obter a taxa de negociação da exchange {{{exchangeB}}}.

    Após obter todos os dados, retorne os valores no formato JSON especificado.`,
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

    try {
      const {output} = await liveParityPrompt(input);
    
      // Se a IA não retornar um resultado, lança um erro.
      if (!output) {
        throw new Error('A análise da IA não retornou um resultado válido.');
      }
      
      return output;

    } catch (error) {
       console.error("Falha no fluxo de comparação de paridade:", error);
       throw new Error("A análise da IA falhou em gerar um resultado.");
    }
  }
);
