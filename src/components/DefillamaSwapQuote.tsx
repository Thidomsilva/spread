"use client";
import React, { useState } from "react";

// Chains e tokens para Jumper (Li.Fi)
const CHAINS = [
  { name: "ethereum", chainId: 1 },
  { name: "bsc", chainId: 56 },
  { name: "polygon", chainId: 137 },
  { name: "arbitrum", chainId: 42161 },
  { name: "optimism", chainId: 10 },
];
const TOKENS = [
  { symbol: "USDT", address: "0xdAC17F958D2ee523a2206206994597C13D831ec7", decimals: 6 },
  { symbol: "USDC", address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", decimals: 6 },
  { symbol: "DAI", address: "0x6B175474E89094C44Da98b954EedeAC495271d0F", decimals: 18 },
  { symbol: "WETH", address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", decimals: 18 },
  { symbol: "WBTC", address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", decimals: 8 },
  { symbol: "ETH", address: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee", decimals: 18 },
];


export default function DefillamaSwapQuote() {
  const [chainIdx, setChainIdx] = useState(0);
  const [fromIdx, setFromIdx] = useState(0);
  const [toIdx, setToIdx] = useState(2); // DAI
  const [amount, setAmount] = useState("1");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function fetchQuote() {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const fromChain = CHAINS[chainIdx].chainId;
      const toChain = CHAINS[chainIdx].chainId; // swap na mesma chain por padrão
      const fromToken = TOKENS[fromIdx].address;
      const toToken = TOKENS[toIdx].address;
      const decimals = TOKENS[fromIdx].decimals;
      // amount em unidades do token (ex: 1 USDT = 1e6)
      const amountRaw = (Number(amount) * Math.pow(10, decimals)).toFixed(0);
      const res = await fetch(`/api/jumper-quote?fromChain=${fromChain}&toChain=${toChain}&fromToken=${fromToken}&toToken=${toToken}&amount=${amountRaw}`);
      if (!res.ok) throw new Error("Erro ao consultar Jumper");
      const data = await res.json();
      setResult(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4 border rounded bg-background/50 max-w-xl mx-auto my-8">
  <h2 className="font-bold text-lg mb-2">Cotação Jumper (Li.Fi)</h2>
      <div className="flex flex-wrap gap-2 mb-2">
        <select value={chainIdx} onChange={e => setChainIdx(Number(e.target.value))} className="border p-1 rounded">
          {CHAINS.map((c, i) => <option key={c.chainId} value={i}>{c.name}</option>)}
        </select>
        <select value={fromIdx} onChange={e => setFromIdx(Number(e.target.value))} className="border p-1 rounded">
          {TOKENS.map((t, i) => <option key={t.symbol} value={i}>{t.symbol}</option>)}
        </select>
        <select value={toIdx} onChange={e => setToIdx(Number(e.target.value))} className="border p-1 rounded">
          {TOKENS.map((t, i) => <option key={t.symbol} value={i}>{t.symbol}</option>)}
        </select>
        <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="border p-1 rounded w-24" />
        <button onClick={fetchQuote} disabled={loading} className="bg-primary text-white px-3 py-1 rounded">
          {loading ? "Consultando..." : "Consultar"}
        </button>
      </div>
      {error && <div className="text-red-500">{error}</div>}
      {result && (
        <div className="mt-2 text-sm bg-black/10 p-2 rounded overflow-x-auto">
          <div><b>Melhor rota:</b> {result.estimate && result.estimate.route ? result.estimate.route.map((r: any) => r.tool).join(" → ") : "-"}</div>
          <div><b>Recebido:</b> {result.estimate && result.estimate.toAmount ? (Number(result.estimate.toAmount) / Math.pow(10, TOKENS[toIdx].decimals)).toFixed(6) : "-"} {TOKENS[toIdx].symbol}</div>
          <div><b>Preço estimado:</b> {result.estimate && result.estimate.fromAmount && result.estimate.toAmount ? (Number(result.estimate.fromAmount) / Number(result.estimate.toAmount)).toFixed(6) : "-"}</div>
          <pre className="mt-2">{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
