import { MapContainer, TileLayer, LayersControl, useMap } from "react-leaflet";
import L from "leaflet";
import { useEffect, useMemo, useRef, useState } from "react";
import "leaflet.heat"; // extends L with heatLayer
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "./components/ui/toggle-group";
import {
  Anchor,
  Beaker,
  CloudSun,
  FishSymbol,
  Map,
  Search,
  SearchCheck,
  Shell,
  Thermometer,
} from "lucide-react";
import { Input } from "@/components/ui/input";

/**
 * Assumed backend response (GET http://localhost:8080/get)
 * {
 *   sightings?: Array<{ lat: number, lng: number, label?: string, ts?: string }>,
 *   thermal?: { points: Array<[number,number,number?]> },
 *   prey?: Array<{ lat: number, lng: number, abundance?: number }>,
 *   waterQuality?: Array<{ lat: number, lng: number, index?: number }>,
 *   migration?: Array<Array<[number,number]>>,
 *   climate?: { points: Array<[number,number,number?]> }
 * }
 */

function HeatmapLayer({ points, options }) {
  const map = useMap();
  const {
    radius = 25,
    blur = 15,
    maxZoom = 10,
    max = 1.0,
    gradient,
  } = options || {};

  useEffect(() => {
    if (!map || !points?.length) return;
    const layer = L.heatLayer(points, {
      radius,
      blur,
      maxZoom,
      max,
      gradient,
    }).addTo(map);
    return () => {
      layer.remove();
    };
  }, [map, points, radius, blur, maxZoom, max, gradient]);

  return null;
}

// Demo hotspots used by some layers
const HOTSPOTS = [
  { lat: 15, lng: -74, label: "Central Caribbean" },
  { lat: 19.5, lng: -78.5, label: "Jamaica/Cayman" },
  { lat: 13.5, lng: -61, label: "Windward Islands" },
  { lat: 22.5, lng: -84.5, label: "South of Cuba" },
  { lat: 11.5, lng: -69.5, label: "ABC Islands" },
];

function HotspotsLayer({ radius = 6, color = "#ef4444", fillOpacity = 0.6 }) {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    const group = L.layerGroup();
    for (const h of HOTSPOTS) {
      const m = L.circleMarker([h.lat, h.lng], {
        radius,
        color,
        weight: 1,
        fillColor: color,
        fillOpacity,
      }).addTo(group);
      m.bindTooltip(h.label, { direction: "top" });
    }
    group.addTo(map);
    return () => group.remove();
  }, [map, radius, color, fillOpacity]);
  return null;
}

function LinesLayer({ paths, options }) {
  const map = useMap();
  const { color = "#10b981", weight = 3, opacity = 0.9 } = options || {};
  useEffect(() => {
    if (!map || !paths?.length) return;
    const group = L.layerGroup();
    for (const path of paths) {
      try {
        // coerce points to numeric [lat,lng] and filter invalid entries
        const pts = (path || [])
          .map((pt) =>
            Array.isArray(pt)
              ? [Number(pt[0]), Number(pt[1])]
              : [Number(pt?.lat), Number(pt?.lng)]
          )
          .filter(([a, b]) => Number.isFinite(a) && Number.isFinite(b));
        if (pts.length >= 2)
          L.polyline(pts, { color, weight, opacity }).addTo(group);
      } catch (e) {
        console.warn("Skipping malformed migration path", e);
      }
    }
    group.addTo(map);
    return () => group.remove();
  }, [map, JSON.stringify(paths || []), color, weight, opacity]);
  return null;
}

function generateCaribbeanHeatData(count = 400) {
  const latMin = 9,
    latMax = 26;
  const lngMin = -90,
    lngMax = -60;

  const hotspots = [
    { lat: 15, lng: -74, w: 1.0 }, // central Caribbean
    { lat: 19.5, lng: -78.5, w: 0.9 }, // near Jamaica/Cayman
    { lat: 13.5, lng: -61, w: 0.75 }, // Windward Islands
    { lat: 22.5, lng: -84.5, w: 0.7 }, // south of Cuba
    { lat: 11.5, lng: -69.5, w: 0.8 }, // ABC islands area
  ];

  const points = [];
  const rand = (a, b) => a + Math.random() * (b - a);
  const gauss = (d, s) => Math.exp(-(d * d) / (2 * s * s));

  for (let i = 0; i < count; i++) {
    const lat = rand(latMin, latMax);
    const lng = rand(lngMin, lngMax);

    // Base gradient: warmer near equator (lower latitude)
    const latNorm = (lat - latMin) / (latMax - latMin); // 0 (south) .. 1 (north)
    let weight = 1 - latNorm * 0.6; // cooler towards north

    // Add hotspot contributions
    for (const h of hotspots) {
      const d = Math.hypot(lat - h.lat, lng - h.lng);
      weight += h.w * gauss(d, 3.5); // sigma ~3.5 deg
    }

    // Normalize to 0..1
    weight = Math.max(0.05, Math.min(1, weight / 2));

    points.push([lat, lng, weight]);
  }
  return points;
}

