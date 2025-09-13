// NOTA: As chaves de API não são necessárias para esta chamada de API específica (preço do ticker).
// Elas serão necessárias para chamadas autenticadas como criação de ordens ou consulta de saldo.

const BINANCE_API_URL = 'https://api.binance.com/api/v3';

export type BinancePriceResponse = {
  symbol: string;
  price: string;
};

/**
 * Busca o preço de mercado mais recente para um par de moedas específico na Binance.
 * @param pair O par de moedas no formato 'BTCUSDT'.
 * @returns Uma promessa que resolve para a resposta de preço da Binance.
 */
export async function getBinancePrice(
  pair: string
): Promise<BinancePriceResponse> {
  try {
    const response = await fetch(`${BINANCE_API_URL}/ticker/price?symbol=${pair}`);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `Erro da API da Binance: ${response.status} - ${
          errorData.msg || 'Erro desconhecido'
        }`
      );
    }

    const data: BinancePriceResponse = await response.json();
    return data;
  } catch (error) {
    console.error(`Falha ao buscar o preço da Binance para ${pair}:`, error);
    throw new Error(
      'Não foi possível conectar à API da Binance. Verifique a conexão de rede.'
    );
  }
}
