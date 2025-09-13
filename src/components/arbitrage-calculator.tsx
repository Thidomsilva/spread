"use client";

import { useState, useMemo, useCallback, useTransition, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RefreshCcw, TestTube, ArrowRight, Sparkles, Search, Network, ChevronsUpDown, Check, Trash } from "lucide-react";
import { liveParityComparison, LiveParityComparisonInput } from "@/ai/flows/live-parity-comparison";
import { getMarketPrice, GetMarketPriceInput } from "@/ai/flows/get-market-price";
import { networkAnalysis, NetworkAnalysisInput, NetworkAnalysisOutput } from "@/ai/flows/network-analysis";
import { getExchangeAssets } from "@/ai/flows/get-exchange-assets";
import { addAssetToDB } from "@/ai/flows/manage-assets-db";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";


type DiagnosisStatus = 'positive' | 'negative' | 'neutral';

const EXCHANGES = ["MEXC", "Bitmart", "Gate.io", "Poloniex"];

// Hook para persistir estado no localStorage de forma segura
function usePersistentState<T>(key: string, defaultValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [state, setState] = useState<T>(() => defaultValue);

  // Efeito para carregar o estado do localStorage apenas no cliente
  useEffect(() => {
    try {
      const storedValue = window.localStorage.getItem(key);
      if (storedValue !== null) {
        setState(JSON.parse(storedValue));
      } else {
        setState(defaultValue);
      }
    } catch (error) {
      console.error(`Error reading localStorage key “${key}”:`, error);
      setState(defaultValue);
    }
  }, [key, defaultValue]);

  // Efeito para salvar o estado no localStorage sempre que ele mudar
  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(state));
    } catch (error) {
      console.error(`Error setting localStorage key “${key}”:`, error);
    }
  }, [key, state]);

  return [state, setState];
}


