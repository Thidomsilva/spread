// NOTA: As chaves de API não são necessárias para esta chamada de API pública.

const GATEIO_API_URL = 'https://api.gateio.ws/api/v4/spot';

export type GateioTickerResponse = {
  currency_pair: string;
  last: string;
  // ... outros campos que não usaremos
};

export type GateioErrorResponse = {
    label: string;
    message: string;
}

/**
 * Busca o preço de mercado mais recente para um par de moedas específico na Gate.io.
 * @param pair O par de moedas no formato 'BTC_USDT'.
 * @returns Uma promessa que resolve para a resposta do ticker da Gate.io.
 */
export async function getGateioPrice(
  pair: string
): Promise<GateioTickerResponse> {
  try {
    // A API da Gate.io espera o par no formato 'CURRENCY_COUNTERPART'
    const response = await fetch(`${GATEIO_API_URL}/tickers?currency_pair=${pair}`);
    
    // A Gate.io pode retornar um array vazio se o par não existir
    const data: GateioTickerResponse[] | GateioErrorResponse = await response.json();

    if ('label' in data && data.label === 'INVALID_CURRENCY_PAIR') {
        throw new Error(`Erro da API da Gate.io: O par '${pair}' é inválido ou não foi encontrado.`);
    }

    if (!response.ok) {
        const errorMsg = 'message' in data ? (data as GateioErrorResponse).message : `Status ${response.status}`;
        throw new Error(`Erro da API da Gate.io: ${errorMsg}`);
    }
    
    if (!Array.isArray(data) || data.length === 0) {
        throw new Error(`Nenhum dado de ticker encontrado para o par ${pair} na Gate.io.`);
    }

    return data[0];

  } catch (error) {
    console.error(`Falha ao buscar o preço da Gate.io para ${pair}:`, error);
     if (error instanceof Error) {
        throw error;
    }
    throw new Error(
      'Não foi possível conectar à API da Gate.io. Verifique a conexão de rede.'
    );
  }
}
