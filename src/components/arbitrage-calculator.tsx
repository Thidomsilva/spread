"use client";

import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCcw, TestTube2, ArrowRight, Eraser, AlertTriangle } from "lucide-react";

type DiagnosisStatus = 'positive' | 'negative' | 'neutral';
type CalculatorMode = 'simple' | 'triangulation';

export default function ArbitrageCalculator() {
  const [mode, setMode] = useState<CalculatorMode>('simple');

  // Simple Spread States
  const [priceA, setPriceA] = useState("");
  const [priceB, setPriceB] = useState("");
  const [baseAmount, setBaseAmount] = useState("100");
  const [tradeFee, setTradeFee] = useState("0");

  // Triangulation States
  const [triPriceA, setTriPriceA] = useState(""); // Compra
  const [triPriceB, setTriPriceB] = useState(""); // Venda
  const [factorAB, setFactorAB] = useState("0.0133");
  const [initialUSDT, setInitialUSDT] = useState("100");
  const [tradeFeeA, setTradeFeeA] = useState("0");
  const [tradeFeeB, setTradeFeeB] = useState("0");

  const formatNumber = (num: number, minDigits = 2, maxDigits = 4) => {
    if (isNaN(num)) return '0';
    return num.toLocaleString('en-US', {
      minimumFractionDigits: minDigits,
      maximumFractionDigits: maxDigits,
    });
  };

  // Simple Spread Calculations
  const simpleResults = useMemo(() => {
    const pA = parseFloat(priceA);
    const pB = parseFloat(priceB);
    const amount = parseFloat(baseAmount) || 0;
    const fee = parseFloat(tradeFee) / 100;

    if (isNaN(pA) || isNaN(pB) || pA <= 0 || pB <= 0) {
      return null;
    }

    const absoluteDifference = pB - pA;
    const spreadPercentage = (absoluteDifference / pA) * 100;
    const netSpreadPercentage = spreadPercentage - (fee * 2 * 100);
    const estimatedProfit = amount * (netSpreadPercentage / 100);

    let diagnosis: DiagnosisStatus;
    if (netSpreadPercentage > 0.1) diagnosis = 'positive';
    else if (netSpreadPercentage < -0.1) diagnosis = 'negative';
    else diagnosis = 'neutral';

    return { absoluteDifference, spreadPercentage, netSpreadPercentage, estimatedProfit, diagnosis };
  }, [priceA, priceB, baseAmount, tradeFee]);

  // Triangulation Calculations
  const triResults = useMemo(() => {
    const pA = parseFloat(triPriceA);
    const pB = parseFloat(triPriceB);
    const factor = parseFloat(factorAB);
    const usdtInitial = parseFloat(initialUSDT);
    const feeA = parseFloat(tradeFeeA) / 100;
    const feeB = parseFloat(tradeFeeB) / 100;

    if (isNaN(pA) || isNaN(pB) || isNaN(factor) || isNaN(usdtInitial) || pA <= 0) {
      return null;
    }

    const A_bruto = usdtInitial / pA;
    const A_pos_compra = A_bruto * (1 - feeA);
    const B_recebido = A_pos_compra * factor;
    const USDT_final_bruto = B_recebido * pB;
    const USDT_final_liquido = USDT_final_bruto * (1 - feeB);
    const spread = usdtInitial > 0 ? ((USDT_final_liquido / usdtInitial) - 1) * 100 : 0;
    
    let diagnosis: DiagnosisStatus;
    if (spread > 0.1) diagnosis = 'positive';
    else if (spread < -0.1) diagnosis = 'negative';
    else diagnosis = 'neutral';
    
    // Parity calculations
    const A_equivalente = pB * factor;
    const delta_relativo = pA > 0 ? ((A_equivalente / pA) - 1) * 100 : 0;
    const preco_B_break_even = factor > 0 ? pA / factor : 0;

    return {
      A_bruto,
      A_pos_compra,
      B_recebido,
      USDT_final_liquido,
      spread,
      diagnosis,
      A_equivalente,
      delta_relativo,
      preco_B_break_even
    };
  }, [triPriceA, triPriceB, factorAB, initialUSDT, tradeFeeA, tradeFeeB]);

  const handleExample = () => {
    if (mode === 'simple') {
      setPriceA("0.00670");
      setPriceB("0.00690");
      setBaseAmount("100");
      setTradeFee("0");
    } else {
      setTriPriceA("0.0067035");
      setTriPriceB("0.4920");
      setFactorAB("0.0133");
      setInitialUSDT("250");
      setTradeFeeA("0");
      setTradeFeeB("0");
    }
  };
  
  const handleReset = () => {
    if (mode === 'simple') {
      setPriceA("");
      setPriceB("");
      setBaseAmount("100");
      setTradeFee("0");
    } else {
      setTriPriceA("");
      setTriPriceB("");
      setFactorAB("0.0133");
      setInitialUSDT("100");
      setTradeFeeA("0");
      setTradeFeeB("0");
    }
  };

  const handleClearFees = () => {
      setTradeFee("0");
      setTradeFeeA("0");
      setTradeFeeB("0");
  };

  useEffect(() => {
    handleReset();
  }, [mode]);

  const diagnosisStyles = {
    positive: { text: "✅ Arbitragem Positiva", color: "text-success" },
    negative: { text: "❌ Arbitragem Negativa", color: "text-destructive" },
    neutral: { text: "⚠️ Neutro", color: "text-muted-foreground" },
  };

  return (
    <main className="w-full max-w-lg">
      <Card className="bg-card/50 backdrop-blur-sm">
        <CardContent className="p-6">
          <Tabs value={mode} onValueChange={(value) => setMode(value as CalculatorMode)} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="simple">Spread Simples</TabsTrigger>
              <TabsTrigger value="triangulation">Triangulação</TabsTrigger>
            </TabsList>
            
            <TabsContent value="simple">
              <div className="grid grid-cols-1 gap-4 mt-4">
                <div className="grid grid-cols-2 items-end gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="price-a">Preço Exchange A</Label>
                    <Input id="price-a" type="number" placeholder="0.00670" value={priceA} onChange={e => setPriceA(e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="price-b">Preço Exchange B</Label>
                    <Input id="price-b" type="number" placeholder="0.00690" value={priceB} onChange={e => setPriceB(e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="base-amount">Valor Base (USDT)</Label>
                    <Input id="base-amount" type="number" value={baseAmount} onChange={e => setBaseAmount(e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="trade-fee">Taxa de Trade (%)</Label>
                    <Input id="trade-fee" type="number" value={tradeFee} onChange={e => setTradeFee(e.target.value)} />
                  </div>
                </div>

                <div className="border-t border-border/50 pt-4 mt-2 space-y-4">
                  {simpleResults ? (
                    <>
                      <div className="text-center">
                        <p className={`text-lg font-bold ${diagnosisStyles[simpleResults.diagnosis].color}`}>
                          {diagnosisStyles[simpleResults.diagnosis].text}
                        </p>
                      </div>
                      <div className="flex justify-between items-center text-center">
                        <div>
                          <p className="text-xs text-muted-foreground">Spread Líquido</p>
                          <p className={`text-2xl font-bold ${diagnosisStyles[simpleResults.diagnosis].color}`}>
                            {formatNumber(simpleResults.netSpreadPercentage, 2, 2)}%
                          </p>
                        </div>
                        <ArrowRight className="w-6 h-6 text-muted-foreground/50" />
                        <div>
                          <p className="text-xs text-muted-foreground">Lucro Estimado</p>
                          <p className={`text-2xl font-bold ${diagnosisStyles[simpleResults.diagnosis].color}`}>
                            ${formatNumber(simpleResults.estimatedProfit, 2, 2)}
                          </p>
                        </div>
                      </div>
                      <p className="text-center text-xs text-muted-foreground pt-2">
                        Diferença Absoluta: ${formatNumber(simpleResults.absoluteDifference, 2, 5)}
                      </p>
                    </>
                  ) : (
                    <div className="text-center text-muted-foreground py-8">Aguardando preços válidos...</div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="triangulation">
              <div className="grid grid-cols-1 gap-4 mt-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="tri-price-a">Preço A/USDT</Label>
                    <Input id="tri-price-a" type="number" placeholder="0.0067" value={triPriceA} onChange={e => setTriPriceA(e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="tri-price-b">Preço B/USDT</Label>
                    <Input id="tri-price-b" type="number" placeholder="0.4920" value={triPriceB} onChange={e => setTriPriceB(e.target.value)} />
                  </div>
                   <div className="grid gap-2">
                    <Label htmlFor="factor-ab">Fator A→B</Label>
                    <Input id="factor-ab" type="number" value={factorAB} onChange={e => setFactorAB(e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="initial-usdt">USDT Inicial</Label>
                    <Input id="initial-usdt" type="number" value={initialUSDT} onChange={e => setInitialUSDT(e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="trade-fee-a">Taxa Compra A (%)</Label>
                    <Input id="trade-fee-a" type="number" value={tradeFeeA} onChange={e => setTradeFeeA(e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="trade-fee-b">Taxa Venda B (%)</Label>
                    <Input id="trade-fee-b" type="number" value={tradeFeeB} onChange={e => setTradeFeeB(e.target.value)} />
                  </div>
                </div>

                <div className="border-t border-border/50 pt-4 mt-2 space-y-4">
                  {triResults ? (
                    <>
                      <div className="text-center">
                          <p className="text-xs text-muted-foreground">Spread Líquido</p>
                        <p className={`text-3xl font-bold ${diagnosisStyles[triResults.diagnosis].color}`}>
                            {formatNumber(triResults.spread, 2, 2)}%
                        </p>
                      </div>
                        <div className="flex justify-center items-baseline text-center gap-2">
                          <p className="text-lg text-muted-foreground">${formatNumber(parseFloat(initialUSDT),2,2)}</p>
                          <ArrowRight className="w-5 h-5 text-muted-foreground/50" />
                          <p className={`text-lg font-bold ${diagnosisStyles[triResults.diagnosis].color}`}>
                              ${formatNumber(triResults.USDT_final_liquido, 2, 2)}
                          </p>
                        </div>
                      
                      <div className="space-y-2 text-xs text-muted-foreground bg-background/50 p-3 rounded-md border border-border/20">
                          <h4 className="font-bold text-foreground text-sm pb-1">Detalhes da Operação</h4>
                          <div className="flex justify-between"><span>A (bruto):</span> <span>{formatNumber(triResults.A_bruto, 4)}</span></div>
                          <div className="flex justify-between"><span>A (pós-swap fee):</span> <span>{formatNumber(triResults.A_pos_compra, 4)}</span></div>
                          <div className="flex justify-between"><span>B (recebido):</span> <span>{formatNumber(triResults.B_recebido, 4)}</span></div>
                      </div>

                       <div className="space-y-2 text-xs text-muted-foreground bg-background/50 p-3 rounded-md border border-border/20">
                          <h4 className="font-bold text-foreground text-sm pb-1">Análise de Paridade</h4>
                           <div className="flex justify-between"><span>Preço A Equivalente (via B):</span> <span>${formatNumber(triResults.A_equivalente, 2, 5)}</span></div>
                           <div className="flex justify-between"><span>Delta Relativo:</span> <span className={triResults.delta_relativo > 0 ? 'text-success' : 'text-destructive'}>{formatNumber(triResults.delta_relativo, 2, 2)}%</span></div>
                           <div className="flex justify-between"><span>Preço B (break-even):</span> <span>${formatNumber(triResults.preco_B_break_even, 2, 4)}</span></div>
                       </div>
                    </>
                  ) : (
                     <div className="text-center text-muted-foreground py-8">Aguardando dados...</div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex gap-2 pt-4 border-t border-border/50 mt-4">
            <Button onClick={handleExample} variant="outline" className="w-full"><TestTube2 /> Exemplo</Button>
            <Button onClick={handleClearFees} variant="outline" className="w-full"><Eraser/> Zerar Taxas</Button>
            <Button onClick={handleReset} variant="ghost" className="w-full"><RefreshCcw /> Reset</Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
