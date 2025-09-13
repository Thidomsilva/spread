'use server';
/**
 * @fileOverview Um consultor de IA para analisar a viabilidade de uma operação de arbitragem.
 *
 * - investmentAnalysis - Uma função que avalia uma operação e fornece recomendações.
 * - InvestmentAnalysisInput - O tipo de entrada para a função.
 * - InvestmentAnalysisOutput - O tipo de retorno para a função.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import type { NetworkAnalysisOutput } from './network-analysis';
import { NetworkAnalysisOutputSchema } from './network-analysis';

// Esquema de entrada para o fluxo de análise de investimento
export const InvestmentAnalysisInputSchema = z.object({
  assetA: z.string(),
  exchangeA: z.string(),
  priceA: z.number(),
  feeA: z.number(),
  assetB: z.string(),
  exchangeB: z.string(),
  priceB: z.number(),
  feeB: z.number(),
  initialInvestment: z.number(),
  finalUSDTValue: z.number(),
  spread: z.number(),
  networkAnalysisResult: NetworkAnalysisOutputSchema,
});
export type InvestmentAnalysisInput = z.infer<
  typeof InvestmentAnalysisInputSchema
>;

// Esquema de saída
const InvestmentAnalysisOutputSchema = z.object({
  commentary: z
    .string()
    .describe('Um comentário detalhado e conselhos sobre a operação de arbitragem.'),
});
export type InvestmentAnalysisOutput = z.infer<
  typeof InvestmentAnalysisOutputSchema
>;

// Função de invólucro que chama o fluxo
export async function investmentAnalysis(
  input: InvestmentAnalysisInput
): Promise<InvestmentAnalysisOutput> {
  return investmentAnalysisFlow(input);
}

// O prompt que instrui a IA sobre como agir como um consultor
const investmentAnalysisPrompt = ai.definePrompt({
  name: 'investmentAnalysisPrompt',
  input: { schema: InvestmentAnalysisInputSchema },
  output: { schema: InvestmentAnalysisOutputSchema },
  prompt: `Você é um consultor de investimentos e especialista em arbitragem de criptomoedas. Sua tarefa é analisar a seguinte operação e fornecer um parecer claro e direto para o usuário.

    **Dados da Operação:**
    - **Estratégia:** Comprar {{{assetA}}} na {{{exchangeA}}} e vender como {{{assetB}}} na {{{exchangeB}}}.
    - **Investimento Inicial:** \${{{initialInvestment}}} USDT.
    - **Resultado Final:** \${{{finalUSDTValue}}} USDT.
    - **Spread Líquido:** {{{spread}}}%.
    - **Preço de Compra ({{{assetA}}}):** \${{{priceA}}}
    - **Preço de Venda ({{{assetB}}}):** \${{{priceB}}}
    - **Taxas:** {{{feeA}}}% na {{{exchangeA}}} e {{{feeB}}}% na {{{exchangeB}}}.
    - **Análise de Rede:**
        - Compatibilidade: {{{networkAnalysisResult.isCompatible}}}
        - Redes Comuns: {{{networkAnalysisResult.commonNetworks}}}
        - Justificativa da Rede: {{{networkAnalysisResult.reasoning}}}

    **Sua Análise:**
    Com base nos dados, forneça uma recomendação em formato de texto. Seja direto e use um tom profissional.

    **Estrutura da Resposta:**
    1.  **Veredito (1 linha):** Comece com "Recomendação: Viável", "Recomendação: Arriscada" ou "Recomendação: Inviável".
    2.  **Análise (2-3 frases):** Explique o porquê do seu veredito. Mencione o spread, a compatibilidade de rede e outros fatores importantes.
    3.  **Pontos de Atenção (se houver):** Liste 1 ou 2 riscos principais em formato de bullet points (usando "-"). Riscos podem incluir spread baixo, taxas altas, volatilidade do mercado, ou problemas de rede.

    **Exemplo de Resposta Positiva:**
    Recomendação: Viável.
    A operação apresenta um spread líquido positivo e as exchanges possuem redes de transferência compatíveis (ERC20), tornando a execução da arbitragem possível.
    - Risco: A volatilidade dos preços pode corroer o lucro antes da conclusão da transferência.

    **Exemplo de Resposta Negativa (Incompatibilidade):**
    Recomendação: Inviável.
    Apesar de um spread aparentemente lucrativo, não existem redes de saque e depósito compatíveis entre as duas exchanges para o ativo {{{assetA}}}, impossibilitando a transferência.

    **Exemplo de Resposta Negativa (Spread Baixo):**
    Recomendação: Arriscada.
    O spread líquido é muito baixo ou negativo, o que significa que as taxas e a volatilidade do mercado provavelmente resultarão em prejuízo. A operação não compensa o risco.

    Agora, analise os dados fornecidos e gere seu parecer.`,
});

// A definição do fluxo Genkit
const investmentAnalysisFlow = ai.defineFlow(
  {
    name: 'investmentAnalysisFlow',
    inputSchema: InvestmentAnalysisInputSchema,
    outputSchema: InvestmentAnalysisOutputSchema,
  },
  async (input) => {
    console.log(`IA analisando a operação de ${input.assetA} para ${input.assetB}`);

    const { output } = await investmentAnalysisPrompt(input);

    if (!output) {
      throw new Error('A análise de investimento da IA não retornou um resultado válido.');
    }
    
    return output;
  }
);
