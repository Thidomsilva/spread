// NOTA: As chaves de API não são necessárias para esta chamada de API específica (preço do ticker).
// Elas serão necessárias para chamadas autenticadas como criação de ordens ou consulta de saldo.

const BINANCE_API_URL = 'https://api.binance.com/api/v3';

export type BinancePriceResponse = {
  symbol: string;
  price: string;
};

type BinanceErrorResponse = {
  code: number;
  msg: string;
}

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
        if (response.status === 451) {
            throw new Error(
              `A Binance bloqueou a solicitação por razões legais (Erro 451). Isso pode ser devido à localização do servidor. Tente usar outra exchange.`
            );
        }
      // Tenta ler o corpo do erro para uma mensagem mais específica
      try {
        const errorData: BinanceErrorResponse = await response.json();
        throw new Error(
          `Erro da API da Binance: ${errorData.msg || `Status ${response.status}`}`
        );
      } catch (jsonError) {
         // Se o corpo do erro não for JSON ou não puder ser lido
         throw new Error(`Erro da API da Binance: Status ${response.status}`);
      }
    }

    const data: BinancePriceResponse = await response.json();
    return data;
  } catch (error) {
    console.error(`Falha ao buscar o preço da Binance para ${pair}:`, error);
    // Repassa o erro original que agora será mais específico
    if (error instanceof Error) {
        throw error;
    }
    // Fallback para um erro genérico
    throw new Error(
      'Não foi possível conectar à API da Binance. Verifique a conexão de rede.'
    );
  }
}
