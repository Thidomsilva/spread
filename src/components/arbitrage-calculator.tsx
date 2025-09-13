"use client";

import { useState, useMemo, useEffect, useTransition, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCcw, TestTube, ArrowRight, Eraser, Sparkles, Search } from "lucide-react";
import { liveParityComparison, LiveParityComparisonInput } from "@/ai/flows/live-parity-comparison";
import { getMarketPrice, GetMarketPriceInput } from "@/ai/flows/get-market-price";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type DiagnosisStatus = 'positive' | 'negative' | 'neutral';
type CalculatorMode = 'simple' | 'triangulation';

const EXCHANGES = ["MEXC", "Bitmart", "Gate.io"];

export default function ArbitrageCalculator() {
  const [mode, setMode] = useState<CalculatorMode>('simple');
  const [isPending, startTransition] = useTransition();
  const [isFetchingRealPrice, startRealPriceTransition] = useTransition();
  const { toast } = useToast();

  // Simple Spread States
  const [priceA, setPriceA] = useState("");
  const [priceB, setPriceB] = useState("");
  const [baseAmount, setBaseAmount] = useState("100");
  const [tradeFee, setTradeFee] = useState("0");

  // Triangulation States
  const [triPriceA, setTriPriceA] = useState("");
  const [triPriceB, setTriPriceB] = useState("");
  const [initialUSDT, setInitialUSDT] = useState("100");
  const [tradeFeeA, setTradeFeeA] = useState("0");
  const [tradeFeeB, setTradeFeeB] = useState("0");
  const [exchangeA, setExchangeA] = useState(EXCHANGES[0]);
  const [exchangeB, setExchangeB] = useState(EXCHANGES[0]);


  // AI State
  const [assetA, setAssetA] = useState("JASMY");
  const [assetB, setAssetB] = useState("PEPE");

  const formatNumber = (num: number, minDigits = 2, maxDigits = 4) => {
    if (isNaN(num)) return '0';
    return num.toLocaleString('en-US', {
      minimumFractionDigits: minDigits,
      maximumFractionDigits: maxDigits,
    });
  };

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

  const triResults = useMemo(() => {
    const pA = parseFloat(triPriceA);
    const pB = parseFloat(triPriceB);
    const usdtInitial = parseFloat(initialUSDT);
    const feeA = parseFloat(tradeFeeA) / 100;
    const feeB = parseFloat(tradeFeeB) / 100;

    if (isNaN(pA) || isNaN(pB) || pA <= 0 || pB <= 0 || isNaN(usdtInitial)) {
      return null;
    }
    
    // Fator de conversão calculado dinamicamente
    const factor = pA / pB;

    const A_bruto = usdtInitial / pA;
    const A_pos_compra = A_bruto * (1 - feeA);
    const B_recebido = A_pos_compra / factor; // A -> B via conversão implicita USDT
    const USDT_final_bruto = B_recebido * pB;
    const USDT_final_liquido = USDT_final_bruto * (1 - feeB);
    const spread = usdtInitial > 0 ? ((USDT_final_liquido / usdtInitial) - 1) * 100 : 0;
    
    let diagnosis: DiagnosisStatus;
    if (spread > 0.1) diagnosis = 'positive';
    else if (spread < -0.1) diagnosis = 'negative';
    else diagnosis = 'neutral';
    
    const A_equivalente = pB * (1/factor);
    const delta_relativo = pA > 0 ? ((A_equivalente / pA) - 1) * 100 : 0;
    const preco_B_break_even = factor > 0 ? pA * factor : 0;


    return {
      A_bruto,
      A_pos_compra,
      B_recebido,
      USDT_final_liquido,
      spread,
      diagnosis,
      A_equivalente,
      delta_relativo,
      preco_B_break_even,
      calculatedFactor: factor,
    };
  }, [triPriceA, triPriceB, initialUSDT, tradeFeeA, tradeFeeB]);

  const handleExample = () => {
    if (mode === 'simple') {
      setPriceA("0.00670");
      setPriceB("0.00690");
      setBaseAmount("100");
      setTradeFee("0");
    } else {
      setAssetA("JASMY");
      setAssetB("PEPE");
      setTriPriceA("0.0315");
      setTriPriceB("0.0000118");
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
      setAssetA("JASMY");
      setAssetB("PEPE");
      setTriPriceA("");
      setTriPriceB("");
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

  const handleAiAnalysis = () => {
    startTransition(async () => {
        const input: LiveParityComparisonInput = { assetA, assetB };
        try {
            const result = await liveParityComparison(input);
            if (result) {
              setTriPriceA(result.priceA.toString());
              setTriPriceB(result.priceB.toString());
              toast({
                title: "Análise de IA Concluída",
                description: "Os preços simulados foram preenchidos.",
              })
            } else {
               toast({
                variant: "destructive",
                title: "Análise de IA Falhou",
                description: "A IA não retornou um resultado. Tente novamente.",
              })
            }
        } catch (error) {
            console.error("AI analysis failed:", error);
            toast({
              variant: "destructive",
              title: "Análise de IA Falhou",
              description: "Não foi possível obter os dados. Verifique sua chave de API ou tente novamente.",
            })
        }
    });
  };

  const handleFetchRealPrices = useCallback(() => {
    startRealPriceTransition(async () => {
      try {
        const inputA: GetMarketPriceInput = { 
          exchange: exchangeA as any, 
          asset: assetA,
        };
        const priceA = await getMarketPrice(inputA);
        setTriPriceA(priceA.toString());
        
        const inputB: GetMarketPriceInput = { 
          exchange: exchangeB as any, 
          asset: assetB,
        };
        const priceB = await getMarketPrice(inputB);
        setTriPriceB(priceB.toString());

        toast({
            title: "Preços Reais Obtidos",
            description: `Preços de ${assetA} e ${assetB} atualizados.`,
        });

      } catch (error) {
        console.error("Real price fetching failed:", error);
        toast({
          variant: "destructive",
          title: "Falha ao Buscar Preços",
          description: error instanceof Error ? error.message : "Ocorreu um erro desconhecido.",
        })
      }
    });
  }, [assetA, assetB, exchangeA, exchangeB, toast]);

  useEffect(() => {
    handleReset();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const diagnosisStyles = {
    positive: { text: "✅ Arbitragem Positiva", color: "text-success" },
    negative: { text: "❌ Arbitragem Negativa", color: "text-destructive" },
    neutral: { text: "⚠️ Neutro", color: "text-muted-foreground" },
  };
  
  const isAnyLoading = isPending || isFetchingRealPrice;

  return (
    <Card className="w-full max-w-lg bg-card/50 backdrop-blur-sm">
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
              <div className="bg-background/30 p-3 rounded-md border border-border/20 space-y-3">
                   <div className="flex items-center justify-between">
                     <Label className="text-xs text-muted-foreground">Ativos para Análise</Label>
                      <div className="flex gap-2">
                        <Button onClick={handleAiAnalysis} disabled={isAnyLoading} size="sm" variant="outline" className="h-7 text-xs">
                            <Sparkles className={isPending ? 'animate-spin' : ''}/>
                            Análise IA
                        </Button>
                         <Button onClick={handleFetchRealPrices} disabled={isAnyLoading} size="sm" variant="outline" className="h-7 text-xs">
                            <Search className={isFetchingRealPrice ? 'animate-spin' : ''}/>
                            Buscar Preços
                        </Button>
                      </div>
                   </div>
                   <div className="flex items-center gap-2">
                      <Input id="asset-a" placeholder="Ativo A" value={assetA} onChange={e => setAssetA(e.target.value.toUpperCase())} className="text-center"/>
                      <ArrowRight className="w-4 h-4 text-muted-foreground/50 shrink-0"/>
                      <Input id="asset-b" placeholder="Ativo B" value={assetB} onChange={e => setAssetB(e.target.value.toUpperCase())} className="text-center"/>
                   </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                      <Label>Comprar A em</Label>
                      <Select value={exchangeA} onValueChange={setExchangeA} disabled={isAnyLoading}>
                          <SelectTrigger>
                              <SelectValue placeholder="Selecione a Exchange" />
                          </SelectTrigger>
                          <SelectContent>
                              {EXCHANGES.map(ex => <SelectItem key={ex} value={ex}>{ex}</SelectItem>)}
                          </SelectContent>
                      </Select>
                  </div>
                  <div className="grid gap-2">
                      <Label>Vender B em</Label>
                      <Select value={exchangeB} onValueChange={setExchangeB} disabled={isAnyLoading}>
                          <SelectTrigger>
                              <SelectValue placeholder="Selecione a Exchange" />
                          </SelectTrigger>
                          <SelectContent>
                              {EXCHANGES.map(ex => <SelectItem key={ex} value={ex}>{ex}</SelectItem>)}
                          </SelectContent>
                      </Select>
                  </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="tri-price-a">Preço A/USDT</Label>
                  <Input id="tri-price-a" type="number" placeholder="0.0067" value={triPriceA} onChange={e => setTriPriceA(e.target.value)} disabled={isAnyLoading} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="tri-price-b">Preço B/USDT</Label>
                  <Input id="tri-price-b" type="number" placeholder="0.4920" value={triPriceB} onChange={e => setTriPriceB(e.target.value)} disabled={isAnyLoading} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="initial-usdt">USDT Inicial</Label>
                  <Input id="initial-usdt" type="number" value={initialUSDT} onChange={e => setInitialUSDT(e.target.value)} disabled={isAnyLoading} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="trade-fee-a">Taxa Compra A (%)</Label>
                  <Input id="trade-fee-a" type="number" value={tradeFeeA} onChange={e => setTradeFeeA(e.target.value)} disabled={isAnyLoading} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="trade-fee-b">Taxa Venda B (%)</Label>
                  <Input id="trade-fee-b" type="number" value={tradeFeeB} onChange={e => setTradeFeeB(e.target.value)} disabled={isAnyLoading} />
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
                        <div className="flex justify-between"><span>A (pós-taxa):</span> <span>{formatNumber(triResults.A_pos_compra, 4)}</span></div>
                        <div className="flex justify-between"><span>B (recebido):</span> <span>{formatNumber(triResults.B_recebido, 4)}</span></div>
                    </div>

                     <div className="space-y-2 text-xs text-muted-foreground bg-background/50 p-3 rounded-md border border-border/20">
                        <h4 className="font-bold text-foreground text-sm pb-1">Análise de Paridade</h4>
                         <div className="flex justify-between"><span>Fator A→B (calculado):</span> <span>{formatNumber(triResults.calculatedFactor, 2, 8)}</span></div>
                         <div className="flex justify-between"><span>Delta Relativo:</span> <span className={triResults.delta_relativo > 0 ? 'text-success' : 'text-destructive'}>{formatNumber(triResults.delta_relativo, 2, 2)}%</span></div>
                         <div className="flex justify-between"><span>Preço B (break-even):</span> <span>${formatNumber(triResults.preco_B_break_even, 2, 8)}</span></div>
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
          <Button onClick={handleExample} variant="outline" className="w-full" disabled={isAnyLoading}><TestTube /> Exemplo</Button>
          <Button onClick={handleClearFees} variant="outline" className="w-full" disabled={isAnyLoading}><Eraser/> Zerar Taxas</Button>
          <Button onClick={handleReset} variant="ghost" className="w-full" disabled={isAnyLoading}><RefreshCcw /> Reset</Button>
        </div>
      </CardContent>
    </Card>
  );
}
