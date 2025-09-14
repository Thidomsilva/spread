import { NextRequest, NextResponse } from 'next/server';
import { networkAnalysis as networkAnalysisFn } from '@/ai/flows/network-analysis';

export async function POST(req: NextRequest) {
  try {
    const input = await req.json();
    const result = await networkAnalysisFn(input);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro ao processar requisição.' }, { status: 500 });
  }
}
