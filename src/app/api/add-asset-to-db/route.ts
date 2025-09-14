import { NextRequest, NextResponse } from 'next/server';
import { addAssetToDB as addAssetToDBFn } from '@/ai/flows/manage-assets-db';

export async function POST(req: NextRequest) {
  try {
  const input = await req.json();
  await addAssetToDBFn(input);
  return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro ao processar requisição.' }, { status: 500 });
  }
}
