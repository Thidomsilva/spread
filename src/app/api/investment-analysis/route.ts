import { NextRequest, NextResponse } from 'next/server';
import { investmentAnalysis as investmentAnalysisFn } from '@/ai/flows/investment-analysis';

export async function POST(req: NextRequest) {
  try {
    const input = await req.json();
    const result = await investmentAnalysisFn(input);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro ao processar requisição.' }, { status: 500 });
  }
}
