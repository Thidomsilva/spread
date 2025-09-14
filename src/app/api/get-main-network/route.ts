import { NextRequest, NextResponse } from "next/server";
import { getMainNetwork } from "@/services/get-main-network";

export async function POST(req: NextRequest) {
  try {
    const { exchange, asset } = await req.json();
    if (!exchange || !asset) {
      return NextResponse.json({ error: "Exchange e asset são obrigatórios." }, { status: 400 });
    }
    const mainNetwork = await getMainNetwork(exchange, asset);
    return NextResponse.json({ mainNetwork });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erro desconhecido." }, { status: 500 });
  }
}