// Render CSV dot points using Leaflet circle markers
function CsvDotsLayer({ points, options, onPointClick }) {
  const map = useMap();
  const { radius = 4, color = "#0ea5e9", fillOpacity = 0.7 } = options || {};

  // Submit handler moved out of JSX so syntax stays valid
  async function submitLatLng() {
    const lat = parseFloat(latInput);
    const lng = parseFloat(lngInput);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      console.warn(
        "Invalid latitude/longitude input. Please enter numeric values."
      );
      return;
    }
    try {
      setPredicting(true);
      const res = await fetch("http://localhost:8080/predictionSighting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat, lng }),
      });
      if (!res.ok) throw new Error(HTTP ${res.status});
      const data = await res.json();

      // Flexible response handling
      let pts = [];
      if (Array.isArray(data)) {
        pts = data
          .map(toLatLng)
          .filter(([a, b]) => Number.isFinite(a) && Number.isFinite(b));
      } else if (Array.isArray(data?.sightings)) {
        pts = data.sightings
          .map(toLatLng)
          .filter(([a, b]) => Number.isFinite(a) && Number.isFinite(b));
      } else if (Array.isArray(data?.points)) {
        pts = data.points
          .map(toLatLng)
          .filter(([a, b]) => Number.isFinite(a) && Number.isFinite(b));
      } else if (
        typeof data?.lat === "number" &&
        typeof data?.lng === "number"
      ) {
        pts = [[Number(data.lat), Number(data.lng)]];
      } else if (
        typeof data?.latitude === "number" &&
        typeof data?.longitude === "number"
      ) {
        pts = [[Number(data.latitude), Number(data.longitude)]];
      }

      if (pts.length) {
        setPredictedSightings(pts);
        setSelected("d1"); // jump to Sighting Data tab
        setShowDots(false); // ensure CSV doesn't override
        setMapBounds(WORLD_BOUNDS);
      } else {
        console.warn("predictSighting returned no points");
      }
    } catch (err) {
      console.warn("predictSighting failed:", err?.message || err);
    } finally {
      setPredicting(false);
    }
  }
  useEffect(() => {
    if (!map || !points?.length) return;
    const group = L.layerGroup();
    for (const [lat, lng] of points) {
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        const marker = L.circleMarker([lat, lng], {
          radius,
          color,
          weight: 1,
          fillColor: color,
          fillOpacity,
        }).addTo(group);

        // Show coordinates on click and notify parent
        marker.on("click", (e) => {
          const ll = e.latlng || marker.getLatLng();
          try {
            L.popup({ className: "coord-popup" })
              .setLatLng(ll)
              .setContent(
                Lat: ${ll.lat.toFixed(5)}, Lng: ${ll.lng.toFixed(5)}
              )
              .openOn(map);
          } catch {}
          if (typeof onPointClick === "function") onPointClick(ll);
        });
      }
    }
    group.addTo(map);

    // Fit to points
    try {
      const bounds = L.latLngBounds(points.map(([la, ln]) => [la, ln]));
      if (bounds.isValid()) map.fitBounds(bounds.pad(0.1));
    } catch {}

    return () => {
      group.remove();
    };
  }, [map, points, radius, color, fillOpacity]);

  return null;
}

async function parseLatLngCsv(file, limit = 10000) {
  const text = await file.text();
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];
  const header = lines[0].split(",").map((h) =>
    h
      .trim()
      .replace(/^\uFEFF/, "")
      .toLowerCase()
  );

  const findIndex = (candidates) =>
    header.findIndex((h) => candidates.includes(h));

  const latIdx = findIndex(["lat", "latitude", "y"]);
  const lngIdx = findIndex(["lng", "lon", "long", "longitude", "x"]);

  if (latIdx === -1 || lngIdx === -1) return [];

  const points = [];
  for (let i = 1; i < lines.length && points.length < limit; i++) {
    const cols = lines[i].split(",");
    if (cols.length <= Math.max(latIdx, lngIdx)) continue;
    const lat = parseFloat(cols[latIdx]);
    const lng = parseFloat(cols[lngIdx]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      points.push([lat, lng]);
    }
  }
  return points;
}

// Controller to apply center/zoom/bounds to the map after it mounts
function MapFrameController({ center, zoom, bounds, padding = 0.1 }) {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    if (Array.isArray(bounds) && bounds.length === 2) {
      try {
        const b = L.latLngBounds(bounds);
        if (b.isValid()) {
          map.fitBounds(b.pad(padding));
          return;
        }
      } catch {}
    }
    if (Array.isArray(center) && center.length === 2) {
      if (typeof zoom === "number")
        map.setView(center, zoom, { animate: false });
      else map.setView(center, map.getZoom(), { animate: false });
    } else if (typeof zoom === "number") {
      map.setZoom(zoom);
    }
  }, [map, center?.[0], center?.[1], zoom, JSON.stringify(bounds), padding]);
  return null;
}

