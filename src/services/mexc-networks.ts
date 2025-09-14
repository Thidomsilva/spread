// Função para buscar redes de depósito e saque de um ativo na MEXC
export async function getMexcAssetNetworks(asset: string): Promise<{ depositNetworks: string[]; withdrawalNetworks: string[] }> {
  const url = 'https://api.mexc.com/api/v3/capital/config/getall';
  const apiKey = process.env.MEXC_API_KEY;
  try {
    const headers = {
      'X-MEXC-APIKEY': apiKey || ''
    };
    console.log('[MEXC DEBUG] Header enviado:', headers);
    const response = await fetch(url, { headers });
    const raw = await response.text();
    console.log('[MEXC DEBUG] Resposta bruta:', raw.slice(0, 500));
    if (!response.ok) {
      throw new Error(`Erro ao buscar redes na MEXC: Status ${response.status}`);
    }
    const data = JSON.parse(raw);
    const assetData = data.find((item: any) => item.coin && item.coin.toUpperCase() === asset.toUpperCase());
    if (!assetData) {
      return { depositNetworks: [], withdrawalNetworks: [] };
    }
    // Filtra apenas as redes habilitadas para depósito/saque
    const depositNetworks = (assetData.networkList || [])
      .filter((n: any) => n.depositEnable)
      .map((n: any) => n.network);
    const withdrawalNetworks = (assetData.networkList || [])
      .filter((n: any) => n.withdrawEnable)
      .map((n: any) => n.network);
    return { depositNetworks, withdrawalNetworks };
  } catch (error) {
    console.error('Erro ao buscar redes da MEXC:', error);
    return { depositNetworks: [], withdrawalNetworks: [] };
  }
}
