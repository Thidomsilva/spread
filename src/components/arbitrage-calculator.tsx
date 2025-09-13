"use client";

import { useState, useMemo, useCallback, useTransition, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RefreshCcw, TestTube, ArrowRight, Sparkles, Search, Trash, ChevronsRight } from "lucide-react";
import { getMarketPrice } from "@/ai/flows/get-market-price";
import { networkAnalysis } from "@/ai/flows/network-analysis";
import { getExchangeAssets } from "@/ai/flows/get-exchange-assets";
import { addAssetToDB } from "@/ai/flows/manage-assets-db";
import { investmentAnalysis } from "@/ai/flows/investment-analysis";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { ChevronsUpDown, Check } from "lucide-react";

type NetworkAnalysisOutput = {
    isCompatible: boolean;
    commonNetworks: string[];
    reasoning: string;
};

type InvestmentAnalysisInput = {
    assetA: string;
    exchangeA: string;
    priceA: number;
    feeA: number;
    exchangeB: string;
    priceB: number;
    feeB: number;
    initialInvestment: number;
    finalUSDTValue: number;
    spread: number;
    networkAnalysisResult: NetworkAnalysisOutput;
};

type DiagnosisStatus = 'positive' | 'negative' | 'neutral';

const EXCHANGES = ["MEXC", "Bitmart", "Gate.io", "Poloniex"];

function usePersistentState<T>(key: string, defaultValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [state, setState] = useState<T>(defaultValue);
  const isMounted = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    try {
      const storedValue = window.localStorage.getItem(key);
      if (storedValue !== null) {
        setState(JSON.parse(storedValue));
      }
    } catch (error) {
      console.error(`Error reading localStorage key “${key}”:`, error);
    }
  }, [key]);

  useEffect(() => {
    if (isMounted.current) {
      try {
        window.localStorage.setItem(key, JSON.stringify(state));
      } catch (error) {
        console.error(`Error setting localStorage key “${key}”:`, error);
      }
    }
  }, [key, state]);
  
  return [state, setState];
}

