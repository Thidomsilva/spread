// Função para buscar redes de depósito e saque de um ativo na Gate.io
export async function getGateioAssetNetworks(asset: string): Promise<{ depositNetworks: string[]; withdrawalNetworks: string[] }> {
  const url = `https://api.gateio.ws/api/v4/spot/currencies`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Erro ao buscar redes na Gate.io: Status ${response.status}`);
    }
    const data = await response.json();
    const assetData = data.find((item: any) => item.currency && item.currency.toUpperCase() === asset.toUpperCase());
    if (!assetData || !assetData.chains) return { depositNetworks: [], withdrawalNetworks: [] };
    const depositNetworks = assetData.chains.filter((n: any) => n.deposit_enable).map((n: any) => n.chain);
    const withdrawalNetworks = assetData.chains.filter((n: any) => n.withdraw_enable).map((n: any) => n.chain);
    return { depositNetworks, withdrawalNetworks };
  } catch (error) {
    console.error('Erro ao buscar redes da Gate.io:', error);
    return { depositNetworks: [], withdrawalNetworks: [] };
  }
}
