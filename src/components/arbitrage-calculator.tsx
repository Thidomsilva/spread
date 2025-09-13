"use client";

import { useState, useMemo, useCallback, useTransition, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RefreshCcw, TestTube, ArrowRight, Eraser, Sparkles, Search, Network, ChevronsUpDown, Check, Trash } from "lucide-react";
import { liveParityComparison, LiveParityComparisonInput } from "@/ai/flows/live-parity-comparison";
import { getMarketPrice, GetMarketPriceInput } from "@/ai/flows/get-market-price";
import { networkAnalysis, NetworkAnalysisInput, NetworkAnalysisOutput } from "@/ai/flows/network-analysis";
import { getExchangeAssets } from "@/ai/flows/get-exchange-assets";
import { addAssetToDB } from "@/ai/flows/manage-assets-db";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";


type DiagnosisStatus = 'positive' | 'negative' | 'neutral';

const EXCHANGES = ["MEXC", "Bitmart", "Gate.io"];

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
          className="w-full justify-between font-bold text-lg h-auto"
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

  const [triPriceA, setTriPriceA] = useState("");
  const [triPriceB, setTriPriceB] = useState("");
  const [initialUSDT, setInitialUSDT] = useState("100");
  const [tradeFeeA, setTradeFeeA] = useState("0");
  const [tradeFeeB, setTradeFeeB] = useState("0");
  const [exchangeA, setExchangeA] = useState(EXCHANGES[0]);
  const [exchangeB, setExchangeB] = useState(EXCHANGES[1]);

  const [assetA, setAssetA] = useState("JASMY");
  const [assetB, setAssetB] = useState("PEPE");
  const [networkAnalysisResult, setNetworkAnalysisResult] = useState<NetworkAnalysisOutput | null>(null);

  const [assetsA, setAssetsA] = useState<string[]>([]);
  const [assetsB, setAssetsB] = useState<string[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(false);


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

  const triResults = useMemo(() => {
    const pA = parseFloat(triPriceA);
    const pB = parseFloat(triPriceB);
    const usdtInitial = parseFloat(initialUSDT);
    const feeA = parseFloat(tradeFeeA) / 100;
    const feeB = parseFloat(tradeFeeB) / 100;

    if (isNaN(pA) || isNaN(pB) || pA <= 0 || pB <= 0 || isNaN(usdtInitial)) {
      return null;
    }
    
    const factor = pA / pB;

    const A_bruto = usdtInitial / pA;
    const A_pos_compra = A_bruto * (1 - feeA);
    const B_recebido = A_pos_compra / factor;
    const USDT_final_bruto = B_recebido * pB;
    const USDT_final_liquido = USDT_final_bruto * (1 - feeB);
    const spread = usdtInitial > 0 ? ((USDT_final_liquido / usdtInitial) - 1) * 100 : 0;
    
    let diagnosis: DiagnosisStatus;
    if (spread > 0.0001) diagnosis = 'positive';
    else if (spread < -0.0001) diagnosis = 'negative';
    else diagnosis = 'neutral';
    
    const A_equivalente = pB * (1/factor);
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
      preco_B_break_even,
      calculatedFactor: factor,
    };
  }, [triPriceA, triPriceB, initialUSDT, tradeFeeA, tradeFeeB]);

  const handleExample = () => {
    setAssetA("JASMY");
    setAssetB("PEPE");
    setTriPriceA("0.0315");
    setTriPriceB("0.0000118");
    setInitialUSDT("250");
    setTradeFeeA("0");
    setTradeFeeB("0");
    setNetworkAnalysisResult(null);
  };
  
  const handleReset = () => {
    setAssetA("JASMY");
    setAssetB("PEPE");
    setTriPriceA("");
    setTriPriceB("");
    setInitialUSDT("100");
    setTradeFeeA("0");
    setTradeFeeB("0");
    setNetworkAnalysisResult(null);
    setAutoRefresh(false);
  };

  const handleClear = () => {
    setTriPriceA("");
    setTriPriceB("");
    setNetworkAnalysisResult(null);
  };

  const handleNetworkAnalysis = useCallback(() => {
    startNetworkAnalysisTransition(async () => {
      setNetworkAnalysisResult(null);
      if (exchangeA === exchangeB) {
        setNetworkAnalysisResult({
          isCompatible: false,
          commonNetworks: [],
          reasoning: "As exchanges de origem e destino são as mesmas."
        });
        return;
      }
      try {
        const input: NetworkAnalysisInput = {
          asset: assetA,
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
        const input: LiveParityComparisonInput = { assetA, assetB };
        try {
            const result = await liveParityComparison(input);
            if (result) {
              setTriPriceA(result.priceA.toString());
              setTriPriceB(result.priceB.toString());
              toast({
                title: "Análise de IA Concluída",
                description: "Os preços simulados foram preenchidos.",
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
              description: "Não foi possível obter os dados. Verifique sua chave de API ou tente novamente.",
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
        setTriPriceA(priceA.toString());
        await addNewAssetToDB(exchangeA, assetA, assetsA, setAssetsA);
        
        const inputB: GetMarketPriceInput = { 
          exchange: exchangeB as any, 
          asset: assetB,
        };
        const priceB = await getMarketPrice(inputB);
        setTriPriceB(priceB.toString());
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
  }, [assetA, assetB, exchangeA, exchangeB, toast, assetsA, assetsB, handleNetworkAnalysis, isFetchingRealPrice]);

  useEffect(() => {
    if (!autoRefresh || isFetchingRealPrice) {
      return;
    }

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
      if (autoRefresh) { // Apenas mostra se estava ativo
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
        <CardDescription>Analise oportunidades de triangulação entre exchanges.</CardDescription>
      </CardHeader>
      <CardContent className="p-6 pt-2">
        <div className="grid grid-cols-1 gap-6">
          <div className="bg-background/50 p-4 rounded-lg border border-border/50 space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <Label className="text-sm font-medium text-primary">Ferramentas de Análise</Label>
                <div className="flex items-center gap-2">
                  <Button onClick={handleAiAnalysis} disabled={isAnyLoading || isPriceLoading} size="sm" variant="outline" className="h-8">
                      <Sparkles className={isPending ? 'animate-spin' : ''}/>
                      Preços (IA)
                  </Button>
                  <Button onClick={handleFetchRealPrices} disabled={isAnyLoading || isPriceLoading || autoRefresh} size="sm" variant="default" className="h-8">
                      <Search className={isPriceLoading ? 'animate-spin' : ''}/>
                      Preços (Real)
                  </Button>
                </div>
              </div>

               <div className="flex items-center space-x-2">
                  <Switch id="auto-refresh" checked={autoRefresh} onCheckedChange={setAutoRefresh} disabled={isAnyLoading} />
                  <Label htmlFor="auto-refresh" className="text-sm font-medium">Atualização Automática (15s)</Label>
                </div>

              <div className="flex items-center gap-3">
                  <div className="grid gap-2 w-full">
                     <AssetCombobox
                        value={assetA}
                        onChange={setAssetA}
                        assets={assetsA}
                        isLoading={isFetchingAssetsA}
                        disabled={isAnyLoading || autoRefresh}
                      />
                  </div>
                <ArrowRight className="w-5 h-5 text-primary/50 shrink-0"/>
                <div className="grid gap-2 w-full">
                     <AssetCombobox
                        value={assetB}
                        onChange={setAssetB}
                        assets={assetsB}
                        isLoading={isFetchingAssetsB}
                        disabled={isAnyLoading || autoRefresh}
                      />
                  </div>
              </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                  <Label>Comprar A em</Label>
                  <Select value={exchangeA} onValueChange={setExchangeA} disabled={isAnyLoading || autoRefresh}>
                      <SelectTrigger>
                          <SelectValue placeholder="Selecione a Exchange" />
                      </SelectTrigger>
                      <SelectContent>
                          {EXCHANGES.map(ex => <SelectItem key={ex} value={ex}>{ex}</SelectItem>)}
                      </SelectContent>
                  </Select>
              </div>
              <div className="grid gap-2">
                  <Label>Vender A (ou B) em</Label>
                  <Select value={exchangeB} onValueChange={setExchangeB} disabled={isAnyLoading || autoRefresh}>
                      <SelectTrigger>
                          <SelectValue placeholder="Selecione a Exchange" />
                      </SelectTrigger>
                      <SelectContent>
                          {EXCHANGES.map(ex => <SelectItem key={ex} value={ex}>{ex}</SelectItem>)}
                      </SelectContent>
                  </Select>
              </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="tri-price-a">Preço A/USDT</Label>
              <Input id="tri-price-a" type="number" placeholder="0.00" value={triPriceA} onChange={e => setTriPriceA(e.target.value)} disabled={isAnyLoading || autoRefresh} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tri-price-b">Preço B/USDT</Label>
              <Input id="tri-price-b" type="number" placeholder="0.00" value={triPriceB} onChange={e => setTriPriceB(e.target.value)} disabled={isAnyLoading || autoRefresh} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="initial-usdt">USDT Inicial</Label>
              <Input id="initial-usdt" type="number" value={initialUSDT} onChange={e => setInitialUSDT(e.target.value)} disabled={isAnyLoading || autoRefresh} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="trade-fee-a">Taxa Compra A (%)</Label>
              <Input id="trade-fee-a" type="number" value={tradeFeeA} onChange={e => setTradeFeeA(e.target.value)} disabled={isAnyLoading || autoRefresh} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="trade-fee-b">Taxa Venda B (%)</Label>
              <Input id="trade-fee-b" type="number" value={tradeFeeB} onChange={e => setTradeFeeB(e.target.value)} disabled={isAnyLoading || autoRefresh} />
            </div>
          </div>

           {isAnalyzingNetworks && (
             <div className="flex items-center justify-center text-sm text-muted-foreground">
                <Network className="animate-spin mr-2 h-4 w-4" />
                Analisando compatibilidade de redes para {assetA}...
              </div>
           )}

            {networkAnalysisResult && (
              <div className={`text-center p-3 rounded-md border ${networkAnalysisResult.isCompatible ? 'border-success/50 bg-success/10' : 'border-destructive/50 bg-destructive/10'}`}>
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

          <div className="border-t-2 border-primary/20 pt-6 space-y-6">
            {triResults ? (
              <>
                <div className="text-center">
                    <p className="text-sm text-muted-foreground">Spread Líquido Estimado</p>
                  <p className={`text-5xl font-bold tracking-tighter ${diagnosisStyles[triResults.diagnosis].color}`}>
                      {formatNumber(triResults.spread, 2, 2)}%
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row justify-center items-center text-center gap-2 sm:gap-3 flex-wrap">
                  <p className="text-2xl text-muted-foreground break-all">${formatNumber(parseFloat(initialUSDT),2,2)}</p>
                  <ArrowRight className="w-6 h-6 text-primary/50 hidden sm:block" />
                  <p className={`text-2xl font-bold break-all ${diagnosisStyles[triResults.diagnosis].color}`}>
                      ${formatNumber(triResults.USDT_final_liquido, 2, 2)}
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-muted-foreground">
                  <div className="space-y-2 bg-background/50 p-3 rounded-md border border-border/50">
                      <h4 className="font-bold text-foreground text-sm pb-1">Detalhes da Operação</h4>
                      <div className="flex justify-between"><span>A (bruto):</span> <span className="break-all">{formatNumber(triResults.A_bruto, 4)}</span></div>
                      <div className="flex justify-between"><span>A (pós-taxa):</span> <span className="break-all">{formatNumber(triResults.A_pos_compra, 4)}</span></div>
                      <div className="flex justify-between"><span>B (recebido):</span> <span className="break-all">{formatNumber(triResults.B_recebido, 4)}</span></div>
                  </div>

                  <div className="space-y-2 bg-background/50 p-3 rounded-md border border-border/50">
                      <h4 className="font-bold text-foreground text-sm pb-1">Análise de Paridade</h4>
                        <div className="flex justify-between"><span>Fator A→B:</span> <span className="break-all">{formatNumber(triResults.calculatedFactor, 2, 8)}</span></div>
                        <div className="flex justify-between"><span>Delta Relativo:</span> <span className={triResults.delta_relativo > 0 ? 'text-success' : 'text-destructive'}>{formatNumber(triResults.delta_relativo, 2, 2)}%</span></div>
                        <div className="flex justify-between"><span>Preço B (break-even):</span> <span className="break-all">${formatNumber(triResults.preco_B_break_even, 2, 8)}</span></div>
                  </div>
                </div>
              </>
            ) : (
                <div className="text-center text-muted-foreground py-12">Aguardando dados para calcular...</div>
            )}
          </div>
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