function AssetCombobox({
  value,
  onChange,
  assets,
  isLoading,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  assets: string[];
  isLoading: boolean;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-bold text-lg h-12"
          disabled={disabled || isLoading}
        >
          <Input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value.toUpperCase())}
            placeholder={isLoading ? "Carregando..." : "Selecione ou digite"}
            className="w-full border-0 focus-visible:ring-0 focus-visible:ring-offset-0 p-0 font-bold text-lg bg-transparent"
            disabled={disabled}
            onClick={(e) => e.stopPropagation()} 
          />
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder="Buscar ativo..." />
          <CommandList>
            <CommandEmpty>Nenhum ativo encontrado.</CommandEmpty>
            <CommandGroup>
              {assets.map((asset) => (
                <CommandItem
                  key={asset}
                  value={asset}
                  onSelect={(currentValue) => {
                    onChange(currentValue.toUpperCase());
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value.toLowerCase() === asset.toLowerCase() ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {asset}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}


export default function ArbitrageCalculator() {
  const [isAnalyzingInvestment, startInvestmentAnalysisTransition] = useTransition();
  const [isFetchingRealPrice, startRealPriceTransition] = useTransition();
  const [isAnalyzingNetworks, startNetworkAnalysisTransition] = useTransition();
  const [isFetchingAssetsA, startFetchingAssetsATransition] = useTransition();
  const [isFetchingAssetsB, startFetchingAssetsBTransition] = useTransition();
  const { toast } = useToast();

  const [priceA, setPriceA] = usePersistentState("priceA", "");
  const [priceB, setPriceB] = usePersistentState("priceB", "");
  const [initialInvestment, setInitialInvestment] = usePersistentState("initialInvestment", "100");
  const [tradeFeeA, setTradeFeeA] = usePersistentState("tradeFeeA", "0.1");
  const [tradeFeeB, setTradeFeeB] = usePersistentState("tradeFeeB", "0.1");
  const [exchangeA, setExchangeA] = usePersistentState("exchangeA", EXCHANGES[0]);
  const [exchangeB, setExchangeB] = usePersistentState("exchangeB", EXCHANGES[1]);

  const [assetA, setAssetA] = usePersistentState("assetA", "JASMY");
  
  const [networkAnalysisResult, setNetworkAnalysisResult] = useState<NetworkAnalysisOutput | null>(null);
  const [aiCommentary, setAiCommentary] = useState<string | null>(null);

  const [assetsA, setAssetsA] = useState<string[]>([]);
  const [assetsB, setAssetsB] = useState<string[]>([]);

  const fetchAssets = useCallback(async (exchange: string, assetSetter: React.Dispatch<React.SetStateAction<string[]>>, startTransitionFunc: React.TransitionStartFunction) => {
    startTransitionFunc(async () => {
      try {
        const result = await getExchangeAssets({ exchange });
        assetSetter(result.assets);
      } catch (error) {
        console.error(`Failed to fetch assets for ${exchange}:`, error);
        assetSetter([]);
        toast({
          variant: "destructive",
          title: `Falha ao buscar ativos da ${exchange}`,
          description: error instanceof Error ? error.message : "Ocorreu um erro desconhecido.",
        });
      }
    });
  }, [toast]);

  useEffect(() => {
    if (exchangeA) {
      fetchAssets(exchangeA, setAssetsA, startFetchingAssetsATransition);
    }
  }, [exchangeA, fetchAssets]);

  useEffect(() => {
    if (exchangeB) {
      fetchAssets(exchangeB, setAssetsB, startFetchingAssetsBTransition);
    }
  }, [exchangeB, fetchAssets]);


  const formatNumber = (num: number, minDigits = 2, maxDigits = 4) => {
    if (isNaN(num)) return '0';
    return num.toLocaleString('en-US', {
      minimumFractionDigits: minDigits,
      maximumFractionDigits: maxDigits,
    });
  };

  const calculationResults = useMemo(() => {
    const pA = parseFloat(priceA);
    const pB = parseFloat(priceB);
    const initialUSDTValue = parseFloat(initialInvestment);
    const feeA = parseFloat(tradeFeeA) / 100;
    const feeB = parseFloat(tradeFeeB) / 100;

    if (isNaN(pA) || isNaN(pB) || pA <= 0 || pB <= 0 || isNaN(initialUSDTValue) || initialUSDTValue <=0) {
      return null;
    }
    
    // 1. Compra o Ativo A com o investimento inicial (considerando a taxa de compra)
    const amountOfAssetBought = (initialUSDTValue / pA) * (1 - feeA);
    
    // 2. Vende a mesma quantidade de Ativo A na outra exchange (considerando a taxa de venda)
    const finalUSDTValue = amountOfAssetBought * pB * (1 - feeB);
    
    const spread = initialUSDTValue > 0 ? ((finalUSDTValue / initialUSDTValue) - 1) * 100 : 0;
    
    let diagnosis: DiagnosisStatus;
    if (spread > 0) diagnosis = 'positive';
    else if (spread < 0) diagnosis = 'negative';
    else diagnosis = 'neutral';
    
    return {
      initialUSDTValue,
      amountOfAssetBought,
      finalUSDTValue,
      spread,
      diagnosis,
    };
  }, [priceA, priceB, initialInvestment, tradeFeeA, tradeFeeB]);

  const handleExample = () => {
    setAssetA("JASMY");
    setExchangeA("MEXC");
    setExchangeB("Gate.io");
    setPriceA("0.0315");
    setPriceB("0.0325");
    setInitialInvestment("1000");
    setTradeFeeA("0.1");
    setTradeFeeB("0.2");
    setNetworkAnalysisResult(null);
    setAiCommentary(null);
  };
  
  const handleReset = () => {
    setAssetA("JASMY");
    setPriceA("");
    setPriceB("");
    setInitialInvestment("100");
    setTradeFeeA("0.1");
    setTradeFeeB("0.1");
    setNetworkAnalysisResult(null);
    setAiCommentary(null);
  };

  const handleClear = () => {
    setPriceA("");
    setPriceB("");
    setNetworkAnalysisResult(null);
    setAiCommentary(null);
  };

  const handleNetworkAnalysis = useCallback(async (): Promise<NetworkAnalysisOutput | null> => {
    return new Promise((resolve) => {
        startNetworkAnalysisTransition(async () => {
        setNetworkAnalysisResult(null);
        setAiCommentary(null); 
        if (!assetA || !exchangeA || !exchangeB) {
            resolve(null);
            return;
        }

        if (exchangeA === exchangeB) {
            const analysisResult = {
              isCompatible: false,
              commonNetworks: [],
              reasoning: "A arbitragem ocorre na mesma exchange, não há transferência de rede."
            };
            setNetworkAnalysisResult(analysisResult);
            resolve(analysisResult);
            return;
        }
        try {
            const input = {
              asset: assetA,
              sourceExchange: exchangeA,
              destinationExchange: exchangeB,
            };
            const result = await networkAnalysis(input);
            setNetworkAnalysisResult(result);
            resolve(result);
        } catch (error) {
            console.error("Network analysis failed:", error);
            const failResult = {
              isCompatible: false,
              commonNetworks: [],
              reasoning: `Falha na análise: ${error instanceof Error ? error.message : "Erro desconhecido."}`
            };
            toast({
              variant: "destructive",
              title: "Falha na Análise de Rede",
              description: error instanceof Error ? error.message : "Ocorreu um erro desconhecido.",
            });
            setNetworkAnalysisResult(failResult);
            resolve(failResult);
        }
        });
    });
  }, [assetA, exchangeA, exchangeB, toast]);
  

  const addNewAssetToDB = useCallback(async (exchange: string, asset: string) => {
    const assetList = exchange === exchangeA ? assetsA : assetsB;
    const setAssetList = exchange === exchangeA ? setAssetsA : setAssetsB;

    if (asset && !assetList.some(a => a.toUpperCase() === asset.toUpperCase())) {
      try {
        await addAssetToDB({ exchange, asset });
        setAssetList(prevAssets => [...prevAssets, asset.toUpperCase()].sort());
        toast({
          title: "Novo Ativo Salvo!",
          description: `${asset.toUpperCase()} foi adicionado à lista da ${exchange}.`,
        });
      } catch (error) {
        console.error(`Falha ao salvar o novo ativo ${asset} no DB:`, error);
        // Não mostrar toast de erro para não poluir a interface
      }
    }
  }, [exchangeA, exchangeB, assetsA, assetsB, toast]);


 const handleFetchRealPrices = useCallback(() => {
    if (!assetA || !exchangeA || !exchangeB || isFetchingRealPrice) return;
    
    startRealPriceTransition(async () => {
      setPriceA("");
      setPriceB("");
      setNetworkAnalysisResult(null);
      setAiCommentary(null);
      
      try {
        const [priceResultA, priceResultB] = await Promise.all([
          getMarketPrice({ asset: assetA, exchange: exchangeA }),
          getMarketPrice({ asset: assetA, exchange: exchangeB })
        ]);

        const fetchedPriceA = priceResultA;
        const fetchedPriceB = priceResultB;
        
        const fees: Record<string, number> = { 'MEXC': 0.1, 'Bitmart': 0.1, 'Gate.io': 0.2, 'Poloniex': 0.14 };
        const fetchedFeeA = fees[exchangeA] || 0.1;
        const fetchedFeeB = fees[exchangeB] || 0.1;

        setPriceA(fetchedPriceA.toString());
        setPriceB(fetchedPriceB.toString());
        setTradeFeeA(fetchedFeeA.toString());
        setTradeFeeB(fetchedFeeB.toString());

        await addNewAssetToDB(exchangeA, assetA);
        await addNewAssetToDB(exchangeB, assetA);
        
        const netAnalysisResult = await handleNetworkAnalysis();

        const tempCalculationResults = (() => {
            const pA = fetchedPriceA;
            const pB = fetchedPriceB;
            const initialUSDT = parseFloat(initialInvestment);
            const tFeeA = fetchedFeeA / 100;
            const tFeeB = fetchedFeeB / 100;
            
            if (isNaN(pA) || isNaN(pB) || pA <= 0 || pB <= 0 || isNaN(initialUSDT) || initialUSDT <=0) return null;
            
            const amountOfAssetBought = (initialUSDT / pA) * (1 - tFeeA);
            const finalUSDTValue = amountOfAssetBought * pB * (1 - tFeeB);
            const spread = initialUSDT > 0 ? ((finalUSDTValue / initialUSDT) - 1) * 100 : 0;
            return { finalUSDTValue, spread };
        })();

        if (tempCalculationResults && netAnalysisResult) {
            startInvestmentAnalysisTransition(async () => {
              const investmentInput: InvestmentAnalysisInput = {
                assetA: assetA,
                exchangeA: exchangeA,
                priceA: fetchedPriceA,
                feeA: fetchedFeeA,
                exchangeB: exchangeB,
                priceB: fetchedPriceB,
                feeB: fetchedFeeB,
                initialInvestment: parseFloat(initialInvestment),
                finalUSDTValue: tempCalculationResults.finalUSDTValue,
                spread: tempCalculationResults.spread,
                networkAnalysisResult: netAnalysisResult
              };
              try {
                const { commentary } = await investmentAnalysis(investmentInput);
                setAiCommentary(commentary);
              } catch(error) {
                 console.error("Investment analysis failed:", error);
                 setAiCommentary("A análise da IA falhou em gerar um comentário.");
              }
            });
        }

      } catch (error) {
        toast({
          variant: "destructive",
          title: "Falha ao Buscar Preços",
          description: error instanceof Error ? error.message : "Ocorreu um erro desconhecido. Verifique se o par existe em ambas as exchanges.",
        });
        setPriceA("");
        setPriceB("");
      }
    });
  }, [
    assetA, exchangeA, exchangeB, toast, isFetchingRealPrice, 
    setPriceA, setPriceB, setTradeFeeA, setTradeFeeB, handleNetworkAnalysis, initialInvestment,
    addNewAssetToDB
  ]);
  
  const diagnosisStyles = {
    positive: { text: "✅ Arbitragem Positiva", color: "text-success" },
    negative: { text: "❌ Arbitragem Negativa", color: "text-destructive" },
    neutral: { text: "⚠️ Neutro", color: "text-muted-foreground" },
  };
  
  const isAnyLoading = isAnalyzingInvestment || isAnalyzingNetworks || isFetchingAssetsA || isFetchingAssetsB;
  const isPriceLoading = isFetchingRealPrice;

  return (
    <Card className="w-full max-w-2xl bg-card/50 backdrop-blur-sm border-primary/20 shadow-primary/10 shadow-2xl">
      <CardContent className="p-4 sm:p-6">
        
        <div className="bg-background/50 p-4 rounded-lg border border-border/50 space-y-4 mb-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <Label className="text-sm font-medium text-primary">Ferramentas de Análise</Label>
              <div className="flex items-center gap-2">
                <Button onClick={handleFetchRealPrices} disabled={isAnyLoading || isPriceLoading} size="sm" variant="default" className="h-8">
                    <Search className={cn("h-4 w-4", isPriceLoading && 'animate-spin')}/>
                    Buscar Preços e Analisar
                </Button>
              </div>
            </div>
        </div>

        <div className="grid gap-2 mb-6 p-4 rounded-lg border border-border/50 bg-background/30">
          <Label className="text-xs text-muted-foreground" htmlFor="initial-investment">Investimento Inicial (USDT)</Label>
          <Input id="initial-investment" type="number" placeholder="100" value={initialInvestment} onChange={e => setInitialInvestment(e.target.value)} disabled={isAnyLoading} className="font-bold text-2xl h-12 p-2"/>
        </div>
        
        <div className="grid gap-2 mb-6">
            <Label className="text-sm font-medium">Ativo para Arbitragem</Label>
            <AssetCombobox
                value={assetA}
                onChange={setAssetA}
                assets={[...new Set([...assetsA, ...assetsB])].sort()}
                isLoading={isFetchingAssetsA || isFetchingAssetsB}
                disabled={isAnyLoading}
            />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-start gap-4 mb-6">
            <div className="p-4 rounded-lg border border-border/50 bg-background/30 space-y-4 h-full">
                <Label className="text-xs text-muted-foreground">Etapa 1: Comprar em</Label>
                <div className="grid gap-2">
                    <Label className="text-xs" htmlFor="exchange-a">Exchange de Compra</Label>
                    <Select value={exchangeA} onValueChange={setExchangeA} disabled={isAnyLoading}>
                        <SelectTrigger id="exchange-a"><SelectValue /></SelectTrigger>
                        <SelectContent>{EXCHANGES.map(ex => <SelectItem key={ex} value={ex}>{ex}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
                 <div className="grid gap-2">
                    <Label className="text-xs" htmlFor="price-a">Preço de Compra (USDT)</Label>
                    <Input id="price-a" type="number" placeholder="0.00" value={priceA} onChange={e => setPriceA(e.target.value)} disabled={isAnyLoading}/>
                </div>
                <div className="grid gap-2">
                    <Label className="text-xs" htmlFor="trade-fee-a">Taxa de Negociação (%)</Label>
                    <Input id="trade-fee-a" type="number" value={tradeFeeA} onChange={e => setTradeFeeA(e.target.value)} disabled={isAnyLoading} />
                </div>
                 {calculationResults && (
                    <p className="text-xs text-muted-foreground pt-1">Você recebe ≈ <span className="font-bold text-white">{formatNumber(calculationResults.amountOfAssetBought, 2, 6)} {assetA}</span></p>
                )}
            </div>

            <div className="flex justify-center items-center h-full my-4 md:my-0">
                <ChevronsRight className="w-8 h-8 text-primary/50 shrink-0 mx-2 transform md:rotate-0"/>
            </div>
            
            <div className="p-4 rounded-lg border border-border/50 bg-background/30 space-y-4 h-full">
                <Label className="text-xs text-muted-foreground">Etapa 2: Vender em</Label>
                <div className="grid gap-2">
                    <Label className="text-xs" htmlFor="exchange-b">Exchange de Venda</Label>
                    <Select value={exchangeB} onValueChange={setExchangeB} disabled={isAnyLoading}>
                        <SelectTrigger id="exchange-b"><SelectValue /></SelectTrigger>
                        <SelectContent>{EXCHANGES.map(ex => <SelectItem key={ex} value={ex}>{ex}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
                 <div className="grid gap-2">
                    <Label className="text-xs" htmlFor="price-b">Preço de Venda (USDT)</Label>
                    <Input id="price-b" type="number" placeholder="0.00" value={priceB} onChange={e => setPriceB(e.target.value)} disabled={isAnyLoading} />
                </div>
                <div className="grid gap-2">
                    <Label className="text-xs" htmlFor="trade-fee-b">Taxa de Negociação (%)</Label>
                    <Input id="trade-fee-b" type="number" value={tradeFeeB} onChange={e => setTradeFeeB(e.target.value)} disabled={isAnyLoading} />
                </div>
                {calculationResults && (
                    <p className="text-xs text-muted-foreground pt-1">Valor de venda ≈ <span className="font-bold text-white">${formatNumber(calculationResults.finalUSDTValue, 2, 2)}</span></p>
                )}
            </div>
        </div>

           {(isAnalyzingNetworks || isAnalyzingInvestment || isPriceLoading) && (
             <div className="flex items-center justify-center text-sm text-muted-foreground my-4">
                <Sparkles className="animate-spin mr-2 h-4 w-4" />
                {isPriceLoading ? 'Buscando preços...' : isAnalyzingNetworks ? `Analisando redes...` : 'Consultor IA analisando a operação...'}
              </div>
           )}

            {networkAnalysisResult && (
              <div className={`text-center p-3 my-4 rounded-md border ${networkAnalysisResult.isCompatible ? 'border-success/50 bg-success/10' : 'border-destructive/50 bg-destructive/10'}`}>
                <p className={`font-bold text-lg ${networkAnalysisResult.isCompatible ? 'text-success' : 'text-destructive'}`}>
                  {networkAnalysisResult.isCompatible ? '✅ Compatível' : '❌ Incompatível'}
                </p>
                <p className="text-xs text-muted-foreground">{networkAnalysisResult.reasoning}</p>
                {networkAnalysisResult.isCompatible && (
                    <p className="text-sm mt-1">
                    Redes em comum: <span className="font-semibold">{networkAnalysisResult.commonNetworks.join(', ')}</span>
                  </p>
                )}
              </div>
            )}
            
            {aiCommentary && (
              <div className="p-4 my-4 rounded-lg border border-primary/30 bg-primary/10">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <h4 className="font-bold text-primary">Análise do Consultor IA</h4>
                </div>
                <p className="text-sm text-foreground/80 whitespace-pre-wrap">{aiCommentary}</p>
              </div>
            )}

          <div className="border-t-2 border-primary/20 pt-6 mt-6 space-y-6">
            {calculationResults ? (
              <>
                <div className="text-center">
                    <p className="text-sm text-muted-foreground">Spread Líquido Estimado</p>
                  <p className={`text-5xl font-bold tracking-tighter ${diagnosisStyles[calculationResults.diagnosis].color}`}>
                      {formatNumber(calculationResults.spread, 2, 2)}%
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row justify-center items-center text-center gap-2 sm:gap-3 flex-wrap">
                  <p className="text-2xl text-muted-foreground break-all">${formatNumber(calculationResults.initialUSDTValue,2,2)}</p>
                  <ArrowRight className="w-6 h-6 text-primary/50 hidden sm:block" />
                  <p className={`text-2xl font-bold break-all ${diagnosisStyles[calculationResults.diagnosis].color}`}>
                      ${formatNumber(calculationResults.finalUSDTValue, 2, 2)}
                  </p>
                </div>
                
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="item-1">
                    <AccordionTrigger className="text-xs text-muted-foreground">
                      Detalhes da Operação
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="grid grid-cols-1 gap-4 text-xs text-muted-foreground pt-2">
                        <div className="space-y-2 bg-background/50 p-3 rounded-md border border-border/50">
                            <h4 className="font-bold text-foreground text-sm pb-1">Preços e Taxas</h4>
                            <div className="flex justify-between"><span>Preço Compra ({assetA} / {exchangeA}):</span> <span className="break-all">${formatNumber(parseFloat(priceA), 2, 8)}</span></div>
                            <div className="flex justify-between"><span>Preço Venda ({assetA} / {exchangeB}):</span> <span className="break-all">${formatNumber(parseFloat(priceB), 2, 8)}</span></div>
                             <div className="flex justify-between border-t border-border/50 pt-2 mt-2"><span>Taxas Totais (Estimado):</span> <span>{tradeFeeA}% + {tradeFeeB}%</span></div>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>

              </>
            ) : (
                <div className="text-center text-muted-foreground py-12">Aguardando dados para calcular...</div>
            )}
          </div>

        <div className="flex flex-col sm:flex-row gap-2 pt-6 border-t border-border/50 mt-6">
          <Button onClick={handleExample} variant="outline" className="w-full" disabled={isAnyLoading || isPriceLoading}><TestTube className="mr-2 h-4 w-4" /> Exemplo</Button>
          <Button onClick={handleClear} variant="outline" className="w-full" disabled={isAnyLoading}><Trash className="mr-2 h-4 w-4"/> Limpar Preços</Button>
          <Button onClick={handleReset} variant="ghost" className="w-full" disabled={isAnyLoading}><RefreshCcw className="mr-2 h-4 w-4" /> Reset</Button>
        </div>
      </CardContent>
    </Card>
  );
}
