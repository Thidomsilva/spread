'use server';
/**
 * @fileOverview Um agente de IA para analisar a compatibilidade de redes de criptomoedas entre exchanges.
 *
 * - networkAnalysis - Uma função que compara as redes de saque e depósito.
 */

import { ai } from '@/ai/genkit';
import { getMexcAssetNetworks } from '@/services/mexc-networks';
import { getBitmartAssetNetworks } from '@/services/bitmart-networks';
import { getGateioAssetNetworks } from '@/services/gateio-networks';
import { getPoloniexAssetNetworks } from '@/services/poloniex-networks';
import { z } from 'zod';

// Definição da ferramenta que a IA usará para obter informações de rede.
const getExchangeAssetNetworks = ai.defineTool(
  {
    name: 'getExchangeAssetNetworks',
    description: 'Obtém as redes de saque e depósito para um ativo específico em uma exchange.',
    inputSchema: z.object({
      exchange: z.string().describe('O nome da exchange (ex: MEXC, Bitmart, Gate.io, Poloniex).'),
      asset: z.string().describe('O símbolo do ativo (ex: JASMY).'),
    }),
    outputSchema: z.object({
      depositNetworks: z.array(z.string()).describe('Uma lista das redes de depósito suportadas.'),
      withdrawalNetworks: z.array(z.string()).describe('Uma lista das redes de saque suportadas.'),
    }),
  },
  async ({ exchange, asset }) => {
    if (exchange === 'MEXC') {
      return await getMexcAssetNetworks(asset);
    }
    if (exchange === 'Bitmart') {
      return await getBitmartAssetNetworks(asset);
    }
    if (exchange === 'Gate.io') {
      return await getGateioAssetNetworks(asset);
    }
    if (exchange === 'Poloniex') {
      return await getPoloniexAssetNetworks(asset);
    }
    const assetUpperCase = asset.toUpperCase();
    const networksDb: Record<string, Record<string, string[]>> = {
      JASMY: {
        Bitmart: ['ERC20'],
        'Gate.io': ['ERC20', 'Polygon'],
        Poloniex: ['ERC20'],
      },
      PEPE: {
        Bitmart: ['ERC20'],
        'Gate.io': ['ERC20', 'Arbitrum', 'Solana'],
        Poloniex: ['ERC20'],
      },
      BTC: {
        Bitmart: ['Bitcoin', 'BEP20', 'ERC20'],
         'Gate.io': ['Bitcoin', 'Lightning', 'BEP20'],
         Poloniex: ['Bitcoin', 'TRC20'],
      },
    };
    const supportedNetworks = networksDb[assetUpperCase]?.[exchange] || [];
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
type NetworkAnalysisInput = z.infer<typeof NetworkAnalysisInputSchema>;

// Esquema de saída para o fluxo
const NetworkAnalysisOutputSchema = z.object({
  isCompatible: z.boolean().describe('Se existe pelo menos uma rede compatível entre as exchanges.'),
  commonNetworks: z.array(z.string()).describe('A lista de redes de transferência compatíveis em comum.'),
  reasoning: z.string().describe('Uma breve explicação sobre a compatibilidade ou incompatibilidade.'),
});
type NetworkAnalysisOutput = z.infer<typeof NetworkAnalysisOutputSchema>;


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
    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        // Busca redes de origem
        const source = await getExchangeAssetNetworks({ exchange: input.sourceExchange, asset: input.asset });
        // Busca redes de destino
        const dest = await getExchangeAssetNetworks({ exchange: input.destinationExchange, asset: input.asset });
        console.log(`[DEBUG] Redes de saque (${input.sourceExchange}):`, source.withdrawalNetworks);
        console.log(`[DEBUG] Redes de depósito (${input.destinationExchange}):`, dest.depositNetworks);
        // Interseção
        const common = source.withdrawalNetworks.filter(net => dest.depositNetworks.includes(net));
        console.log(`[DEBUG] Redes em comum:`, common);
        // Monta resposta manualmente para depuração
        const output = {
          isCompatible: common.length > 0,
          commonNetworks: common,
          reasoning: common.length > 0 ? `Compatível via redes: ${common.join(', ')}` : 'Incompatível, pois não há redes em comum.',
        };
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
    throw new Error('A análise de rede falhou após múltiplas tentativas.');
  }
);
