from global_land_mask import globe
from geopy.distance import geodesic
import os
from typing import Dict, Any
import numpy as np
import pandas as pd

# Force-set environment variables to avoid interactive prompts in the client


# No external ocean APIs used; we derive values from a local CSV for MVP

def normalize_lon(lon: float) -> float:
    """Convert longitude to 0–360 if negative."""
    return lon + 360 if lon < 0 else lon

def clamp_lat(lat: float) -> float:
    """Clamp latitude to dataset range (-80 to 90)."""
    return max(min(lat, 90), -80)

def estimate_ocean_params(lat: float, lon: float, depth: float = 0.0) -> Dict[str, Any]:
    """
    Estimate ocean parameters when API fails.
    Uses basic physical models for temperature and salinity.
    """
    # Estimate temperature based on latitude (warmer at equator, colder at poles)
    base_temp = 30 * (1 - abs(lat) / 90)  # 30°C at equator, 0°C at poles
    
    # Add seasonal variation (assuming Northern Hemisphere summer)
    month = np.datetime64('now').astype('datetime64[M]').astype(int) % 12 + 1
    seasonal_temp = base_temp + 5 * np.sin((month - 6) * np.pi / 6)  # ±5°C seasonal variation
    
    # Adjust for depth (temperature decreases with depth)
    depth_temp = max(2, seasonal_temp - (depth / 100))  # -1°C per 100m, minimum 2°C
    
    # Estimate salinity (global average ~35 PSU, slightly higher in tropics)
    salinity = 35 + (1 - abs(lat) / 45)  # 36 PSU at equator, 35 PSU at ±45°
    
    return {
        "latitude": lat,
        "longitude": lon,
        "depth_m": depth,
        "salinity_psu": salinity,
        "time_used": str(np.datetime64('now')),
        "is_estimated": True
    }

def nearest_shore_distance_km(lat: float, lon: float, step: float = 0.25, max_radius: float = 3.0) -> float:
    """Approximate nearest shore distance using globe.is_land. Searches outward rings up to max_radius degrees."""
    if globe.is_land(lat, lon):
        return 0.0
    found = None
    r = step
    while r <= max_radius and not found:
        samples = []
        for dlat in np.arange(-r, r + step, step):
            samples.append((lat + dlat, lon - r))
            samples.append((lat + dlat, lon + r))
        for dlon in np.arange(-r + step, r, step):
            samples.append((lat - r, lon + dlon))
            samples.append((lat + r, lon + dlon))
        for s_lat, s_lon in samples:
            if globe.is_land(s_lat, s_lon):
                found = (s_lat, s_lon)
                break
        r += step
    if found:
        return geodesic((lat, lon), found).km
    return float('nan')

_SHARK_DF: pd.DataFrame | None = None

def _load_shark_df() -> pd.DataFrame:
    global _SHARK_DF
    if _SHARK_DF is None:
        csv_path = os.path.join(os.path.dirname(__file__), "shark_subset_250_rows_till_K.csv")
        _SHARK_DF = pd.read_csv(csv_path)
    return _SHARK_DF

def _nearest_row(lat: float, lon: float) -> Dict[str, Any]:
    """Return the nearest row from the shark subset CSV to the input lat/lon."""
    df = _load_shark_df()
    # Iterate to find minimal geodesic distance (250 rows => fast enough)
    min_dist = float("inf")
    best = None
    for _, row in df.iterrows():
        d = geodesic((lat, lon), (row["decimalLatitude"], row["decimalLongitude"]))
        if d.km < min_dist:
            min_dist = d.km
            best = row
    if best is None:
        raise ValueError("No data rows found in shark subset CSV")
    return {
        "latitude": float(best["decimalLatitude"]),
        "longitude": float(best["decimalLongitude"]),
        "bathymetry": float(best["bathymetry"]) if not pd.isna(best["bathymetry"]) else np.nan,
        "sst": float(best["sst"]) if not pd.isna(best["sst"]) else np.nan,
        "sss": float(best["sss"]) if not pd.isna(best["sss"]) else np.nan,
        "shoredistance": float(best["shoredistance"]) if not pd.isna(best["shoredistance"]) else np.nan,
        "nearest_distance_km": float(min_dist)
    }

def get_nearest_csv_features(lat: float, lon: float) -> Dict[str, float]:
    """Return only the feature columns from the nearest CSV row for model input."""
    row = _nearest_row(lat, lon)
    return {
        "bathymetry": float(row["bathymetry"]) if not np.isnan(row["bathymetry"]) else np.nan,
        "sst": float(row["sst"]) if not np.isnan(row["sst"]) else np.nan,
        "sss": float(row["sss"]) if not np.isnan(row["sss"]) else np.nan,
        "shoredistance": float(row["shoredistance"]) if not np.isnan(row["shoredistance"]) else np.nan,
    }

def get_bathymetry(lat: float, lon: float) -> float:
    """Bathymetry (positive depth meters) from CSV. Fallback: heuristic by coast distance."""
    try:
        row = _nearest_row(lat, lon)
        bathy_val = row["bathymetry"]
        if not np.isnan(bathy_val):
            # Ensure positive depth convention; server negates when needed
            return abs(bathy_val)
    except Exception:
        pass
    # Heuristic fallback based on distance to shore
    dist_km = nearest_shore_distance_km(lat, lon)
    if np.isnan(dist_km):
        return 4000.0
    if dist_km < 20:
        return 50.0
    if dist_km < 200:
        return 200.0
    if dist_km < 600:
        return 1000.0
    return 4000.0

def get_ocean_params(lat: float, lon: float, depth: float = 0.0, time: str = "latest"):
    """
    CSV-backed parameters from nearest row in shark_subset_250_rows_till_K.csv.
    Returns: { latitude, longitude, depth_m (negative), salinity_psu, temperature_C, shore_distance_km, time_used }
    """
    row = _nearest_row(lat, lon)
    depth_m = get_bathymetry(lat, lon)
    # Salinity direct
    salinity = row["sss"] if not np.isnan(row["sss"]) else estimate_ocean_params(lat, lon, depth)["salinity_psu"]
    # Temperature direct from CSV if present
    temperature = row["sst"] if not np.isnan(row["sst"]) else None
    # Shore distance likely in meters in CSV; convert to km if finite
    shore_km = None
    if not np.isnan(row["shoredistance"]):
        shore_km = row["shoredistance"] / 1000.0
    return {
        "latitude": float(row.get("latitude", row["decimalLatitude"])),
        "longitude": float(row.get("longitude", row["decimalLongitude"])),
        "depth_m": float(depth_m),
        "salinity_psu": float(salinity),
        "temperature_C": float(temperature) if temperature is not None else np.nan,
        "shore_distance_km": float(shore_km) if shore_km is not None else np.nan,
        "time_used": str(time)
    }


