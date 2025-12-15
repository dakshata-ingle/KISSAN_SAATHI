"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import L from "leaflet";
import { useMap } from "react-leaflet";

// ✅ Fix Leaflet marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png"
});

import {
  MapContainer,
  TileLayer,
  FeatureGroup,
  GeoJSON
} from "react-leaflet";
import { EditControl } from "react-leaflet-draw";

import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";

/**
 * ✅ NDVI → Color
 */
function ndviColor(ndvi?: number) {
  if (ndvi == null) return "#9CA3AF";
  if (ndvi < 0.4) return "#EF4444";
  if (ndvi < 0.6) return "#EAB308";
  return "#22C55E";
}

/**
 * ✅ Health badge (popup)
 */
function healthBadge(risk: string) {
  if (risk === "high")
    return `<span style="background:#FEE2E2;color:#991B1B;padding:4px 8px;border-radius:6px;font-weight:600;">⚠ Needs Attention</span>`;
  if (risk === "medium")
    return `<span style="background:#FEF3C7;color:#92400E;padding:4px 8px;border-radius:6px;font-weight:600;">🟡 Monitor</span>`;
  return `<span style="background:#DCFCE7;color:#166534;padding:4px 8px;border-radius:6px;font-weight:600;">🟢 Healthy</span>`;
}

/**
 * ✅ NDVI dates
 */
const NDVI_DATES = ["2024-11-01", "2024-11-15", "2024-12-01"];

/**
 * ✅ GeoJSON layer
 */
function GeoJsonWithZoom({
  data,
  selectedDate
}: {
  data: any;
  selectedDate: string;
}) {
  const map = useMap();

  return (
    <GeoJSON
      data={data}
      key={selectedDate}
      style={(feature: any) => ({
        color: "#111827",
        weight: 2,
        fillColor: ndviColor(
          feature.properties.ndviHistory?.[selectedDate]
        ),
        fillOpacity: 0.75
      })}
      onEachFeature={(feature, layer) => {
        const {
          farmerName,
          cropType,
          ndviHistory,
          healthScore,
          healthStatus,
          riskLevel
        } = feature.properties;

        const ndvi = ndviHistory?.[selectedDate];

        layer.bindPopup(`
          <strong>Farmer:</strong> ${farmerName}<br/>
          <strong>Crop:</strong> ${cropType}<br/><br/>
          <strong>NDVI:</strong> ${ndvi?.toFixed(2)}<br/>
          <strong>Health Score:</strong> ${healthScore}/100<br/>
          <strong>Status:</strong> ${healthStatus}<br/><br/>
          ${healthBadge(riskLevel)}
        `);

        layer.on({
          mouseover: (e: any) => {
            e.target.setStyle({ weight: 4, fillOpacity: 0.9 });
            e.target.bringToFront();
          },
          mouseout: (e: any) => {
            e.target.setStyle({ weight: 2, fillOpacity: 0.75 });
          },
          click: (e: any) => {
            map.fitBounds(e.target.getBounds(), {
              padding: [30, 30],
              maxZoom: 18
            });
            e.target.openPopup();
          }
        });
      }}
    />
  );
}

export default function LeafletMap() {
  const [fields, setFields] = useState<any>(null);
  const [dateIndex, setDateIndex] = useState(NDVI_DATES.length - 1);
  const drawnItemsRef = useRef<L.FeatureGroup | null>(null);

  const selectedDate = NDVI_DATES[dateIndex];

  const loadFields = async () => {
    const res = await fetch("/api/fields");
    const data = await res.json();
    setFields(data);
  };

  useEffect(() => {
    loadFields();
  }, []);

  /**
   * ✅ COUNT HIGH-RISK FIELDS (for alert)
   */
  const highRiskCount = useMemo(() => {
    if (!fields?.features) return 0;
    return fields.features.filter(
      (f: any) => f.properties.riskLevel === "high"
    ).length;
  }, [fields]);

  /**
   * ✅ Save polygon + recolor
   */
  const onFieldCreated = async (e: any) => {
    const layer = e.layer;
    const geojson = layer.toGeoJSON();

    const res = await fetch("/api/fields", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        farmerName: "Ramesh",
        cropType: "Wheat",
        geometry: geojson.geometry
      })
    });

    const data = await res.json();
    if (!data.success) return;

    layer.setStyle({
      color: "#111827",
      weight: 2,
      fillColor: ndviColor(data.ndvi),
      fillOpacity: 0.75
    });

    loadFields();
  };

  return (
    <MapContainer
      center={[22.727, 75.872]}
      zoom={15}
      scrollWheelZoom
      style={{ height: "100%", width: "100%" }}
    >
      {/* 🚨 ALERT BANNER */}
      {highRiskCount > 0 && (
        <div
          style={{
            position: "absolute",
            top: "16px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "#FEE2E2",
            color: "#991B1B",
            padding: "10px 18px",
            borderRadius: "10px",
            fontWeight: 700,
            boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
            zIndex: 1000
          }}
        >
          ⚠ {highRiskCount} field{highRiskCount > 1 ? "s" : ""} need attention
        </div>
      )}

      {/* 🛰️ SATELLITE */}
      <TileLayer
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        attribution="© Esri"
      />

      {/* 🌱 NDVI + HEALTH */}
      {fields && (
        <GeoJsonWithZoom data={fields} selectedDate={selectedDate} />
      )}

      {/* 🗺️ LABELS */}
      <TileLayer
        url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
      />

      {/* ✏️ DRAW */}
      <FeatureGroup ref={drawnItemsRef}>
        <EditControl
          position="topright"
          onCreated={onFieldCreated}
          draw={{
            polygon: {
              allowIntersection: false,
              showArea: true,
              shapeOptions: {
                color: "#2563EB",
                fillColor: "#3B82F6",
                fillOpacity: 0.4
              }
            },
            rectangle: false,
            polyline: false,
            circle: false,
            marker: false,
            circlemarker: false
          }}
        />
      </FeatureGroup>

      {/* 🎚️ NDVI SLIDER */}
      <div
        style={{
          position: "absolute",
          bottom: "20px",
          left: "50%",
          transform: "translateX(-50%)",
          background: "white",
          padding: "10px 14px",
          borderRadius: "10px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
          zIndex: 1000
        }}
      >
        <strong>{selectedDate}</strong>
        <input
          type="range"
          min={0}
          max={NDVI_DATES.length - 1}
          value={dateIndex}
          onChange={e => setDateIndex(Number(e.target.value))}
          style={{ width: "220px" }}
        />
      </div>
    </MapContainer>
  );
}
