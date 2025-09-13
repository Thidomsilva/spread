// NOTA: As chaves de API não são necessárias para esta chamada de API pública.

const BITMART_API_URL = 'https://api-cloud.bitmart.com/spot/v1';

export type BitmartTickerResponse = {
    symbol: string;
    last_price: string;
    // ... outros campos que não usaremos
};

export type BitmartApiResponse = {
    message: string;
    code: number;
    trace: string;
    data: {
        tickers: BitmartTickerResponse[];
    };
}

/**
 * Busca o preço de mercado mais recente para um par de moedas específico na Bitmart.
 * @param pair O par de moedas no formato 'BTC_USDT'.
 * @returns Uma promessa que resolve para a resposta do ticker da Bitmart.
 */
export async function getBitmartPrice(
  pair: string
): Promise<BitmartTickerResponse> {
  try {
    const response = await fetch(`${BITMART_API_URL}/ticker?symbol=${pair}`);
    
    if (response.status === 429) {
      throw new Error("Erro da API da Bitmart: Muitas requisições. Por favor, aguarde um momento antes de tentar novamente.");
    }
    
    const data: BitmartApiResponse = await response.json();

    if (!response.ok || data.code !== 1000) {
        // Personaliza a mensagem se o erro for sobre o símbolo
        if (data.message && data.message.toLowerCase().includes("symbol not found")) {
             throw new Error(`Erro da API da Bitmart: O par '${pair}' não foi encontrado.`);
        }
        throw new Error(`Erro da API da Bitmart: ${data.message || `Status ${response.status}`}`);
    }
    
    if (!data.data || !data.data.tickers || data.data.tickers.length === 0) {
        throw new Error(`Nenhum dado de ticker encontrado para o par ${pair} na Bitmart.`);
    }

    const ticker = data.data.tickers[0];
    return ticker;

  } catch (error) {
    console.error(`Falha ao buscar o preço da Bitmart para ${pair}:`, error);
     if (error instanceof Error) {
        throw error; // Repassa outros erros da API
    }
    throw new Error(
      'Não foi possível conectar à API da Bitmart. Verifique a conexão de rede.'
    );
  }
}
