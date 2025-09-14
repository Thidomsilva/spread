// NOTA: As chaves de API não são necessárias para esta chamada de API pública.

const MEXC_API_URL = 'https://api.mexc.com/api/v3';

export type MexcPriceResponse = {
  symbol: string;
  price: string;
};

// A MEXC pode retornar um objeto de erro ou um array de respostas válidas.
type MexcApiResponse = MexcPriceResponse | MexcErrorResponse;

type MexcErrorResponse = {
  code: number;
  msg: string;
}

/**
 * Busca o preço de mercado mais recente para um par de moedas específico na MEXC.
 * @param pair O par de moedas no formato 'BTCUSDT'.
 * @returns Uma promessa que resolve para a resposta de preço da MEXC.
 */
export async function getMexcPrice(
  pair: string
): Promise<MexcPriceResponse> {
  try {
    const response = await fetch(`${MEXC_API_URL}/ticker/price?symbol=${pair}`);

    // A API da MEXC pode retornar um array se o símbolo for válido, ou um objeto de erro se for inválido.
    const data: MexcApiResponse | MexcPriceResponse[] = await response.json();

    // Checa se a resposta é um objeto de erro
    if (typeof data === 'object' && !Array.isArray(data) && 'code' in data) {
       throw new Error(`Erro da API da MEXC: ${(data as MexcErrorResponse).msg}`);
    }

    if (!response.ok) {
        throw new Error(`Erro da API da MEXC: Status ${response.status}`);
    }
    
    // Se a resposta for um array, pegamos o primeiro item (geralmente só haverá um para um único símbolo)
    const priceData = Array.isArray(data) ? data[0] : data;

    if (!priceData || !('price' in priceData)) {
      throw new Error(`Resposta inesperada da API da MEXC para o par ${pair}.`);
    }

    return priceData as MexcPriceResponse;
    
  } catch (error) {
    console.error(`Falha ao buscar o preço da MEXC para ${pair}:`, error);
    if (error instanceof Error) {
        // Handle generic fetch error with a more descriptive message
        if (error.message.includes('fetch failed')) {
            throw new Error(`Não foi possível conectar à API da MEXC para o par ${pair}. Verifique a conexão do servidor ou se a API da exchange está online.`);
        }
        throw error;
    }
    throw new Error(
      'Ocorreu um erro desconhecido ao buscar o preço da MEXC.'
    );
  }
}
