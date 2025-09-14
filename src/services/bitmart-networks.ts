// Função para buscar redes de depósito e saque de um ativo na Bitmart
export async function getBitmartAssetNetworks(asset: string): Promise<{ depositNetworks: string[]; withdrawalNetworks: string[] }> {
  const url = 'https://api-cloud.bitmart.com/spot/v1/currencies';
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Erro ao buscar redes na Bitmart: Status ${response.status}`);
    }
    const data = await response.json();
    if (!data.currencies) return { depositNetworks: [], withdrawalNetworks: [] };
    const assetData = data.currencies.find((item: any) => item.currency && item.currency.toUpperCase() === asset.toUpperCase());
    if (!assetData || !assetData.network_list) return { depositNetworks: [], withdrawalNetworks: [] };
    const depositNetworks = assetData.network_list.filter((n: any) => n.deposit_enabled).map((n: any) => n.name);
    const withdrawalNetworks = assetData.network_list.filter((n: any) => n.withdraw_enabled).map((n: any) => n.name);
    return { depositNetworks, withdrawalNetworks };
  } catch (error) {
    console.error('Erro ao buscar redes da Bitmart:', error);
    return { depositNetworks: [], withdrawalNetworks: [] };
  }
}
