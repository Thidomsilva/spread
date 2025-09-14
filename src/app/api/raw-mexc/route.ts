import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const url = 'https://api.mexc.com/api/v3/capital/config/getall';
  try {
    const response = await fetch(url);
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erro desconhecido." }, { status: 500 });
  }
}
