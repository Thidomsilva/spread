'use server';
/**
 * @fileOverview Um agente de IA para analisar a compatibilidade de redes de criptomoedas entre exchanges.
 *
 * - networkAnalysis - Uma função que compara as redes de saque e depósito.
 * - NetworkAnalysisInput - O tipo de entrada para a função.
 * - NetworkAnalysisOutput - O tipo de retorno para a função.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

// Definição da ferramenta que a IA usará para obter informações de rede.
const getExchangeAssetNetworks = ai.defineTool(
  {
    name: 'getExchangeAssetNetworks',
    description: 'Obtém as redes de saque e depósito para um ativo específico em uma exchange.',
    inputSchema: z.object({
      exchange: z.string().describe('O nome da exchange (ex: MEXC, Bitmart, Gate.io).'),
      asset: z.string().describe('O símbolo do ativo (ex: JASMY).'),
    }),
    outputSchema: z.object({
      depositNetworks: z.array(z.string()).describe('Uma lista das redes de depósito suportadas.'),
      withdrawalNetworks: z.array(z.string()).describe('Uma lista das redes de saque suportadas.'),
    }),
  },
  async ({ exchange, asset }) => {
    // !! NOTA DE SIMULAÇÃO !!
    // Em um aplicativo real, esta função faria uma chamada de API para a exchange
    // para obter as redes reais. Como isso é complexo, estamos simulando a resposta.
    console.log(`SIMULAÇÃO: Buscando redes para ${asset} na ${exchange}`);
    
    // Simulação de dados de rede
    const networksDb: Record<string, Record<string, string[]>> = {
      JASMY: {
        MEXC: ['ERC20', 'BEP20'],
        Bitmart: ['ERC20'],
        'Gate.io': ['ERC20', 'Polygon'],
      },
      PEPE: {
        MEXC: ['ERC20', 'Arbitrum'],
        Bitmart: ['ERC20'],
        'Gate.io': ['ERC20', 'Arbitrum', 'Solana'],
      },
      BTC: {
        MEXC: ['Bitcoin', 'Lightning', 'BEP20'],
        Bitmart: ['Bitcoin', 'BEP20', 'ERC20'],
         'Gate.io': ['Bitcoin', 'Lightning', 'BEP20'],
      },
    };

    const supportedNetworks = networksDb[asset]?.[exchange] || []; // Padrão para lista vazia se não encontrado

    return {
      depositNetworks: supportedNetworks,
      withdrawalNetworks: supportedNetworks,
    };
  }
);

// Esquema de entrada para o fluxo
const NetworkAnalysisInputSchema = z.object({
  asset: z.string().describe('O ativo que será transferido.'),
  sourceExchange: z.string().describe('A exchange de origem (de onde o saque será feito).'),
  destinationExchange: z.string().describe('A exchange de destino (para onde o depósito será feito).'),
});
export type NetworkAnalysisInput = z.infer<typeof NetworkAnalysisInputSchema>;

// Esquema de saída para o fluxo
const NetworkAnalysisOutputSchema = z.object({
  isCompatible: z.boolean().describe('Se existe pelo menos uma rede compatível entre as exchanges.'),
  commonNetworks: z.array(z.string()).describe('A lista de redes de transferência compatíveis em comum.'),
  reasoning: z.string().describe('Uma breve explicação sobre a compatibilidade ou incompatibilidade.'),
});
export type NetworkAnalysisOutput = z.infer<typeof NetworkAnalysisOutputSchema>;


// Função de invólucro que chama o fluxo
export async function networkAnalysis(
  input: NetworkAnalysisInput
): Promise<NetworkAnalysisOutput> {
  return networkAnalysisFlow(input);
}


// O prompt que instrui a IA sobre como realizar a análise
const networkAnalysisPrompt = ai.definePrompt({
    name: 'networkAnalysisPrompt',
    input: { schema: NetworkAnalysisInputSchema },
    output: { schema: NetworkAnalysisOutputSchema },
    tools: [getExchangeAssetNetworks],
    prompt: `Você é um especialista em operações de criptomoedas. Sua tarefa é determinar se um ativo pode ser transferido entre duas exchanges.

    Ativo para transferir: {{{asset}}}
    - Da Exchange (Saque): {{{sourceExchange}}}
    - Para a Exchange (Depósito): {{{destinationExchange}}}

    Instruções:
    1.  Use a ferramenta \`getExchangeAssetNetworks\` para obter as redes de SAQUE (withdrawal) para o ativo {{{asset}}} na exchange {{{sourceExchange}}}.
    2.  Use a ferramenta \`getExchangeAssetNetworks\` para obter as redes de DEPÓSITO (deposit) para o ativo {{{asset}}} na exchange {{{destinationExchange}}}.
    3.  Compare as duas listas de redes.
    4.  **isCompatible**: Defina como \`true\` se houver pelo menos uma rede em comum. Caso contrário, defina como \`false\`.
    5.  **commonNetworks**: Liste todas as redes que apareceram em AMBAS as listas.
    6.  **reasoning**: Escreva uma frase curta explicando o resultado. Por exemplo, "Compatível via redes ERC20 e BEP20." ou "Incompatível, pois não há redes de depósito e saque em comum.".

    Retorne o resultado no formato JSON especificado.`,
});


// A definição do fluxo Genkit
const networkAnalysisFlow = ai.defineFlow(
  {
    name: 'networkAnalysisFlow',
    inputSchema: NetworkAnalysisInputSchema,
    outputSchema: NetworkAnalysisOutputSchema,
  },
  async (input) => {
    console.log(`Analisando compatibilidade de rede para ${input.asset} de ${input.sourceExchange} para ${input.destinationExchange}`);

    const { output } = await networkAnalysisPrompt(input);

    if (!output) {
      throw new Error('A análise de rede da IA não retornou um resultado válido.');
    }
    
    return output;
  }
);
