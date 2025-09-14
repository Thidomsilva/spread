"use server";
/**
 * @fileOverview Um consultor de IA para analisar a viabilidade de uma operação de arbitragem.
 *
 * - investmentAnalysis - Uma função que avalia uma operação e fornece recomendações.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

// Esquemas de tipo que foram movidos de network-analysis.ts
const NetworkAnalysisOutputSchema = z.object({
  isCompatible: z.boolean().describe('Se existe pelo menos uma rede compatível entre as exchanges.'),
  commonNetworks: z.array(z.string()).describe('A lista de redes de transferência compatíveis em comum.'),
  reasoning: z.string().describe('Uma breve explicação sobre a compatibilidade ou incompatibilidade.'),
});

// Esquema de entrada para o fluxo de análise de investimento
const InvestmentAnalysisInputSchema = z.object({
  assetA: z.string(),
  exchangeA: z.string(),
  priceA: z.number(),
  feeA: z.number(),
  exchangeB: z.string(),
  priceB: z.number(),
  feeB: z.number(),
  initialInvestment: z.number(),
  finalUSDTValue: z.number(),
  spread: z.number(),
  networkAnalysisResult: NetworkAnalysisOutputSchema,
});
type InvestmentAnalysisInput = z.infer<
  typeof InvestmentAnalysisInputSchema
>;

// Esquema de saída
const InvestmentAnalysisOutputSchema = z.object({
  commentary: z
    .string()
    .describe('Um comentário detalhado e conselhos sobre a operação de arbitragem.'),
});
type InvestmentAnalysisOutput = z.infer<
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
    - **Estratégia:** Comprar {{{assetA}}} na {{{exchangeA}}} e vender na {{{exchangeB}}}.
    - **Investimento Inicial:** \${{{initialInvestment}}} USDT.
    - **Resultado Final Estimado:** \${{{finalUSDTValue}}} USDT.
    - **Spread Líquido:** {{{spread}}}%.
    - **Preço de Compra ({{{exchangeA}}}):** \${{{priceA}}}
    - **Preço de Venda ({{{exchangeB}}}):** \${{{priceB}}}
    - **Taxas:** {{{feeA}}}% (compra) e {{{feeB}}}% (venda).
    - **Análise de Rede:**
        - Compatibilidade: {{{networkAnalysisResult.isCompatible}}}
        - Redes Comuns: {{{networkAnalysisResult.commonNetworks}}}
        - Justificativa da Rede: {{{networkAnalysisResult.reasoning}}}

    **Sua Análise:**
    Com base nos dados, forneça uma recomendação em formato de texto. Seja direto e use um tom profissional.

    **Estrutura da Resposta:**
    1.  **Veredito (1 linha):** Comece com "Recomendação: Viável", "Recomendação: Arriscada" ou "Recomendação: Inviável".
    2.  **Análise (2-3 frases):** Explique o porquê do seu veredito. Mencione o spread, a compatibilidade de rede e outros fatores importantes como taxas de transferência (que não estão nos dados, mas você pode mencionar como um ponto de atenção).
    3.  **Pontos de Atenção (se houver):** Liste 1 ou 2 riscos principais em formato de bullet points (usando "-"). Riscos podem incluir spread baixo, taxas altas, volatilidade do mercado, ou problemas de rede.

    **Exemplo de Resposta Positiva:**
    Recomendação: Viável.
    A operação apresenta um spread líquido positivo e as exchanges possuem redes de transferência compatíveis (ERC20), tornando a execução da arbitragem possível.
    - Risco: A volatilidade dos preços pode corroer o lucro antes da conclusão da transferência. Considere também as taxas de saque e depósito.

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
    console.log(`IA analisando a operação de ${input.assetA} entre ${input.exchangeA} e ${input.exchangeB}`);
    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        const { output } = await investmentAnalysisPrompt(input);
        if (!output) {
          throw new Error('A análise de investimento da IA não retornou um resultado válido.');
        }
        return output;
      } catch (error: any) {
        attempt++;
        if (error.message && error.message.includes('503') && attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000;
          console.log(`Tentativa ${attempt} falhou com erro 503. Tentando novamente em ${delay / 1000}s...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          throw error;
        }
      }
    }
    throw new Error('A análise de investimento falhou após múltiplas tentativas.');
  }
);
