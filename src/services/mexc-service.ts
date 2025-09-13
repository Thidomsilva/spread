// NOTA: As chaves de API não são necessárias para esta chamada de API pública.

const MEXC_API_URL = 'https://api.mexc.com/api/v3';

export type MexcPriceResponse = {
  symbol: string;
  price: string;
};

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

    const data = await response.json();

    if (!response.ok) {
        const errorData = data as MexcErrorResponse;
        throw new Error(
          `Erro da API da MEXC: ${errorData.msg || `Status ${response.status}`}`
        );
    }
    
    return data as MexcPriceResponse;
  } catch (error) {
    console.error(`Falha ao buscar o preço da MEXC para ${pair}:`, error);
    if (error instanceof Error) {
        throw error;
    }
    throw new Error(
      'Não foi possível conectar à API da MEXC. Verifique a conexão de rede.'
    );
  }
}
