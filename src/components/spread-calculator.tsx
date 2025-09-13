"use client";

import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, HelpCircle, RefreshCcw, TestTube2, X, Loader2, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

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
    const finalOptions = { ...defaultOptions, ...options };

    if (finalOptions.minimumFractionDigits && finalOptions.maximumFractionDigits && finalOptions.minimumFractionDigits > finalOptions.maximumFractionDigits) {
        finalOptions.maximumFractionDigits = finalOptions.minimumFractionDigits;
    }
    
    return num.toLocaleString('en-US', finalOptions);
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
      return { error: `XPR insuficiente após taxa fixa de ${FIXED_XPR_FEE} XPR.`, viability: "Não viável" as ViabilityStatus, xprBruto, xprPosCompra, xprLiquidoParaSwap, pInitialUsdt: pInitialUsdt, usdtFinalLiquido: 0, spreadPercentage: -100, vaultaRecebido: 0 };
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
      <main className="container mx-auto p-4 md:p-8 flex-grow flex items-center justify-center">
        <div className="grid md:grid-cols-5 gap-8 w-full max-w-6xl">
          <div className="md:col-span-2">
            <Card>
              <CardContent className="grid gap-4 pt-6">
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
                 <div className="flex flex-col sm:flex-row gap-2 pt-4">
                    <Button onClick={handleExample} variant="outline" className="w-full sm:w-auto"><TestTube2 /> Exemplo</Button>
                    <div className="flex gap-2 w-full sm:w-auto sm:ml-auto">
                        <Button onClick={handleZeroFees} variant="secondary" className="w-full sm:w-auto"><X /> Zerar Taxas</Button>
                        <Button onClick={handleReset} variant="ghost" className="w-full sm:w-auto"><RefreshCcw /> Reset</Button>
                    </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="md:col-span-3 flex flex-col gap-8">
            <Card className="bg-card">
              <CardHeader>
                <ViabilityStatusDisplay />
              </CardHeader>
              <CardContent className="space-y-4">
                {calculations.error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Erro no Cálculo</AlertTitle>
                    <AlertDescription>{calculations.error}</AlertDescription>
                  </Alert>
                )}
                {calculations && !calculations.error && (
                  <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center">
                          <span>USDT Final:</span>
                          <strong className={cn(
                              "text-lg",
                              calculations.usdtFinalLiquido > calculations.pInitialUsdt ? "text-green-500" : "text-red-500"
                          )}>
                              ${formatNumber(calculations.usdtFinalLiquido)}
                          </strong>
                      </div>
                      <div className="flex justify-between items-center">
                          <span>Spread Líquido:</span>
                          <Badge variant={calculations.spreadPercentage > VIABILITY_THRESHOLD ? "default" : (calculations.spreadPercentage < -VIABILITY_THRESHOLD ? "destructive" : "secondary")}
                              className={cn(
                                  calculations.spreadPercentage > VIABILITY_THRESHOLD && "bg-success text-success-foreground hover:bg-success/90",
                              )}>
                              {formatNumber(calculations.spreadPercentage, { maximumFractionDigits: 2 })}%
                          </Badge>
                      </div>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Detalhes da Operação</CardTitle>
              </CardHeader>
              <CardContent>
                {calculations && !calculations.error && calculations.xprBruto ? (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span>XPR Comprado (bruto):</span> <strong>{formatNumber(calculations.xprBruto)}</strong></div>
                    <div className="flex justify-between"><span>XPR (pós-swap fee):</span> <strong>{formatNumber(calculations.xprLiquidoParaSwap!)}</strong></div>
                    <div className="flex justify-between"><span>VAULTA Recebido:</span> <strong>{formatNumber(calculations.vaultaRecebido!)}</strong></div>
                  </div>
                ) : <div className="text-sm text-muted-foreground">Aguardando dados para exibir detalhes.</div>}
              </CardContent>
            </Card>

          </div>
        </div>
      </main>
    </TooltipProvider>
  );
}
