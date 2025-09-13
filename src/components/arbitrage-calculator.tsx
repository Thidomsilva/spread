"use client";

import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RefreshCcw, TestTube2, ArrowRight } from "lucide-react";

// Definição do tipo para o status do diagnóstico
type DiagnosisStatus = 'positive' | 'negative' | 'neutral';

export default function ArbitrageCalculator() {
  // Estados para os campos de entrada
  const [priceA, setPriceA] = useState("");
  const [priceB, setPriceB] = useState("");
  const [baseAmount, setBaseAmount] = useState("100");
  const [tradeFee, setTradeFee] = useState("0");

  // Função para formatar números com precisão definida
  const formatNumber = (num: number, minDigits = 2, maxDigits = 4) => {
    return num.toLocaleString('en-US', { 
      minimumFractionDigits: minDigits, 
      maximumFractionDigits: maxDigits 
    });
  };

  // hook para calcular os resultados em tempo real
  const results = useMemo(() => {
    const pA = parseFloat(priceA);
    const pB = parseFloat(priceB);
    const amount = parseFloat(baseAmount) || 0;
    const fee = parseFloat(tradeFee) / 100;

    // Retorna nulo se os preços não forem válidos
    if (isNaN(pA) || isNaN(pB) || pA <= 0 || pB <= 0) {
      return null;
    }

    // Cálculo da diferença absoluta entre os preços
    const absoluteDifference = pB - pA;
    
    // Cálculo do spread percentual
    const spreadPercentage = (absoluteDifference / pA) * 100;
    
    // O spread líquido considera a taxa de trade, que é aplicada duas vezes (compra e venda)
    const netSpreadPercentage = spreadPercentage - (fee * 2 * 100);

    // Cálculo do lucro estimado com base no valor base e no spread líquido
    const estimatedProfit = amount * (netSpreadPercentage / 100);

    // Determina o status do diagnóstico (positivo, negativo ou neutro)
    let diagnosis: DiagnosisStatus;
    if (netSpreadPercentage > 0.1) {
      diagnosis = 'positive';
    } else if (netSpreadPercentage < -0.1) {
      diagnosis = 'negative';
    } else {
      diagnosis = 'neutral';
    }

    return {
      absoluteDifference,
      spreadPercentage,
      netSpreadPercentage,
      estimatedProfit,
      diagnosis,
    };
  }, [priceA, priceB, baseAmount, tradeFee]);

  // Função para preencher o formulário com dados de exemplo
  const handleExample = () => {
    setPriceA("0.00670");
    setPriceB("0.00690");
    setBaseAmount("100");
    setTradeFee("0");
  };

  // Efeito para carregar o exemplo na primeira renderização
  useEffect(() => {
    handleExample();
  }, []);

  // Função para resetar todos os campos para os valores padrão
  const handleReset = () => {
    setPriceA("");
    setPriceB("");
    setBaseAmount("100");
    setTradeFee("0");
  };

  // Mapeia o status do diagnóstico para classes de cor e texto
  const diagnosisStyles = {
    positive: { text: "✅ Arbitragem Positiva", color: "text-success" },
    negative: { text: "❌ Arbitragem Negativa", color: "text-destructive" },
    neutral: { text: "⚠️ Neutro", color: "text-muted-foreground" },
  };

  return (
    <main className="w-full max-w-md">
      <Card className="bg-card/50 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 gap-4">
            {/* Seção de Entradas */}
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

            {/* Seção de Resultados */}
            <div className="border-t border-border/50 pt-4 mt-2 space-y-4">
              {results ? (
                <>
                  <div className="text-center">
                    <p className={`text-lg font-bold ${diagnosisStyles[results.diagnosis].color}`}>
                      {diagnosisStyles[results.diagnosis].text}
                    </p>
                  </div>
                  <div className="flex justify-between items-center text-center">
                    <div>
                      <p className="text-xs text-muted-foreground">Spread Líquido</p>
                      <p className={`text-2xl font-bold ${diagnosisStyles[results.diagnosis].color}`}>
                        {formatNumber(results.netSpreadPercentage, 2, 2)}%
                      </p>
                    </div>
                     <ArrowRight className="w-6 h-6 text-muted-foreground/50" />
                    <div>
                      <p className="text-xs text-muted-foreground">Lucro Estimado</p>
                      <p className={`text-2xl font-bold ${diagnosisStyles[results.diagnosis].color}`}>
                        ${formatNumber(results.estimatedProfit, 2, 2)}
                      </p>
                    </div>
                  </div>
                  <p className="text-center text-xs text-muted-foreground pt-2">
                    Diferença Absoluta: ${formatNumber(results.absoluteDifference, 2, 5)}
                  </p>
                </>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  Aguardando preços válidos...
                </div>
              )}
            </div>

            {/* Botões de Ação */}
            <div className="flex gap-2 pt-4 border-t border-border/50">
              <Button onClick={handleExample} variant="outline" className="w-full"><TestTube2 /> Exemplo</Button>
              <Button onClick={handleReset} variant="ghost" className="w-full"><RefreshCcw /> Reset</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