// Small legend overlay rendered on top of the map
function MapLegend({ selected, intensity = 1, position = "overlay" }) {
  // Colors used elsewhere in the dashboard
  const sharkColors = {
    resting: "#3b82f6",
    migrating: "#f59e0b",
    eating: "#ef4444",
    unknown: "#6b7280",
  };

  const thermalGradient =
    "linear-gradient(90deg,#0b306e 0%,#2a9df4 40%,#f7b500 70%,#d00000 100%)";
  const preyGradient =
    "linear-gradient(90deg,#083f07 0%,#22c55e 40%,#f59e0b 70%,#ef4444 100%)";
  const climateGradient = thermalGradient; // reuse

  const base =
    " w-full m-auto max-w-4xl p-8 bg-white/95 dark:bg-slate-800/95 rounded-md shadow-md text-sm";
  const containerClass =
    position === "overlay"
      ? absolute right-4 top-4 ${base}
      : mt-3 ml-auto ${base};

  return (
    <div className={${containerClass} flex flex-wrap items-center gap-4}>
      <div className="flex items-center gap-3 mr-2">
        <div className="font-semibold text-gray-800 dark:text-gray-100">
          Map legend
        </div>
      </div>

      {/* Thermal */}
      <div className="flex items-center gap-2">
        <div className="text-xs text-gray-600 dark:text-gray-300">Thermal</div>
        <div
          style={{
            height: 10,
            width: 120,
            borderRadius: 6,
            background: thermalGradient,
          }}
          className="inline-block"
        />
      </div>

      {/* Prey */}
      <div className="flex items-center gap-2">
        <div className="text-xs text-gray-600 dark:text-gray-300">Prey</div>
        <div
          style={{
            height: 10,
            width: 120,
            borderRadius: 6,
            background: preyGradient,
          }}
          className="inline-block"
        />
      </div>

      {/* Climate */}
      <div className="flex items-center gap-2">
        <div className="text-xs text-gray-600 dark:text-gray-300">Climate</div>
        <div
          style={{
            height: 10,
            width: 120,
            borderRadius: 6,
            background: climateGradient,
          }}
          className="inline-block"
        />
      </div>

      {/* Shark badges */}
      <div className="flex items-center gap-3">
        <div className="text-xs text-gray-600 dark:text-gray-300">Shark</div>
        <div className="flex items-center gap-2">
          <span
            style={{ background: sharkColors.resting }}
            className="inline-block w-3 h-3 rounded-full"
          />
          <span className="text-xs text-gray-600">Resting</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            style={{ background: sharkColors.migrating }}
            className="inline-block w-3 h-3 rounded-full"
          />
          <span className="text-xs text-gray-600">Migrating</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            style={{ background: sharkColors.eating }}
            className="inline-block w-3 h-3 rounded-full"
          />
          <span className="text-xs text-gray-600">Eating</span>
        </div>
      </div>

      {/* Point layers compact */}
      <div className="flex items-center gap-4 ml-auto">
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-full bg-[#ef4444]" />{" "}
          <span className="text-xs text-gray-600">Sighting</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-full bg-[#22c55e]" />{" "}
          <span className="text-xs text-gray-600">Prey</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-full bg-[#3b82f6]" />{" "}
          <span className="text-xs text-gray-600">Water</span>
        </div>
      </div>
    </div>
  );
}

// coerce helpers for backend data
// Accept both object {lat,lng} and array [lat,lng]
const toLatLng = (p) =>
  Array.isArray(p)
    ? [Number(p[0]), Number(p[1])]
    : [Number(p?.lat), Number(p?.lng)];

const toLatLngW = (p) =>
  Array.isArray(p)
    ? [Number(p[0]), Number(p[1]), p[2] != null ? Number(p[2]) : 1]
    : [
        Number(p?.lat),
        Number(p?.lng),
        p?.weight != null ? Number(p.weight) : 1,
      ];
const toPath = (arr) => arr?.map((pt) => toLatLng(pt)) || [];
const toCenter = (c) =>
  Array.isArray(c) ? toLatLng(c) : c ? [Number(c.lat), Number(c.lng)] : null;
const toBounds = (b) =>
  Array.isArray(b) && b.length === 2 ? [toLatLng(b[0]), toLatLng(b[1])] : null;

// Parse free-form text into [lat, lng]
function parseLatLngFromString(s) {
  if (!s || typeof s !== "string") return null;
  const nums = s.match(/-?\d+(?:\.\d+)?/g);
  if (!nums || nums.length < 2) return null;
  const lat = parseFloat(nums[0]);
  const lng = parseFloat(nums[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return [lat, lng];
}

// Earth-scale bounds to frame the whole world
const WORLD_BOUNDS = [
  [-85, -180],
  [85, 180],
];

function Dashboard() {
  const center = [17, -75];

  const [selected, setSelected] = useState("d1");
  const [enabled, setEnabled] = useState(true);
  const [radius, setRadius] = useState(25);
  const [intensity, setIntensity] = useState(0.9);
  const [csvPoints, setCsvPoints] = useState([]);
  const [showDots, setShowDots] = useState(false);
  const [dotSize, setDotSize] = useState(4);
  const fileInputRef = useRef(null);

  // Map frame state (from API origin)
  const [mapCenter, setMapCenter] = useState(center);
  const [mapZoom, setMapZoom] = useState(5);
  const [mapBounds, setMapBounds] = useState(null);

  // API-backed state
  const [apiSightings, setApiSightings] = useState(null); // Array<[lat,lng]>
  const [apiThermal, setApiThermal] = useState(null); // Array<[lat,lng,weight]>
  const [apiPrey, setApiPrey] = useState(null); // Array<[lat,lng]>
  const [apiPreyThermal, setApiPreyThermal] = useState(null); // Array<[lat,lng,weight]>
  const [apiWater, setApiWater] = useState(null); // Array<[lat,lng]>
  const [apiMigration, setApiMigration] = useState(null); // Array<Array<[lat,lng]>>
  const [apiSharkActivity, setApiSharkActivity] = useState(null); // Array<[lat,lng,prediction] | {lat,lng,prediction}>

  // Render shark activity points with a prediction score (1,2,3) shown in different colors
  function SharkActivityLayer({ points, options, onPointClick }) {
    const map = useMap();
    const { radius = 6, weight = 1, fillOpacity = 0.8 } = options || {};

    // prediction mapping and color helpers
    // New mapping requested: 1 == resting, 0 == migrating, 2 == eating
    const predictionLabel = (p) => {
      if (p === 1 || p === "1") return "Resting";
      if (p === 0 || p === "0") return "Migrating";
      if (p === 2 || p === "2") return "Eating";
      return "Unknown";
    };

    const predictionColor = (p) => {
      if (p == null) return "#6b7280"; // gray for unknown
      if (p === 1 || p === "1") return "#3b82f6"; // blue - resting
      if (p === 0 || p === "0") return "#f59e0b"; // orange - migrating
      if (p === 2 || p === "2") return "#ef4444"; // red - eating
      return "#6366f1";
    };

    useEffect(() => {
      if (!map || !points || !points.length) return;
      const group = L.layerGroup();

      for (const p of points) {
        let lat, lng, pred;
        if (Array.isArray(p)) {
          lat = Number(p[0]);
          lng = Number(p[1]);
          pred = p[2] != null ? p[2] : null;
        } else if (p && typeof p === "object") {
          lat = Number(p.lat ?? p.latitude ?? p[0]);
          lng = Number(p.lng ?? p.longitude ?? p[1]);
          pred = p.prediction ?? p.pred ?? p.score ?? null;
        }
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
        const color = predictionColor(pred);

        const marker = L.circleMarker([lat, lng], {
          radius,
          color,
          weight,
          fillColor: color,
          fillOpacity,
          interactive: true,
        }).addTo(group);

        // popup shows details (badge-style header) - create explicit popup instance
        const ts =
          (p && (p.ts || p.time || p.timestamp)) ||
          (Array.isArray(p) && p[3]) ||
          null;
        const species = p && (p.species || p.species_name || p.label || p.name);
        const label = predictionLabel(pred);
        const colorDot = predictionColor(pred);

        const popupHtml = `
          <div style="font-family: system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; font-size:13px; color:#111827;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
              <div style="padding:4px 8px;border-radius:999px;background:${colorDot};color:#fff;font-weight:700;font-size:12px;line-height:1;display:inline-block">${label}</div>
              <div style="line-height:1">
                <div style="font-weight:600;color:#0f172a">${
                  species ? String(species) : "Shark activity"
                }</div>
                <div style="font-size:12px;color:#6b7280">pred: ${
                  pred ?? "n/a"
                }</div>
              </div>
            </div>
            <div style="color:#374151">Lat: ${lat.toFixed(
              5
            )}<br/>Lng: ${lng.toFixed(5)}</div>
            ${
              ts
                ? `<div style="margin-top:6px;color:#6b7280;font-size:12px">Time: ${String(
                    ts
                  )}</div>`
                : ""
            }
          </div>
        `;

        const popup = L.popup({
          maxWidth: 260,
          className: "shark-activity-popup",
        }).setContent(popupHtml);

        marker.on("click", (e) => {
          try {
            popup.setLatLng(marker.getLatLng()).openOn(map);
          } catch (err) {
            console.warn("popup open failed", err);
          }
          const ll = e.latlng || marker.getLatLng();
          if (typeof onPointClick === "function") onPointClick(ll);
        });
      }

      group.addTo(map);

      // Fit to points
      try {
        const bounds = L.latLngBounds(
          points
            .map((p) =>
              Array.isArray(p)
                ? [Number(p[0]), Number(p[1])]
                : [Number(p.lat), Number(p.lng)]
            )
            .filter(([a, b]) => Number.isFinite(a) && Number.isFinite(b))
        );
        if (bounds.isValid()) map.fitBounds(bounds.pad(0.1));
      } catch {}

      return () => group.remove();
    }, [map, JSON.stringify(points || []), radius, weight, fillOpacity]);

    return null;
  }
  const [apiClimate, setApiClimate] = useState(null); // Array<[lat,lng,weight]>

  // UI: capture last clicked point for potential dialog/popover
  const [clickedPoint, setClickedPoint] = useState(null);

  // Predict Sighting flow
  const [coordInput, setCoordInput] = useState("");
  const [predictedSightings, setPredictedSightings] = useState(null); // Array<[lat,lng]>
  const [predicting, setPredicting] = useState(false);

  // Ensure earth-scale frame whenever Sighting Data tab is active
  useEffect(() => {
    if (selected === "d1") {
      setMapBounds(WORLD_BOUNDS);
    }
  }, [selected]);

  // Fetch from backend
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("http://localhost:8080/get", {
          method: "GET",
        });
        if (!res.ok) throw new Error(HTTP ${res.status});
        const data = await res.json();
        if (cancelled) return;

        // Origin -> map frame
        if (data?.origin) {
          const oc = toCenter(data.origin.center ?? data.origin);
          const ob = toBounds(data.origin.bounds);
          const oz =
            typeof data.origin.zoom === "number" ? data.origin.zoom : undefined;
          if (oc && Number.isFinite(oc[0]) && Number.isFinite(oc[1]))
            setMapCenter(oc);
          if (typeof oz === "number") setMapZoom(oz);
          if (ob) setMapBounds(ob);
        }

        if (Array.isArray(data?.sightings)) {
          setApiSightings(data.sightings.map(toLatLng));
        }
        if (Array.isArray(data?.thermal?.points)) {
          setApiThermal(data.thermal.points.map(toLatLngW));
        }
        if (Array.isArray(data?.prey)) {
          setApiPrey(data.prey.map(toLatLng));
        }
        if (Array.isArray(data?.waterQuality)) {
          setApiWater(data.waterQuality.map(toLatLng));
        }
        if (Array.isArray(data?.migration)) {
          setApiMigration(data.migration.map(toPath));
        }
        if (Array.isArray(data?.climate?.points)) {
          setApiClimate(data.climate.points.map(toLatLngW));
        }
      } catch (e) {
        console.warn("Backend request failed:", e?.message || e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Fallback-generated thermal data if API not present
  const fallbackThermal = useMemo(() => generateCaribbeanHeatData(500), []);
  const baseThermal = apiThermal ?? fallbackThermal;
  const heatPoints = useMemo(
    () =>
      baseThermal.map(([lat, lng, w = 1]) => [
        lat,
        lng,
        Math.max(0, Math.min(1, w * intensity)),
      ]),
    [baseThermal, intensity]
  );

  // Prey-available thermal payload (user-provided)
  const PREY_THERMAL_PAYLOAD = {
    thermal: {
      points: [
        [21.32651791419603, -79.89247976683664, 0.9996861219406128],
        [24.588686718170898, -95.40663951868758, 0.09564905613660812],
        [29.80044148343347, -120.82571824050683, 0.9999206066131592],
        [-36.68539032259705, -10.62875719806923, 0.9987298846244812],
        [14.703906527535146, 118.83185658212564, 0.9850975275039673],
        [-9.860844269556736, -100.37712015338664, 0.9989984631538391],
        [3.656780647806253, 80.90092794665533, 0.9999538660049438],
        [-3.8921331047068684, 149.498251666582, 0.9995149374008179],
        [17.90511683842291, -61.632163673580244, 0.9989810585975647],
      ],
      options: {
        radius: 27,
        blur: 19,
        maxZoom: 12,
        max: 1,
      },
    },
  };

  // When Prey Available tab is selected, POST the provided payload to /getMigration
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (selected !== "d3") return;
      try {
        const res = await fetch("http://localhost:8080/getMigration", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(PREY_THERMAL_PAYLOAD),
        });
        if (!res.ok) throw new Error(HTTP ${res.status});
        const data = await res.json();
        if (cancelled) return;
        console.log(data);
        // Accept flexible shapes: { thermal: { points: [...] } } or direct points array
        if (Array.isArray(data)) {
          setApiPreyThermal(
            data
              .map((p) =>
                Array.isArray(p)
                  ? [Number(p[0]), Number(p[1]), Number(p[2] ?? 1)]
                  : null
              )
              .filter(
                (x) => x && Number.isFinite(x[0]) && Number.isFinite(x[1])
              )
          );
        } else if (Array.isArray(data?.thermal?.points)) {
          setApiPreyThermal(
            data.thermal.points
              .map((p) =>
                Array.isArray(p)
                  ? [Number(p[0]), Number(p[1]), Number(p[2] ?? 1)]
                  : null
              )
              .filter(
                (x) => x && Number.isFinite(x[0]) && Number.isFinite(x[1])
              )
          );
        } else if (Array.isArray(PREY_THERMAL_PAYLOAD?.thermal?.points)) {
          // Fallback: use the local payload if server responds unexpectedly
          setApiPreyThermal(
            PREY_THERMAL_PAYLOAD.thermal.points.map((p) => [
              Number(p[0]),
              Number(p[1]),
              Number(p[2] ?? 1),
            ])
          );
        } else {
          console.warn("Unexpected /getMigration response", data);
        }
      } catch (err) {
        console.warn("/getMigration POST failed:", err?.message || err);
        // Fallback to local payload so the UI shows something
        setApiPreyThermal(
          PREY_THERMAL_PAYLOAD.thermal.points.map((p) => [
            Number(p[0]),
            Number(p[1]),
            Number(p[2] ?? 1),
          ])
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selected]);

  // Derived datasets for layers (prefer API > CSV > fallback)
  const randomPoints = useMemo(() => {
    const latMin = 9,
      latMax = 26,
      lngMin = -90,
      lngMax = -60;
    const n = 300,
      pts = [];
    for (let i = 0; i < n; i++)
      pts.push([
        latMin + Math.random() * (latMax - latMin),
        lngMin + Math.random() * (lngMax - lngMin),
      ]);
    return pts;
  }, []);

  const sightingsPoints = useMemo(() => {
    if (predictedSightings?.length) return predictedSightings;
    if (showDots && csvPoints.length) return csvPoints;
    if (apiSightings?.length) return apiSightings;
    return randomPoints;
  }, [predictedSightings, showDots, csvPoints, apiSightings, randomPoints]);

  const preyPoints = useMemo(
    () => (apiPrey?.length ? apiPrey : randomPoints),
    [apiPrey, randomPoints]
  );
  const waterPoints = useMemo(
    () => (apiWater?.length ? apiWater : randomPoints),
    [apiWater, randomPoints]
  );
  const migrationPaths = useMemo(() => {
    if (apiMigration?.length) return apiMigration;
    return [
      [
        [12.5, -70.5],
        [15.2, -71.0],
        [18.0, -72.0],
        [20.5, -73.5],
        [23.0, -74.0],
      ],
      [
        [10.8, -81.0],
        [14.0, -80.0],
        [17.3, -79.2],
        [20.1, -78.0],
        [23.2, -77.4],
      ],
    ];
  }, [apiMigration]);

  // When Migration tab is selected, fetch shark activity predictions from backend
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (selected !== "d5") return;
      try {
        const res = await fetch("http://localhost:8080/sharkActivity", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          // optionally send current map center/zoom to help backend
          body: JSON.stringify({ center: mapCenter, zoom: mapZoom }),
        });
        if (!res.ok) throw new Error(HTTP ${res.status});
        const data = await res.json();
        if (cancelled) return;

        // Accept flexible shapes: array of arrays, array of objects
        if (Array.isArray(data)) {
          setApiSharkActivity(data);
        } else if (Array.isArray(data?.points)) {
          setApiSharkActivity(data.points);
        } else if (Array.isArray(data?.activity)) {
          setApiSharkActivity(data.activity);
        } else {
          console.warn("Unexpected /sharkActivity response", data);
        }
      } catch (err) {
        console.warn("/sharkActivity fetch failed:", err?.message || err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selected, mapCenter?.[0], mapCenter?.[1], mapZoom]);

  // When Sighting Data tab is selected, POST to backend to get sighting points (server may accept center/zoom)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (selected !== "d1") return;
      try {
        const res = await fetch("http://localhost:8080/predictionSighting", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ center: mapCenter, zoom: mapZoom }),
        });
        if (!res.ok) throw new Error(HTTP ${res.status});
        const data = await res.json();
        if (cancelled) return;

        // Flexible response handling: support array of points, {sightings: [...]}, {points: [...]}
        if (Array.isArray(data)) {
          setApiSightings(
            data
              .map((p) =>
                Array.isArray(p)
                  ? [Number(p[0]), Number(p[1])]
                  : [Number(p?.lat), Number(p?.lng)]
              )
              .filter(([a, b]) => Number.isFinite(a) && Number.isFinite(b))
          );
        } else if (Array.isArray(data?.sightings)) {
          setApiSightings(
            data.sightings
              .map((p) =>
                Array.isArray(p)
                  ? [Number(p[0]), Number(p[1])]
                  : [Number(p?.lat), Number(p?.lng)]
              )
              .filter(([a, b]) => Number.isFinite(a) && Number.isFinite(b))
          );
        } else if (Array.isArray(data?.points)) {
          setApiSightings(
            data.points
              .map((p) =>
                Array.isArray(p)
                  ? [Number(p[0]), Number(p[1])]
                  : [Number(p?.lat), Number(p?.lng)]
              )
              .filter(([a, b]) => Number.isFinite(a) && Number.isFinite(b))
          );
        } else if (
          typeof data?.lat === "number" &&
          typeof data?.lng === "number"
        ) {
          setApiSightings([[Number(data.lat), Number(data.lng)]]);
        } else {
          console.warn("Unexpected /sightingData response", data);
        }
      } catch (err) {
        console.warn("/sightingData fetch failed:", err?.message || err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selected, mapCenter?.[0], mapCenter?.[1], mapZoom]);

  const baseClimate = apiClimate ?? baseThermal;
  const climatePoints = useMemo(
    () =>
      baseClimate.map(([lat, lng, w = 1]) => [
        lat,
        lng,
        Math.max(0, Math.min(1, w * intensity)),
      ]),
    [baseClimate, intensity]
  );

  return (
    <div className="relative m-2 rounded-lg ">
      <div className="max-w-6xl m-auto">
        <header className="mb-6">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900">
            Dashboard — Heatmap
          </h1>
          <p className="mt-2 text-sm text-gray-600 max-w-2xl">
            Interactive thermal and predictive heatmaps showing model hotspots,
            recent observations, and configurable layer controls.
          </p>
        </header>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
          <Input
            placeholder="Enter gps coordinates"
            className="pl-9"
            value={coordInput}
            onChange={(e) => setCoordInput(e.target.value)}
            onKeyDown={async (e) => {
              if (e.key !== "Enter" || predicting) return;
              const parsed = parseLatLngFromString(coordInput);
              if (!parsed) {
                console.warn("Invalid coordinate input. Expected 'lat,lng'.");
                return;
              }
              const [lat, lng] = parsed;
              try {
                setPredicting(true);
                const res = await fetch(
                  "http://localhost:8080/predictionSighting",
                  {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ lat, lng }),
                  }
                );
                if (!res.ok) throw new Error(HTTP ${res.status});
                const data = await res.json();

                // Flexible response handling
                let pts = [];
                console.log(data);
                if (Array.isArray(data)) {
                  // Could be [[lat,lng], ...] or [{lat,lng}, ...]
                  pts = data
                    .map(toLatLng)
                    .filter(
                      ([a, b]) => Number.isFinite(a) && Number.isFinite(b)
                    );
                } else if (Array.isArray(data?.sightings)) {
                  pts = data.sightings
                    .map(toLatLng)
                    .filter(
                      ([a, b]) => Number.isFinite(a) && Number.isFinite(b)
                    );
                } else if (Array.isArray(data?.points)) {
                  pts = data.points
                    .map(toLatLng)
                    .filter(
                      ([a, b]) => Number.isFinite(a) && Number.isFinite(b)
                    );
                } else if (
                  typeof data?.lat === "number" &&
                  typeof data?.lng === "number"
                ) {
                  pts = [[Number(data.lat), Number(data.lng)]];
                } else if (
                  typeof data?.latitude === "number" &&
                  typeof data?.longitude === "number"
                ) {
                  // Support schema with "latitude" and "longitude" keys
                  pts = [[Number(data.latitude), Number(data.longitude)]];
                }

                if (pts.length) {
                  setPredictedSightings(pts);
                  setSelected("d1"); // jump to Sighting Data tab
                  setShowDots(false); // ensure CSV doesn't override
                  // Fit map to predicted points
                  // Use earth-scale frame for Sighting Data as requested
                  setMapBounds(WORLD_BOUNDS);
                } else {
                  console.warn("predictSighting returned no points");
                }
              } catch (err) {
                console.warn("predictSighting failed:", err?.message || err);
              } finally {
                setPredicting(false);
              }
            }}
          />
        </div>
        <ToggleGroup
          variant="outline"
          className="m-auto my-2"
          type="single"
          size="lg"
          value={selected}
          onValueChange={(v) => {
            if (!v) return;
            setSelected(v);
            if (v === "d1") {
              setMapBounds(WORLD_BOUNDS);
            }
          }}
        >
          <ToggleGroupItem value="d1">
            <Shell /> Sighting Data
          </ToggleGroupItem>
          <ToggleGroupItem value="d2">
            <Thermometer /> Thermal Data
          </ToggleGroupItem>
          <ToggleGroupItem value="d3">
            <FishSymbol /> Prey Available
          </ToggleGroupItem>
          <ToggleGroupItem value="d4">
            <Beaker /> Water Quality
          </ToggleGroupItem>
          <ToggleGroupItem value="d5">
            <Map /> Migration
          </ToggleGroupItem>
          <ToggleGroupItem value="d6">
            <CloudSun /> Climate Data
          </ToggleGroupItem>
        </ToggleGroup>
        <div className="relative h-[400px]">
          {/* Ensure map stays behind UI overlays: set relative position and low z-index */}
          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            className="h-[400px] w-full rounded-md border relative z-0"
            style={{ zIndex: 0, position: "relative" }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; OpenStreetMap contributors"
            />
            {/* Apply API origin frame after map mounts */}
            <MapFrameController
              center={mapCenter}
              zoom={mapZoom}
              bounds={mapBounds}
            />
            <LayersControl position="topright">
              {selected === "d2" && enabled && (
                <LayersControl.Overlay checked name="Thermal Heatmap">
                  <HeatmapLayer
                    points={heatPoints}
                    options={{
                      radius,
                      blur: Math.round(radius * 0.8),
                      maxZoom: 9,
                      max: 1.0,
                    }}
                  />
                </LayersControl.Overlay>
              )}

              {selected === "d1" && (
                <LayersControl.Overlay checked name="Sighting Dots">
                  <CsvDotsLayer
                    points={sightingsPoints}
                    options={{ radius: dotSize, color: "#ef4444" }}
                    onPointClick={(ll) => setClickedPoint([ll.lat, ll.lng])}
                  />
                </LayersControl.Overlay>
              )}

              {selected === "d3" && (
                <LayersControl.Overlay checked name="Prey Available">
                  <>
                    {apiPreyThermal && apiPreyThermal.length > 0 ? (
                      <HeatmapLayer
                        points={apiPreyThermal.map(([la, lo, w]) => [
                          la,
                          lo,
                          Math.max(0, Math.min(1, (w ?? 1) * intensity)),
                        ])}
                        options={{
                          radius: PREY_THERMAL_PAYLOAD.thermal.options.radius,
                          blur: PREY_THERMAL_PAYLOAD.thermal.options.blur,
                          maxZoom: PREY_THERMAL_PAYLOAD.thermal.options.maxZoom,
                          max: PREY_THERMAL_PAYLOAD.thermal.options.max,
                        }}
                      />
                    ) : (
                      <CsvDotsLayer
                        points={preyPoints}
                        options={{ radius: 5, color: "#22c55e" }}
                        onPointClick={(ll) => setClickedPoint([ll.lat, ll.lng])}
                      />
                    )}
                  </>
                </LayersControl.Overlay>
              )}

              {selected === "d4" && (
                <LayersControl.Overlay checked name="Water Quality">
                  <CsvDotsLayer
                    points={waterPoints}
                    options={{ radius: 5, color: "#3b82f6" }}
                    onPointClick={(ll) => setClickedPoint([ll.lat, ll.lng])}
                  />
                </LayersControl.Overlay>
              )}

              {selected === "d5" && (
                <LayersControl.Overlay checked name="Migration Paths">
                  <>
                    <LinesLayer
                      paths={migrationPaths}
                      options={{ color: "#10b981", weight: 3 }}
                    />
                    {apiSharkActivity && apiSharkActivity.length > 0 && (
                      <SharkActivityLayer
                        points={apiSharkActivity}
                        options={{ radius: Math.max(5, dotSize + 2) }}
                        onPointClick={(ll) => setClickedPoint([ll.lat, ll.lng])}
                      />
                    )}
                    {!apiSharkActivity && (
                      // show a small hardcoded example when backend hasn't returned
                      <SharkActivityLayer
                        points={[
                          [12.5, -70.5, 1],
                          [18.0, -72.0, 2],
                          [23.0, -74.0, 3],
                        ]}
                        options={{ radius: Math.max(5, dotSize + 2) }}
                      />
                    )}
                  </>
                </LayersControl.Overlay>
              )}

              {selected === "d6" && (
                <LayersControl.Overlay checked name="Climate Heatmap">
                  <HeatmapLayer
                    points={climatePoints}
                    options={{
                      radius: Math.max(15, Math.round(radius * 0.8)),
                      blur: Math.max(12, Math.round(radius * 0.7)),
                      maxZoom: 9,
                      max: 1.0,
                      gradient: {
                        0.0: "#0b306e",
                        0.4: "#2a9df4",
                        0.7: "#f7b500",
                        1.0: "#d00000",
                      },
                    }}
                  />
                </LayersControl.Overlay>
              )}
            </LayersControl>
          </MapContainer>
        </div>
        {/* Legend displayed below the map */}
        <div className="flex justify-end">
          <MapLegend
            selected={selected}
            intensity={intensity}
            position="below"
          />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="p-2 outline rounded-md">
            <CardHeader className="text-center text-lg font-semibold text-neutral-500">
              Average Water Temperature
            </CardHeader>
            <CardContent className="scroll-m-20 mb-2 text-center text-4xl font-extrabold tracking-tight text-balance">
              25°C
            </CardContent>
          </div>
          <div className="p-2 outline rounded-md">
            <CardHeader className="text-center text-lg font-semibold text-neutral-500">
              Average Shark Population
            </CardHeader>
            <CardContent className="scroll-m-20 mb-2 text-center text-4xl font-extrabold tracking-tight text-balance">
              15
            </CardContent>
          </div>
          <div className="p-2 outline rounded-md">
            <CardHeader className="text-center text-lg font-semibold text-neutral-500">
              Shark Arrival Time
            </CardHeader>
            <CardContent className="scroll-m-20 mb-2 text-center text-4xl font-extrabold tracking-tight text-balance">
              Jan-Feb
            </CardContent>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;