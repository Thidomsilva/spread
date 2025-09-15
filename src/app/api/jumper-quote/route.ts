import { NextRequest, NextResponse } from "next/server";

// Exemplo de uso: /api/jumper-quote?fromChain=1&toChain=1&fromToken=0xdAC17F958D2ee523a2206206994597C13D831ec7&toToken=0x6B175474E89094C44Da98b954EedeAC495271d0F&amount=1000000
// fromChain/toChain: id da chain (1 = Ethereum, 56 = BSC, etc)
// fromToken/toToken: endereço do token
// amount: em unidades do token (ex: USDT = 6 casas decimais, 1 USDT = 1000000)

export async function GET(req: NextRequest) {
  const search = req.nextUrl.searchParams;
  const fromChain = search.get("fromChain") || "1";
  const toChain = search.get("toChain") || "1";
  const fromToken = search.get("fromToken") || "0xdAC17F958D2ee523a2206206994597C13D831ec7";
  const toToken = search.get("toToken") || "0x6B175474E89094C44Da98b954EedeAC495271d0F";
  const amount = search.get("amount") || "1000000";

  // Jumper API pública (Li.Fi) - incluir integrator
  const url = `https://li.quest/v1/quote?fromChain=${fromChain}&toChain=${toChain}&fromToken=${fromToken}&toToken=${toToken}&fromAmount=${amount}&integrator=jumper.exchange`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return NextResponse.json({ error: `Erro ${response.status}: ${response.statusText}` }, { status: response.status });
    }
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erro desconhecido." }, { status: 500 });
  }
}