// Componente de Combobox reutilizável
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
            onClick={(e) => e.stopPropagation()} // Impede o popover de fechar ao clicar no input
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
  const [isPending, startTransition] = useTransition();
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
  const [assetB, setAssetB] = usePersistentState("assetB", "PEPE");
  
  const [networkAnalysisResult, setNetworkAnalysisResult] = useState<NetworkAnalysisOutput | null>(null);

  const [assetsA, setAssetsA] = useState<string[]>([]);
  const [assetsB, setAssetsB] = useState<string[]>([]);
  const [autoRefresh, setAutoRefresh] = usePersistentState("autoRefresh", false);


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
    
    // 1. Compra o Ativo A com o investimento inicial (considerando a taxa)
    const amountOfABought = (initialUSDTValue / pA) * (1 - feeA);

    // 2. Troca o Ativo A pelo Ativo B. O cálculo do fator considera os preços.
    const amountOfBToGet = (amountOfABought * pA) / pB;

    // 3. Vende o Ativo B para obter o valor final em USDT (considerando a taxa)
    const finalUSDTValue = amountOfBToGet * pB * (1 - feeB);
    
    const spread = initialUSDTValue > 0 ? ((finalUSDTValue / initialUSDTValue) - 1) * 100 : 0;
    
    let diagnosis: DiagnosisStatus;
    // Corrigido para comparar os valores finais e iniciais
    if (finalUSDTValue > initialUSDTValue) diagnosis = 'positive';
    else if (finalUSDTValue < initialUSDTValue) diagnosis = 'negative';
    else diagnosis = 'neutral';
    
    // Análise de paridade
    const factor = pA / pB;
    const priceB_break_even = factor > 0 ? pA / factor : 0; // Este cálculo está redundante, mas mantém a estrutura

    return {
      initialUSDTValue,
      amountOfABought,
      amountOfBToGet,
      finalUSDTValue,
      spread,
      diagnosis,
      calculatedFactor: factor,
      priceB_break_even
    };
  }, [priceA, priceB, initialInvestment, tradeFeeA, tradeFeeB]);

  const handleExample = () => {
    setAssetA("JASMY");
    setAssetB("PEPE");
    setPriceA("0.0315");
    setPriceB("0.0000118");
    setInitialInvestment("1000");
    setTradeFeeA("0.1");
    setTradeFeeB("0.1");
    setNetworkAnalysisResult(null);
  };
  
  const handleReset = () => {
    setAssetA("JASMY");
    setAssetB("PEPE");
    setPriceA("");
    setPriceB("");
    setInitialInvestment("100");
    setTradeFeeA("0.1");
    setTradeFeeB("0.1");
    setNetworkAnalysisResult(null);
    setAutoRefresh(false);
  };

  const handleClear = () => {
    setPriceA("");
    setPriceB("");
    setNetworkAnalysisResult(null);
  };

  const handleNetworkAnalysis = useCallback(() => {
    startNetworkAnalysisTransition(async () => {
      setNetworkAnalysisResult(null);
      if (exchangeA === exchangeB) {
        // Não é um erro, apenas uma condição de interface
        setNetworkAnalysisResult({
          isCompatible: false,
          commonNetworks: [],
          reasoning: "A arbitragem ocorre na mesma exchange."
        });
        return;
      }
      try {
        const input: NetworkAnalysisInput = {
          asset: assetA, // Para arbitragem, a transferência é do ativo A
          sourceExchange: exchangeA,
          destinationExchange: exchangeB,
        };
        const result = await networkAnalysis(input);
        setNetworkAnalysisResult(result);
      } catch (error) {
        console.error("Network analysis failed:", error);
        toast({
          variant: "destructive",
          title: "Falha na Análise de Rede",
          description: error instanceof Error ? error.message : "Ocorreu um erro desconhecido.",
        });
      }
    });
  }, [assetA, exchangeA, exchangeB, toast]);

  const handleAiAnalysis = () => {
    startTransition(async () => {
      setNetworkAnalysisResult(null);
        const input: LiveParityComparisonInput = { assetA, assetB, exchangeA, exchangeB };
        try {
            const result = await liveParityComparison(input);
            if (result) {
              setPriceA(result.priceA.toString());
              setPriceB(result.priceB.toString());
              setTradeFeeA(result.feeA.toString());
              setTradeFeeB(result.feeB.toString());
              toast({
                title: "Análise de IA Concluída",
                description: "Os preços e taxas simulados foram preenchidos.",
              });
              handleNetworkAnalysis(); // Executa a análise de rede
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
              description: error instanceof Error ? error.message : "Não foi possível obter os dados. Verifique sua chave de API ou tente novamente.",
            })
        }
    });
  };

  // Função para adicionar um novo ativo descoberto ao DB
  const addNewAssetToDB = async (exchange: string, asset: string, assetList: string[], setAssetList: (assets: string[]) => void) => {
    if (asset && !assetList.some(a => a.toUpperCase() === asset.toUpperCase())) {
      try {
        await addAssetToDB({ exchange, asset });
        // Adiciona o novo ativo à lista local para evitar nova busca
        setAssetList([...assetList, asset.toUpperCase()].sort());
        toast({
          title: "Novo Ativo Salvo!",
          description: `${asset.toUpperCase()} foi adicionado à lista da ${exchange}.`,
        });
      } catch (error) {
        console.error(`Falha ao salvar o novo ativo ${asset} no DB:`, error);
        // Não mostrar toast de erro para não poluir a interface
      }
    }
  };


  const handleFetchRealPrices = useCallback(() => {
    // Não executa se outra busca já estiver em andamento
    if (isFetchingRealPrice) return;
    
    startRealPriceTransition(async () => {
      setNetworkAnalysisResult(null);
      try {
        const inputA: GetMarketPriceInput = { 
          exchange: exchangeA as any, 
          asset: assetA,
        };
        const priceA = await getMarketPrice(inputA);
        setPriceA(priceA.toString());
        await addNewAssetToDB(exchangeA, assetA, assetsA, setAssetsA);
        
        const inputB: GetMarketPriceInput = { 
          exchange: exchangeB as any, 
          asset: assetB,
        };
        const priceB = await getMarketPrice(inputB);
        setPriceB(priceB.toString());
        await addNewAssetToDB(exchangeB, assetB, assetsB, setAssetsB);

        handleNetworkAnalysis();

      } catch (error) {
        console.error("Real price fetching failed:", error);
        // Desliga o auto-refresh em caso de erro para não ficar tentando em loop
        setAutoRefresh(false);
        toast({
          variant: "destructive",
          title: "Falha ao Buscar Preços",
          description: error instanceof Error ? error.message : "Ocorreu um erro desconhecido.",
        })
      }
    });
  }, [assetA, assetB, exchangeA, exchangeB, toast, assetsA, assetsB, handleNetworkAnalysis, isFetchingRealPrice, setAutoRefresh, setPriceA, setPriceB]);

  useEffect(() => {
    if (!autoRefresh || isFetchingRealPrice) {
      return;
    }

    // Executa a primeira vez imediatamente
    handleFetchRealPrices(); 

    const intervalId = setInterval(() => {
      handleFetchRealPrices();
    }, 15000); // 15 segundos

    // Toast para informar que o modo ao vivo está ativo
    toast({
        title: "Modo Ao Vivo Ativado",
        description: "Os preços serão atualizados a cada 15 segundos.",
    });

    return () => {
      clearInterval(intervalId);
      // Toast para informar que o modo ao vivo foi desativado
      if (autoRefresh) { // Apenas mostra se estava ativo ao desmontar
          toast({
              title: "Modo Ao Vivo Desativado",
          });
      }
    };
  }, [autoRefresh, handleFetchRealPrices, isFetchingRealPrice, toast]);
  
  const diagnosisStyles = {
    positive: { text: "✅ Arbitragem Positiva", color: "text-success" },
    negative: { text: "❌ Arbitragem Negativa", color: "text-destructive" },
    neutral: { text: "⚠️ Neutro", color: "text-muted-foreground" },
  };
  
  const isAnyLoading = isPending || isAnalyzingNetworks || isFetchingAssetsA || isFetchingAssetsB;
  const isPriceLoading = isFetchingRealPrice;

  return (
    <Card className="w-full max-w-lg bg-card/50 backdrop-blur-sm border-primary/20 shadow-primary/10 shadow-2xl">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Calculadora de Arbitragem</CardTitle>
        <CardDescription>Simule trocas de ativos entre exchanges e encontre oportunidades.</CardDescription>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-2">
        
        {/* Painel de Controle Principal */}
        <div className="bg-background/50 p-4 rounded-lg border border-border/50 space-y-4 mb-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <Label className="text-sm font-medium text-primary">Ferramentas de Análise</Label>
              <div className="flex items-center gap-2">
                <Button onClick={handleAiAnalysis} disabled={isAnyLoading || isPriceLoading} size="sm" variant="outline" className="h-8">
                    <Sparkles className={isPending ? 'animate-spin' : ''}/>
                    Simular com IA
                </Button>
                <Button onClick={handleFetchRealPrices} disabled={isAnyLoading || isPriceLoading || autoRefresh} size="sm" variant="default" className="h-8">
                    <Search className={isPriceLoading ? 'animate-spin' : ''}/>
                    Preços (Real)
                </Button>
              </div>
            </div>
             <div className="flex items-center space-x-2 pt-2">
                <Switch id="auto-refresh" checked={autoRefresh} onCheckedChange={setAutoRefresh} disabled={isAnyLoading} />
                <Label htmlFor="auto-refresh" className="text-sm font-medium">Atualização Automática (15s)</Label>
              </div>
        </div>

        {/* Investimento Inicial */}
        <div className="p-4 rounded-lg border border-border/50 bg-background/30 mb-4">
          <Label className="text-xs text-muted-foreground" htmlFor="initial-investment">Investimento Inicial (USDT)</Label>
          <div className="mt-2">
            <Input id="initial-investment" type="number" placeholder="100" value={initialInvestment} onChange={e => setInitialInvestment(e.target.value)} disabled={isAnyLoading || autoRefresh} className="font-bold text-2xl h-12 p-2"/>
          </div>
        </div>
        
        <div className="flex justify-center items-center my-2">
           <div className="w-full h-px bg-border/50"></div>
            <ArrowRight className="w-6 h-6 text-primary/50 shrink-0 mx-2"/>
            <div className="w-full h-px bg-border/50"></div>
        </div>
        
        {/* Etapas de Troca */}
        <div className="space-y-4 mb-6">
            {/* Etapa 1: Compra do Ativo A */}
            <div className="p-4 rounded-lg border border-border/50 bg-background/30">
                <Label className="text-xs text-muted-foreground">Etapa 1: Compra do Ativo A</Label>
                <div className="flex items-end gap-4 mt-2">
                    <div className="flex-1 grid gap-2">
                        <Label className="text-xs" htmlFor="asset-a">Ativo a Comprar</Label>
                        <AssetCombobox
                          value={assetA}
                          onChange={setAssetA}
                          assets={assetsA}
                          isLoading={isFetchingAssetsA}
                          disabled={isAnyLoading || autoRefresh}
                        />
                    </div>
                    <div className="flex-1 grid gap-2">
                        <Label className="text-xs" htmlFor="exchange-a">Na Exchange</Label>
                        <Select value={exchangeA} onValueChange={setExchangeA} disabled={isAnyLoading || autoRefresh}>
                            <SelectTrigger id="exchange-a"><SelectValue /></SelectTrigger>
                            <SelectContent>{EXCHANGES.map(ex => <SelectItem key={ex} value={ex}>{ex}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                </div>
                 {calculationResults && (
                    <p className="text-xs text-muted-foreground mt-2">Você recebe ≈ <span className="font-bold text-white">{formatNumber(calculationResults.amountOfABought, 2, 6)} {assetA}</span></p>
                )}
                 <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="grid gap-2">
                        <Label className="text-xs" htmlFor="price-a">Preço {assetA}/USDT</Label>
                        <Input id="price-a" type="number" placeholder="0.00" value={priceA} onChange={e => setPriceA(e.target.value)} disabled={isAnyLoading || autoRefresh}/>
                    </div>
                    <div className="grid gap-2">
                        <Label className="text-xs" htmlFor="trade-fee-a">Taxa de Negociação (%)</Label>
                        <Input id="trade-fee-a" type="number" value={tradeFeeA} onChange={e => setTradeFeeA(e.target.value)} disabled={isAnyLoading || autoRefresh} />
                    </div>
                </div>
            </div>
            
            {/* Etapa 2: Troca por Ativo B */}
            <div className="p-4 rounded-lg border border-border/50 bg-background/30">
                <Label className="text-xs text-muted-foreground">Etapa 2: Venda do Ativo A por B</Label>
                <div className="flex items-end gap-4 mt-2">
                    <div className="flex-1 grid gap-2">
                        <Label className="text-xs" htmlFor="asset-b">Ativo a Receber</Label>
                        <AssetCombobox
                          value={assetB}
                          onChange={setAssetB}
                          assets={assetsB}
                          isLoading={isFetchingAssetsB}
                          disabled={isAnyLoading || autoRefresh}
                        />
                    </div>
                    <div className="flex-1 grid gap-2">
                        <Label className="text-xs" htmlFor="exchange-b">Na Exchange</Label>
                        <Select value={exchangeB} onValueChange={setExchangeB} disabled={isAnyLoading || autoRefresh}>
                            <SelectTrigger id="exchange-b"><SelectValue /></SelectTrigger>
                            <SelectContent>{EXCHANGES.map(ex => <SelectItem key={ex} value={ex}>{ex}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                </div>
                {calculationResults && (
                    <p className="text-xs text-muted-foreground mt-2">Você recebe ≈ <span className="font-bold text-white">{formatNumber(calculationResults.amountOfBToGet, 2, 6)} {assetB}</span></p>
                )}
                 <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="grid gap-2">
                        <Label className="text-xs" htmlFor="price-b">Preço {assetB}/USDT</Label>
                        <Input id="price-b" type="number" placeholder="0.00" value={priceB} onChange={e => setPriceB(e.target.value)} disabled={isAnyLoading || autoRefresh} />
                    </div>
                    <div className="grid gap-2">
                        <Label className="text-xs" htmlFor="trade-fee-b">Taxa de Negociação (%)</Label>
                        <Input id="trade-fee-b" type="number" value={tradeFeeB} onChange={e => setTradeFeeB(e.target.value)} disabled={isAnyLoading || autoRefresh} />
                    </div>
                </div>
            </div>
        </div>

           {isAnalyzingNetworks && (
             <div className="flex items-center justify-center text-sm text-muted-foreground my-4">
                <Network className="animate-spin mr-2 h-4 w-4" />
                Analisando compatibilidade de redes para {assetA}...
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
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-muted-foreground pt-2">
                        <div className="space-y-2 bg-background/50 p-3 rounded-md border border-border/50">
                            <h4 className="font-bold text-foreground text-sm pb-1">Preços Utilizados</h4>
                            <div className="flex justify-between"><span>Preço {assetA}/USDT:</span> <span className="break-all">${formatNumber(parseFloat(priceA), 2, 8)}</span></div>
                            <div className="flex justify-between"><span>Preço {assetB}/USDT:</span> <span className="break-all">${formatNumber(parseFloat(priceB), 2, 8)}</span></div>
                        </div>

                        <div className="space-y-2 bg-background/50 p-3 rounded-md border border-border/50">
                            <h4 className="font-bold text-foreground text-sm pb-1">Análise de Paridade</h4>
                              <div className="flex justify-between"><span>Fator {assetA}→{assetB}:</span> <span className="break-all">{formatNumber(calculationResults.calculatedFactor, 2, 8)}</span></div>
                              <div className="flex justify-between"><span>Preço {assetB} (break-even):</span> <span className="break-all">${formatNumber(calculationResults.priceB_break_even, 2, 8)}</span></div>
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
          <Button onClick={handleExample} variant="outline" className="w-full" disabled={isAnyLoading || autoRefresh}><TestTube /> Exemplo</Button>
          <Button onClick={handleClear} variant="outline" className="w-full" disabled={isAnyLoading || autoRefresh}><Trash/> Limpar Preços</Button>
          <Button onClick={handleReset} variant="ghost" className="w-full" disabled={isAnyLoading}><RefreshCcw /> Reset</Button>
        </div>
      </CardContent>
    </Card>
  );
}
