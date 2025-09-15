import { NextRequest, NextResponse } from "next/server";

// Exemplo de uso: /api/oneinch-quote?chainId=1&from=0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee&to=0xdac17f958d2ee523a2206206994597c13d831ec7&amount=1000000000000000000
// chainId: 1 (Ethereum), 56 (BSC), 137 (Polygon), etc.
// from/to: endereço do token (ETH = 0xeeee...)
// amount: em unidades do token (ex: 1 ETH = 1e18)

export async function GET(req: NextRequest) {
  const search = req.nextUrl.searchParams;
  const chainId = search.get("chainId") || "1";
  const from = search.get("from") || "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"; // ETH
  const to = search.get("to") || "0xdac17f958d2ee523a2206206994597c13d831ec7"; // USDT
  const amount = search.get("amount") || "1000000000000000000"; // 1 ETH

  const url = `https://api.1inch.dev/swap/v5.2/${chainId}/quote?src=${from}&dst=${to}&amount=${amount}`;
  try {
    const response = await fetch(url, {
      headers: {
        // A maioria dos endpoints de quote da 1inch não exige API key para consulta, mas pode ser necessário adicionar se solicitado.
        // 'Authorization': `Bearer ${process.env.ONEINCH_API_KEY}`
      }
    });
    if (!response.ok) {
      return NextResponse.json({ error: `Erro ${response.status}: ${response.statusText}` }, { status: response.status });
    }
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erro desconhecido." }, { status: 500 });
  }
}
