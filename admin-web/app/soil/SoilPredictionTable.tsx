// app/soil/SoilPredictionTable.tsx
"use client";

import React from "react";

interface NutrientPrediction {
  value: number | null;
  unit: string;
  confidence: number;
  method: string;
  std?: number | null;
  low_confidence: boolean;
}

interface SoilPredictionTableProps {
  predictions: Record<string, NutrientPrediction>;
}

export default function SoilPredictionTable({ predictions }: SoilPredictionTableProps) {
  const rows = Object.entries(predictions) as [string, NutrientPrediction][];

  const fmt = (v: number | null, digits = 3) => (v == null ? "N/A" : Number(v).toFixed(digits));

  return (
    <div className="mt-6 border rounded-lg shadow p-4 bg-white">
      <h2 className="text-xl font-semibold mb-3">Soil Nutrient Prediction Results</h2>

      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-100 border-b">
            <th className="p-2 text-left">Nutrient</th>
            <th className="p-2 text-left">Value</th>
            <th className="p-2 text-left">Unit</th>
            <th className="p-2 text-left">Confidence</th>
            <th className="p-2 text-left">Std</th>
            <th className="p-2 text-left">Status</th>
          </tr>
        </thead>

        <tbody>
          {rows.map(([key, item]) => (
            <tr key={key} className={`border-t ${item.low_confidence ? "bg-yellow-100" : ""}`}>
              <td className="p-2 font-medium">{key}</td>
              <td className="p-2">{item.value == null ? "N/A" : fmt(item.value)}</td>
              <td className="p-2">{item.unit}</td>
              <td className="p-2">{fmt(item.confidence)}</td>
              <td className="p-2">{item.std == null ? "-" : fmt(item.std)}</td>
              <td className="p-2">
                {item.low_confidence ? (
                  <span className="text-red-600 font-semibold">Low Confidence ⚠</span>
                ) : (
                  <span className="text-green-700 font-semibold">OK ✔</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="text-xs text-gray-500 mt-2">
        ⚠ Low confidence means the ML model's predictions for that nutrient show high variation between decision trees / estimators.
      </p>
    </div>
  );
}
