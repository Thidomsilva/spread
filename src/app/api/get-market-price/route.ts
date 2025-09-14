import { NextRequest, NextResponse } from 'next/server';
import { getMexcPrice } from '@/services/mexc-service';
import { getBitmartPrice } from '@/services/bitmart-service';
import { getGateioPrice } from '@/services/gateio-service';
import { getPoloniexPrice } from '@/services/poloniex-service';

export async function POST(req: NextRequest) {
  try {
    const { exchange, asset, counterpart = 'USDT' } = await req.json();
    if (!exchange || !asset) {
      return NextResponse.json({ error: 'Exchange e asset são obrigatórios.' }, { status: 400 });
    }
    const cleanAsset = asset.toUpperCase().split('/')[0].trim();
    const cleanCounterpart = counterpart.toUpperCase().trim();
    let price = 0;
    switch (exchange) {
      case 'MEXC': {
        const pair = `${cleanAsset}${cleanCounterpart}`;
        const resp = await getMexcPrice(pair);
        price = parseFloat(resp.price);
        break;
      }
      case 'Bitmart': {
        const pair = `${cleanAsset}_${cleanCounterpart}`;
        const resp = await getBitmartPrice(pair);
        price = parseFloat(resp.last_price);
        break;
      }
      case 'Gate.io': {
        const pair = `${cleanAsset}_${cleanCounterpart}`;
        const resp = await getGateioPrice(pair);
        price = parseFloat(resp.last);
        break;
      }
      case 'Poloniex': {
        const pair = `${cleanAsset}_${cleanCounterpart}`;
        const resp = await getPoloniexPrice(pair);
        price = parseFloat(resp.price);
        break;
      }
      default:
        return NextResponse.json({ error: `Exchange desconhecida: ${exchange}` }, { status: 400 });
    }
    if (isNaN(price) || price <= 0) {
      return NextResponse.json({ error: `Preço inválido recebido da exchange ${exchange}.` }, { status: 500 });
    }
    return NextResponse.json({ price });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro ao processar requisição.' }, { status: 500 });
  }
}
