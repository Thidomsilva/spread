// Função utilitária para buscar a "rede principal" de um ativo em uma exchange
// Critério: primeira rede de saque habilitada (pode ser ajustado para lógica diferente)

import { getMexcAssetNetworks } from "./mexc-networks";
import { getBitmartAssetNetworks } from "./bitmart-networks";
import { getGateioAssetNetworks } from "./gateio-networks";
import { getPoloniexAssetNetworks } from "./poloniex-networks";

export async function getMainNetwork(exchange: string, asset: string): Promise<string> {
  let result: { depositNetworks: string[]; withdrawalNetworks: string[] } = { depositNetworks: [], withdrawalNetworks: [] };
  if (exchange === "MEXC") {
    result = await getMexcAssetNetworks(asset);
  } else if (exchange === "Bitmart") {
    result = await getBitmartAssetNetworks(asset);
  } else if (exchange === "Gate.io") {
    result = await getGateioAssetNetworks(asset);
  } else if (exchange === "Poloniex") {
    result = await getPoloniexAssetNetworks(asset);
  }
  console.log(`[API DEBUG] ${exchange} - ${asset} => withdrawal:`, result.withdrawalNetworks, 'deposit:', result.depositNetworks);
  if (result.withdrawalNetworks.length > 0) return result.withdrawalNetworks[0];
  if (result.depositNetworks.length > 0) return result.depositNetworks[0];
  return "";
}
