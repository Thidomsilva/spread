import { NextRequest, NextResponse } from "next/server";
import { getMexcAssetNetworks } from "@/services/mexc-networks";

export async function GET(req: NextRequest) {
  const asset = req.nextUrl.searchParams.get("asset") || "BTC";
  try {
    const result = await getMexcAssetNetworks(asset);
    return NextResponse.json({ asset, ...result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erro desconhecido." }, { status: 500 });
  }
}
