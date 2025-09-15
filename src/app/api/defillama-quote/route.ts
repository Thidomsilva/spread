import { NextRequest, NextResponse } from "next/server";

// Exemplo de uso: /api/defillama-quote?chain=polygon&from=USDT&to=DAI&amount=100
export async function GET(req: NextRequest) {
  const search = req.nextUrl.searchParams;
  const chain = search.get("chain") || "polygon";
  const from = search.get("from") || "USDT";
  const to = search.get("to") || "DAI";
  const amount = search.get("amount") || "100";

  const url = `https://api.llama.fi/quote/${chain}/${from}/${to}?amount=${amount}`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erro desconhecido." }, { status: 500 });
  }
}
