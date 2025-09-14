import { NextRequest, NextResponse } from 'next/server';

const simulatedAssetDb: Record<string, string[]> = {
  MEXC: ['JASMY', 'PEPE', 'BTC', 'ETH', 'SOL', 'DOGE', 'SHIB', 'MATIC', 'AVAX', 'LINK'],
  Bitmart: ['JASMY', 'PEPE', 'BTC', 'ETH', 'SOL', 'DOGE', 'SHIB', 'TRX', 'LTC', 'XRP'],
  'Gate.io': ['JASMY', 'PEPE', 'BTC', 'ETH', 'SOL', 'ADA', 'DOT', 'XLM', 'BCH', 'FIL'],
  Poloniex: ['JASMY', 'PEPE', 'BTC', 'ETH', 'SOL', 'USDC', 'TRX', 'DOGE', 'SHIB', 'LTC'],
};

export async function POST(req: NextRequest) {
  try {
    const { exchange } = await req.json();
    if (!exchange || !simulatedAssetDb[exchange]) {
      return NextResponse.json({ error: 'Exchange inválida.' }, { status: 400 });
    }
    return NextResponse.json({ assets: simulatedAssetDb[exchange].sort() });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao processar requisição.' }, { status: 500 });
  }
}
