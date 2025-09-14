// Função para buscar redes de depósito e saque de um ativo na Poloniex
export async function getPoloniexAssetNetworks(asset: string): Promise<{ depositNetworks: string[]; withdrawalNetworks: string[] }> {
  const url = 'https://api.poloniex.com/currencies';
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Erro ao buscar redes na Poloniex: Status ${response.status}`);
    }
    const data = await response.json();
    const assetData = data.find((item: any) => item.currency && item.currency.toUpperCase() === asset.toUpperCase());
    if (!assetData || !assetData.networks) return { depositNetworks: [], withdrawalNetworks: [] };
    const depositNetworks = assetData.networks.filter((n: any) => n.depositEnable).map((n: any) => n.network);
    const withdrawalNetworks = assetData.networks.filter((n: any) => n.withdrawEnable).map((n: any) => n.network);
    return { depositNetworks, withdrawalNetworks };
  } catch (error) {
    console.error('Erro ao buscar redes da Poloniex:', error);
    return { depositNetworks: [], withdrawalNetworks: [] };
  }
}
