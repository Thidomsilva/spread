"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, HelpCircle, RefreshCcw, TestTube2, X, Loader2, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

import { calculateParity, CalculateParityOutput } from "@/ai/flows/live-parity-comparison";

const FIXED_XPR_FEE = 200;
const VIABILITY_THRESHOLD = 0.10;

type ViabilityStatus = 'Viável' | 'Neutro' | 'Não viável' | 'Aguardando';

export default function SpreadCalculator() {
  const [xprUsdtPrice, setXprUsdtPrice] = useState("");
  const [vaultaUsdtPrice, setVaultaUsdtPrice] = useState("");
  const [xprToVaultaFactor, setXprToVaultaFactor] = useState("0.0133");
  const [initialUsdt, setInitialUsdt] = useState("100");
  const [buyFee, setBuyFee] = useState("0");
  const [sellFee, setSellFee] = useState("0");

  const [parityResult, setParityResult] = useState<CalculateParityOutput | null>(null);
  const [isParityLoading, setIsParityLoading] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    const savedFactor = localStorage.getItem("xprToVaultaFactor");
    const savedBuyFee = localStorage.getItem("buyFee");
    const savedSellFee = localStorage.getItem("sellFee");
    const savedInitialUsdt = localStorage.getItem("initialUsdt");

    if (savedFactor) setXprToVaultaFactor(savedFactor);
    if (savedBuyFee) setBuyFee(savedBuyFee);
    if (savedSellFee) setSellFee(savedSellFee);
    if (savedInitialUsdt) setInitialUsdt(savedInitialUsdt);
    
    handleExample();
  }, []);

  useEffect(() => { localStorage.setItem("xprToVaultaFactor", xprToVaultaFactor); }, [xprToVaultaFactor]);
  useEffect(() => { localStorage.setItem("buyFee", buyFee); }, [buyFee]);
  useEffect(() => { localStorage.setItem("sellFee", sellFee); }, [sellFee]);
  useEffect(() => { localStorage.setItem("initialUsdt", initialUsdt); }, [initialUsdt]);

  const handleReset = () => {
    setXprToVaultaFactor("0.0133");
    setInitialUsdt("100");
    setBuyFee("0");
    setSellFee("0");
  };

  const handleZeroFees = () => {
    setBuyFee("0");
    setSellFee("0");
  };

  const handleExample = () => {
    setXprUsdtPrice("0.0067035");
    setVaultaUsdtPrice("0.4920");
    setXprToVaultaFactor("0.0133");
    setInitialUsdt("100");
    setBuyFee("0");
    setSellFee("0");
  };
  
  const formatNumber = (num: number, options: Intl.NumberFormatOptions = {}) => {
    const defaultOptions: Intl.NumberFormatOptions = {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    };
    return num.toLocaleString('en-US', { ...defaultOptions, ...options });
  };

  const calculations = useMemo(() => {
    const pXprUsdt = parseFloat(xprUsdtPrice);
    const pVaultaUsdt = parseFloat(vaultaUsdtPrice);
    const pFactor = parseFloat(xprToVaultaFactor);
    const pInitialUsdt = parseFloat(initialUsdt) || 100;
    const pBuyFee = parseFloat(buyFee) / 100;
    const pSellFee = parseFloat(sellFee) / 100;

    if (isNaN(pXprUsdt) || isNaN(pVaultaUsdt) || isNaN(pFactor) || pXprUsdt <= 0 || pVaultaUsdt <= 0 || pFactor <= 0) {
      return { error: "Aguardando dados válidos.", viability: "Aguardando" as ViabilityStatus };
    }

    const xprBruto = pInitialUsdt / pXprUsdt;
    const xprPosCompra = xprBruto * (1 - pBuyFee);
    const xprLiquidoParaSwap = xprPosCompra - FIXED_XPR_FEE;

    if (xprLiquidoParaSwap < 0) {
      return { error: `XPR insuficiente após taxa fixa de ${FIXED_XPR_FEE} XPR.`, viability: "Não viável" as ViabilityStatus, xprBruto, xprPosCompra, xprLiquidoParaSwap };
    }

    const vaultaRecebido = xprLiquidoParaSwap * pFactor;
    const usdtFinalBruto = vaultaRecebido * pVaultaUsdt;
    const usdtFinalLiquido = usdtFinalBruto * (1 - pSellFee);
    const spreadPercentage = ((usdtFinalLiquido - pInitialUsdt) / pInitialUsdt) * 100;

    let viability: ViabilityStatus;
    if (spreadPercentage > VIABILITY_THRESHOLD) viability = "Viável";
    else if (spreadPercentage < -VIABILITY_THRESHOLD) viability = "Não viável";
    else viability = "Neutro";

    return {
      pInitialUsdt,
      xprBruto,
      xprPosCompra,
      xprLiquidoParaSwap,
      vaultaRecebido,
      usdtFinalLiquido,
      spreadPercentage,
      viability,
      error: null,
    };
  }, [xprUsdtPrice, vaultaUsdtPrice, xprToVaultaFactor, initialUsdt, buyFee, sellFee]);

  useEffect(() => {
    const pXprUsdt = parseFloat(xprUsdtPrice);
    const pVaultaUsdt = parseFloat(vaultaUsdtPrice);
    const pFactor = parseFloat(xprToVaultaFactor);

    if (isNaN(pXprUsdt) || isNaN(pVaultaUsdt) || isNaN(pFactor) || pXprUsdt <= 0 || pVaultaUsdt <= 0 || pFactor <= 0) {
        setParityResult(null);
        return;
    }

    const handler = setTimeout(async () => {
      setIsParityLoading(true);
      try {
        const result = await calculateParity({
          vaultaUsdtPrice: pVaultaUsdt,
          xprVaultaFactor: pFactor,
          xprUsdtPrice: pXprUsdt,
        });
        setParityResult(result);
      } catch (error) {
        console.error("Parity calculation failed:", error);
        toast({
          variant: "destructive",
          title: "Erro de Paridade",
          description: "Não foi possível calcular a paridade da rede.",
        });
      } finally {
        setIsParityLoading(false);
      }
    }, 500);

    return () => clearTimeout(handler);
  }, [xprUsdtPrice, vaultaUsdtPrice, xprToVaultaFactor, toast]);

  const ViabilityStatusDisplay = () => {
    if (!calculations || calculations.viability === 'Aguardando') {
      return <CardTitle className="text-2xl text-muted-foreground">Aguardando dados</CardTitle>;
    }
  
    const { viability, spreadPercentage } = calculations;
    
    if (viability === 'Viável') return <CardTitle className="text-3xl font-bold text-green-500">✅ Viável ({formatNumber(spreadPercentage, {maximumFractionDigits: 2})}%)</CardTitle>;
    if (viability === 'Neutro') return <CardTitle className="text-3xl font-bold text-amber-500">⚠️ Neutro ({formatNumber(spreadPercentage, {maximumFractionDigits: 2})}%)</CardTitle>;
    return <CardTitle className="text-3xl font-bold text-red-500">❌ Não viável ({formatNumber(spreadPercentage, {maximumFractionDigits: 2})}%)</CardTitle>;
  };
  
  return (
    <TooltipProvider>
      <div className="container mx-auto p-4 md:p-8">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold tracking-tight font-headline">Calculadora de Spread – Triangulação</h1>
          <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">Calcule a viabilidade da rota USDT → XPR → VAULTA → USDT, considerando taxas e o swap de rede.</p>
        </header>

        <div className="grid md:grid-cols-5 gap-8">
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Entradas</CardTitle>
                <CardDescription>Insira os valores para calcular o spread.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="initial-usdt">USDT Inicial</Label>
                  <Input id="initial-usdt" type="number" placeholder="100" value={initialUsdt} onChange={(e) => setInitialUsdt(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="xpr-usdt">Preço XPR/USDT (compra)</Label>
                  <Input id="xpr-usdt" type="number" step="any" placeholder="0.00670" value={xprUsdtPrice} onChange={(e) => setXprUsdtPrice(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="vaulta-usdt">Preço VAULTA/USDT (venda)</Label>
                  <Input id="vaulta-usdt" type="number" step="any" placeholder="0.4920" value={vaultaUsdtPrice} onChange={(e) => setVaultaUsdtPrice(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="factor">Fator XPR→VAULTA</Label>
                    <Tooltip>
                      <TooltipTrigger asChild><HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" /></TooltipTrigger>
                      <TooltipContent><p>Estimativa do swap XPR→VAULTA; padrão 0,0133. Ajuste se observar variação.</p></TooltipContent>
                    </Tooltip>
                  </div>
                  <Input id="factor" type="number" step="any" placeholder="0.0133" value={xprToVaultaFactor} onChange={(e) => setXprToVaultaFactor(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="buy-fee">% Taxa Compra XPR</Label>
                    <Input id="buy-fee" type="number" step="any" placeholder="0.1" value={buyFee} onChange={(e) => setBuyFee(e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="sell-fee">% Taxa Venda VAULTA</Label>
                    <Input id="sell-fee" type="number" step="any" placeholder="0.1" value={sellFee} onChange={(e) => setSellFee(e.target.value)} />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex-col sm:flex-row gap-2">
                <Button onClick={handleExample} variant="outline" className="w-full sm:w-auto"><TestTube2 /> Exemplo</Button>
                <div className="flex gap-2 w-full sm:w-auto sm:ml-auto">
                    <Button onClick={handleZeroFees} variant="secondary" className="w-full sm:w-auto"><X /> Zerar Taxas</Button>
                    <Button onClick={handleReset} variant="ghost" className="w-full sm:w-auto"><RefreshCcw /> Reset</Button>
                </div>
              </CardFooter>
            </Card>
          </div>

          <div className="md:col-span-3 flex flex-col gap-8">
            <Card className="bg-card">
              <CardHeader>
                <ViabilityStatusDisplay />
                <CardDescription>
                  {calculations && calculations.pInitialUsdt && calculations.usdtFinalLiquido ? `${formatNumber(calculations.pInitialUsdt)} USDT → ${formatNumber(calculations.usdtFinalLiquido)} USDT` : "Resultado da operação"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {calculations.error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Erro no Cálculo</AlertTitle>
                    <AlertDescription>{calculations.error}</AlertDescription>
                  </Alert>
                )}
                {calculations && !calculations.error && calculations.xprBruto && (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span>XPR Comprado (bruto):</span> <strong>{formatNumber(calculations.xprBruto)}</strong></div>
                    <div className="flex justify-between"><span>XPR (pós-swap fee):</span> <strong>{formatNumber(calculations.xprLiquidoParaSwap!)}</strong></div>
                    <div className="flex justify-between"><span>VAULTA Recebido:</span> <strong>{formatNumber(calculations.vaultaRecebido!)}</strong></div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Comparação de Paridade</CardTitle>
                <CardDescription>Análise da paridade XPR vs VAULTA na rede.</CardDescription>
              </CardHeader>
              <CardContent>
                {isParityLoading && <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="animate-spin w-4 h-4"/>Calculando...</div>}
                {!isParityLoading && parityResult && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">XPR Preço Equivalente (via VAULTA):</span>
                      <strong className="text-base">${formatNumber(parityResult.xprEquivalenteUsdtViaRede, { minimumFractionDigits: 6 })}</strong>
                    </div>
                    <div className="flex justify-between items-center">
                       <span className="text-sm">Delta Relativo:</span>
                       <Badge variant={parityResult.deltaRelativoPercentage > 0 ? "default" : "destructive"} className={cn(parityResult.deltaRelativoPercentage > 0 && "bg-success text-success-foreground hover:bg-success/90")}>
                        {parityResult.deltaRelativoPercentage > 0 ? <ArrowUp className="mr-1 h-3 w-3" /> : <ArrowDown className="mr-1 h-3 w-3" />}
                        {formatNumber(parityResult.deltaRelativoPercentage, {maximumFractionDigits: 2})}%
                       </Badge>
                    </div>
                  </div>
                )}
                 {!isParityLoading && !parityResult && <div className="text-sm text-muted-foreground">Insira os preços para ver a análise.</div>}
              </CardContent>
            </Card>

            <Accordion type="single" collapsible>
              <AccordionItem value="item-1">
                <AccordionTrigger>Fórmulas Utilizadas</AccordionTrigger>
                <AccordionContent>
                  <pre className="text-xs p-4 bg-muted rounded-md overflow-x-auto font-code">
                    {`XPR_bruto = USDT_inicial / Preco_XPR_USDT
XPR_pos_compra = XPR_bruto * (1 - taxa_compra%)
XPR_líquido_para_swap = XPR_pos_compra - ${FIXED_XPR_FEE}
VAULTA_recebido = XPR_líquido_para_swap * Fator_XPR_VAULTA
USDT_final_bruto = VAULTA_recebido * Preco_VAULTA_USDT
USDT_final_líquido = USDT_final_bruto * (1 - taxa_venda%)
Spread_% = ((USDT_final_líquido - USDT_inicial) / USDT_inicial) * 100

// Parity Comparison
XPR_equivalente_USDT_via_rede = Preco_VAULTA_USDT * Fator_XPR_VAULTA
Delta_relativo_% = ((XPR_equiv - Preco_XPR_USDT) / Preco_XPR_USDT) * 100`}
                  </pre>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
