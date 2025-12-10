"use client";

import React, { useState } from "react";

interface NutrientPrediction {
  value: number | null;
  unit: string;
  confidence: number;
  method: string;
  std?: number | null;
  low_confidence: boolean;
}

interface PredictionResponse {
  success: boolean;
  model_version: string;
  timestamp: number;
  predictions: Record<string, NutrientPrediction>;
}

interface SoilPredictionCardProps {
  onResult?: (data: PredictionResponse) => void;
}

export default function SoilPredictionCard({ onResult }: SoilPredictionCardProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PredictionResponse | null>(null);

  async function fetchPrediction(payload: any) {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("http://localhost:8000/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data: PredictionResponse = await res.json();

      if (!data.success) throw new Error("Server returned success=false");

      setResult(data);

      // 🔥 Send result to page.tsx
      onResult?.(data);

    } catch (err: any) {
      setError(err?.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const examplePayload = {
    ndvi_mean_90d: 0.45,
    ndvi_trend_30d: 0.02,
    pH_0_30: 6.7,
    soc_0_30: 0.9,
    clay: 28,
    silt: 32,
    sand: 40,
    ndvi_std_90d: 0.08,
    ndre_mean_90d: 0.18,
    bsi_mean_90d: 0.04,
    valid_obs_count: 6,
    cloud_pct: 12,
    area_ha: 1.2,
    elevation: 260,
    rainfall_30d: 55,
  };

  return (
    <div className="p-4 border rounded shadow-sm bg-white">
      <h3 className="text-lg font-semibold mb-3">Soil Predictions</h3>

      <div className="mb-3">
        <button
          onClick={() => fetchPrediction(examplePayload)}
          className="px-3 py-2 bg-indigo-600 text-white rounded"
          disabled={loading}
        >
          {loading ? "Loading..." : "Get Soil Data (Example)"}
        </button>
      </div>

      {error && <div className="text-red-600">Error: {error}</div>}

      {/* === Display Result Table === */}
      {result && (
        <div>
          <div className="mb-2 text-sm text-gray-600">
            Model: {result.model_version} •{" "}
            {new Date(result.timestamp * 1000).toLocaleString()}
          </div>

          <table className="w-full text-sm border">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 text-left">Nutrient</th>
                <th className="p-2 text-right">Value</th>
                <th className="p-2 text-left">Unit</th>
                <th className="p-2 text-left">Confidence</th>
                <th className="p-2 text-left">Method</th>
              </tr>
            </thead>

            <tbody>
              {Object.entries(result.predictions).map(([key, v]) => (
                <tr key={key} className="border-t">
                  <td className="p-2">{key}</td>
                  <td className="p-2 text-right">
                    {v.value === null ? "N/A" : v.value}
                  </td>
                  <td className="p-2">{v.unit}</td>
                  <td className="p-2">
                    {typeof v.confidence === "number"
                      ? v.confidence.toFixed(3)
                      : v.confidence}
                  </td>
                  <td className="p-2">{v.method}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
