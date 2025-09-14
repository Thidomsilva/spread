// NOTA: As chaves de API não são necessárias para esta chamada de API pública.

const POLONIEX_API_URL = 'https://api.poloniex.com/markets';

export type PoloniexPriceResponse = {
  symbol: string;
  price: string;
  // ... outros campos que não usaremos
};

export type PoloniexErrorResponse = {
    code: number;
    message: string;
}

/**
 * Busca o preço de mercado mais recente para um par de moedas específico na Poloniex.
 * @param pair O par de moedas no formato 'BTC_USDT'.
 * @returns Uma promessa que resolve para a resposta de preço da Poloniex.
 */
export async function getPoloniexPrice(
  pair: string
): Promise<PoloniexPriceResponse> {
  try {
    // A API da Poloniex espera o par no formato 'CURRENCY_COUNTERPART' no endpoint de preço
    const response = await fetch(`${POLONIEX_API_URL}/${pair}/price`);
    
    const data: PoloniexPriceResponse | PoloniexErrorResponse = await response.json();

    if (!response.ok) {
        let errorMessage = `Status ${response.status}`;
        if ('message' in data) {
            errorMessage = (data as PoloniexErrorResponse).message;
            if ((data as PoloniexErrorResponse).code === 21105) { // Código específico para símbolo não encontrado
                 throw new Error(`Erro da API da Poloniex: O par '${pair}' não foi encontrado.`);
            }
        }
        throw new Error(`Erro da API da Poloniex: ${errorMessage}`);
    }
    
    if (!('price' in data)) {
        throw new Error(`Resposta inesperada da API da Poloniex para o par ${pair}.`);
    }

    return data as PoloniexPriceResponse;

  } catch (error) {
    console.error(`Falha ao buscar o preço da Poloniex para ${pair}:`, error);
     if (error instanceof Error) {
        if (error.message.includes('fetch failed')) {
            throw new Error(`Não foi possível conectar à API da Poloniex para o par ${pair}. Verifique a conexão do servidor ou se a API da exchange está online.`);
        }
        throw error;
    }
    throw new Error(
      'Ocorreu um erro desconhecido ao buscar o preço da Poloniex.'
    );
  }
}
