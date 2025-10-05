#  * {
#  *   // d1: Sighting Data
#  *   sightings: Array<{ lat: number, lng: number, label?: string, ts?: string }>,
#  *
#  *   // d2: Thermal Data (heatmap)
#  *   thermal: {
#  *     points: Array<[lat: number, lng: number, weight?: number]>, // weight in [0..1]
#  *     options?: { radius?: number, blur?: number, maxZoom?: number, max?: number, gradient?: Record<number,string> }
#  *   },
#  *
#  *   // d3: Prey Available (points or heat)
#  *   prey: Array<{ lat: number, lng: number, abundance?: number }>,
#  *
#  *   // d4: Water Quality (points with index)
#  *   waterQuality: Array<{ lat: number, lng: number, index: number }>, // index normalized [0..1]
#  *
#  *   // d5: Migration (paths)
#  *   migration: Array<Array<[lat: number, lng: number]>>,
#  *
#  *   // d6: Climate Data (alt heatmap)
#  *   climate: {
#  *     points: Array<[lat: number, lng: number, weight?: number]>,
#  *     options?: { radius?: number, blur?: number, gradient?: Record<number,string> }
#  *   }
#  * }

import os

os.environ["COPERNICUSMARINE_SERVICE_USERNAME"] = "patelparam1306@gmail.com"
os.environ["COPERNICUSMARINE_SERVICE_PASSWORD"] = "qK6d~qDbsW)ases"



from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Tuple
import random
import datetime
import pandas as pd
import joblib
from presence import predict

import asyncio
from geopy.distance import geodesic
from geopy.point import Point
import xarray as xr
import numpy as np
from shapely.geometry import Point as ShapelyPoint
from shapely.geometry.polygon import Polygon

from global_land_mask import globe
from ocean_utils import get_nearest_csv_features, get_bathymetry
import numpy as np

def _wrap_lon(lon: float) -> float:
    """Wrap longitude to [-180, 180]."""
    if lon > 180:
        return lon - 360
    if lon < -180:
        return lon + 360
    return lon

def is_ocean_location(latitude, longitude):
    """
    Checks if the given latitude and longitude are over the ocean.

    Args:
        latitude (float): The latitude of the point.
        longitude (float): The longitude of the point.

    Returns:
        bool: True if the point is over the ocean, False if it's over land.
    """
    # Normalize longitude for globe.is_land to avoid ValueError for > 180
    lon_norm = _wrap_lon(float(longitude))
    lat_norm = float(latitude)
    return not globe.is_land(lat_norm, lon_norm)

async def generate_grid_points():
    """
    Generate a grid of points between Arctic and Antarctic circles.
    Arctic Circle: 66.5°N
    Antarctic Circle: 66.5°S
    """
    lat_step = 2  # 2 degree steps for latitude
    lon_step = 2  # 2 degree steps for longitude
    
    # Generate points
    lats = np.arange(-66.5, 66.5, lat_step)
    lons = np.arange(-180, 180, lon_step)
    
    points = []
    for lat in lats:
        for lon in lons:
            if is_ocean_location(lat, lon):
                try:
                    # Use nearest CSV features for model inputs
                    feats = get_nearest_csv_features(lat, lon)
                    # Bathymetry in model is expected negative; our helper returns positive meters
                    bathy_pos_m = get_bathymetry(lat, lon)
                    points.append({
                        "decimalLatitude": lat,
                        "decimalLongitude": lon,
                        "month": datetime.datetime.now().month,
                        "bathymetry": -abs(bathy_pos_m),
                        "sst": feats.get("sst", np.nan),
                        "sss": feats.get("sss", np.nan),
                        "shoredistance": feats.get("shoredistance", np.nan)
                    })
                except Exception as e:
                    print(f"Error getting CSV-derived data for {lat}, {lon}: {str(e)}")
                    continue
    
    return points


# API Configuration
GEBCO_API_KEY = os.getenv('GEBCO_API_KEY')

# Copernicus Marine Service endpoints
TEMPERATURE_VARIABLE = "thetao"  # Conservative Temperature
SALINITY_VARIABLE = "so"  # Absolute Salinity

# Whale shark habitat prediction constants
WHALE_SHARK_MAX_NORTH_LAT = 30.0
WHALE_SHARK_MAX_SOUTH_LAT = -35.0
LAT_STEP = 10.0
LON_STEP = 10.0

class TestCase(BaseModel):
    """Structure for whale shark habitat test case"""
    decimalLatitude: float
    decimalLongitude: float
    month: int
    bathymetry: float
    sst: float  # sea surface temperature
    sss: float  # sea surface salinity
    shoredistance: float
    case_name: str

class TestCase2(BaseModel):
    """Structure for shark activity test case"""
    decimalLatitude: float
    decimalLongitude: float
    bathymetry: float
    shoredistance: float
    case_name: Optional[str] = None

# class PredictionResult(BaseModel):
#     """Defines the structure for a single location prediction."""
#     latitude: float
#     longitude: float
#     model_output_label: int
#     prediction: str
#     is_possible_habitat: bool
#     reason: str
#     ocean_data: OceanData

# class SimulatedHabitatPredictor:
#     """Simulates a machine learning model for whale shark habitat prediction."""
#     def predict(self, data: List[List[float]], ocean_data: OceanData) -> int:
#         lat, lon = data[0]  # We now process one location at a time
#         is_possible_habitat = False
        
#         # Basic latitude check
#         if WHALE_SHARK_MAX_SOUTH_LAT <= lat <= WHALE_SHARK_MAX_NORTH_LAT:
#             # Check oceanographic conditions
#             if (ocean_data.depth < -50 and  # Prefer deeper waters
#                 18 <= ocean_data.temperature <= 30 and  # Optimal temperature range
#                 33 <= ocean_data.salinity <= 36 and  # Normal ocean salinity
#                 ocean_data.shoredistance < 200):  # Within 200km of shore
                
#                 is_possible_habitat = True
                
#                 # Still check for major landmasses
#                 if (lon > -100 and lon < -50) and (lat > 20 and lat < 50):  # North America
#                     is_possible_habitat = False
#                 elif (lon > -10 and lon < 100) and (lat > -10 and lat < 40):  # Afro-Eurasia
#                     if (lon > 10 and lon < 40) and (lat > 10 and lat < 30):  # Sahara/Arabia
#                         is_possible_habitat = False
        
#         return 1 if is_possible_habitat else 0

# Initialize the predictor
# LOADED_MODEL = SimulatedHabitatPredictor()

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

@app.get("/get")
def getData():
    def random_lat():
        return round(random.uniform(25.0, 49.0), 6)
    
    def random_lng():
        return round(random.uniform(-125.0, -66.0), 6)
    
    def random_timestamp():
        base_time = datetime.datetime.now()
        random_days = random.randint(-30, 0)
        random_time = base_time + datetime.timedelta(days=random_days)
        return random_time.isoformat()
    
    # Generate random data for each category
    data = {
        # Random map origin point
        "origin": {
            "lat": random_lat(),
            "lng": random_lng(),
            "zoom": random.randint(3, 7)  # Random zoom level between 3-7 for different view scales
        },
        
        # d1: Sighting Data
        "sightings": [
            {
                "lat": random_lat(),
                "lng": random_lng(),
                "label": random.choice(["Bird Sighting", "Migration Event", "Feeding Area", "Nesting Site"]),
                "ts": random_timestamp()
            }
            for _ in range(random.randint(5, 15))
        ],
        
        # d2: Thermal Data (heatmap)
        "thermal": {
            "points": [
                [random_lat(), random_lng(), round(random.random(), 3)]
                for _ in range(random.randint(20, 50))
            ],
            "options": {
                "radius": random.randint(15, 25),
                "blur": random.randint(10, 20),
                "maxZoom": random.randint(10, 18),
                "max": round(random.uniform(0.8, 1.0), 2),
                "gradient": {
                    0.0: "blue",
                    0.2: "cyan",
                    0.4: "lime",
                    0.6: "yellow",
                    0.8: "orange",
                    1.0: "red"
                }
            }
        },
        
        # d3: Prey Available (points or heat)
        "prey": [
            {
                "lat": random_lat(),
                "lng": random_lng(),
                "abundance": round(random.random(), 3)
            }
            for _ in range(random.randint(10, 30))
        ],
        
        # d4: Water Quality (points with index)
        "waterQuality": [
            {
                "lat": random_lat(),
                "lng": random_lng(),
                "index": round(random.random(), 3)
            }
            for _ in range(random.randint(8, 20))
        ],
        
        # d5: Migration (paths)
        "migration": [
            [
                [random_lat(), random_lng()]
                for _ in range(random.randint(3, 8))
            ]
            for _ in range(random.randint(2, 5))
        ],
        
        # d6: Climate Data (alt heatmap)
        "climate": {
            "points": [
                [random_lat(), random_lng(), round(random.random(), 3)]
                for _ in range(random.randint(15, 40))
            ],
            "options": {
                "radius": random.randint(20, 30),
                "blur": random.randint(12, 22),
                "gradient": {
                    0.0: "green",
                    0.3: "yellow",
                    0.7: "orange",
                    1.0: "red"
                }
            }
        }
    }
    
    return data

class LocationData(BaseModel):
    lat: float
    lng: float

# @app.post("/predictSighting1")
# def predictSighting(location: LocationData):
#     # Call the predict function with the provided coordinates
#     prediction_result = predict(location.lat, location.lng)
    
#     return {
#         "location": location,
#         "prediction": prediction_result
#     }

# async def model_predict(lat: float, lon: float) -> PredictionResult:
#     """Predicts whale shark habitat suitability for a given location."""
#     # Get oceanographic data
#     ocean_data = await get_ocean_data(lat, lon)
    
#     # Make prediction using both location and ocean data
#     input_data = [[lat, lon]]
#     model_output = LOADED_MODEL.predict(input_data, ocean_data)
    
#     is_possible_habitat = model_output == 1
    
#     if is_possible_habitat:
#         prediction_str = "Possible Whale Shark Habitat"
#         reason_str = (f"Location is within known range, temperature {ocean_data.temperature}°C, "
#                      f"depth {abs(ocean_data.depth)}m, {ocean_data.shoredistance}km from shore")
#     else:
#         prediction_str = "Unsuitable Habitat"
#         reason_str = ("Location is either outside temperature range, too shallow, "
#                      "too far from shore, or over major landmass")

#     return PredictionResult(
#         latitude=round(lat, 2),
#         longitude=round(lon, 2),
#         model_output_label=model_output,
#         prediction=prediction_str,
#         is_possible_habitat=is_possible_habitat,
#         reason=reason_str,
#         ocean_data=ocean_data
#     )

# class TorridZonePredictionResponse(BaseModel):
#     """Response model for torrid zone predictions"""
#     total_locations_checked: int
#     possible_habitat_count: int
#     results: List[PredictionResult]

@app.post("/predictionSighting")
async def predictSighting2():
    """
    Run whale shark habitat predictions on predefined test cases.
    Returns only the locations where whale sharks might be present.
    """
    possible_habitats: List[dict] = []
    test_cases = [
        TestCase(
            decimalLatitude=20.0, decimalLongitude=-80.0, month=6,
            bathymetry=500, sst=28.5, sss=35.0, shoredistance=150,
            case_name="Caribbean Habitat (Expected 1)"
        ),
        TestCase(
            decimalLatitude=0.0, decimalLongitude=-15.0, month=12,
            bathymetry=4000, sst=27.0, sss=34.5, shoredistance=2500,
            case_name="Central Atlantic (Expected 0)"
        ),
        TestCase(
            decimalLatitude=50.0, decimalLongitude=0.0, month=3,
            bathymetry=1000, sst=15.0, sss=33.0, shoredistance=500,
            case_name="Too Far North (Expected 0)"
        ),
        TestCase(
            decimalLatitude=-70.0, decimalLongitude=100.0, month=8,
            bathymetry=4500, sst=5.0, sss=32.0, shoredistance=1000,
            case_name="Too Far South (Expected 0)"
        ),
        TestCase(
            decimalLatitude=25.0, decimalLongitude=-95.0, month=7,
            bathymetry=100, sst=29.0, sss=36.0, shoredistance=10,
            case_name="North America Landmass (Expected 0)"
        ),
        TestCase(
            decimalLatitude=25.0, decimalLongitude=10.0, month=9,
            bathymetry=50, sst=30.0, sss=38.0, shoredistance=5,
            case_name="Afro-Eurasia Landmass (Expected 0)"
        ),
        TestCase(
            decimalLatitude=30.0, decimalLongitude=-150.0, month=5,
            bathymetry=3500, sst=20.0, sss=34.0, shoredistance=1000,
            case_name="North Pacific Cold Water (Expected 0)"
        ),
        TestCase(
            decimalLatitude=30.0, decimalLongitude=-120.0, month=5,
            bathymetry=100, sst=22.0, sss=35.0, shoredistance=50,
            case_name="Sea of Cortez (Expected 1)"
        ),
        TestCase(
            decimalLatitude=-35.0, decimalLongitude=-10.0, month=1,
            bathymetry=200, sst=20.0, sss=34.5, shoredistance=500,
            case_name="South Atlantic Edge (Expected 1)"
        ),
        TestCase(
            decimalLatitude=-35.0, decimalLongitude=-40.0, month=1,
            bathymetry=3500, sst=18.0, sss=34.0, shoredistance=1500,
            case_name="South Atlantic Cold Exclusion (Expected 0)"
        ),
        TestCase(
            decimalLatitude=10.0, decimalLongitude=-125.0, month=4,
            bathymetry=4500, sst=26.5, sss=33.5, shoredistance=1500,
            case_name="Deep Eastern Pacific Exclusion (Expected 0)"
        ),
        TestCase(
            decimalLatitude=10.0, decimalLongitude=175.0, month=11,
            bathymetry=5000, sst=28.0, sss=35.5, shoredistance=3000,
            case_name="Central Pacific Exclusion (Expected 0)"
        ),
        TestCase(
            decimalLatitude=-20.0, decimalLongitude=15.0, month=2,
            bathymetry=100, sst=26.0, sss=35.0, shoredistance=20,
            case_name="Coastal South Africa (Expected 1)"
        ),
        TestCase(
            decimalLatitude=15.0, decimalLongitude=120.0, month=4,
            bathymetry=50, sst=29.0, sss=34.0, shoredistance=10,
            case_name="Philippines Feeding Ground (Expected 1)"
        ),
        TestCase(
            decimalLatitude=-10.0, decimalLongitude=-100.0, month=8,
            bathymetry=1000, sst=24.0, sss=34.8, shoredistance=500,
            case_name="Mid-Range Ocean (Expected 1)"
        ),
        # New test cases
        TestCase(
            decimalLatitude=5.0, decimalLongitude=80.0, month=5,
            bathymetry=200, sst=29.5, sss=34.8, shoredistance=30,
            case_name="Sri Lanka Coastal (Expected 1)"
        ),
        TestCase(
            decimalLatitude=-25.0, decimalLongitude=135.0, month=1,
            bathymetry=150, sst=27.0, sss=35.0, shoredistance=20,
            case_name="Northern Australia Coastal (Expected 1)"
        ),
        TestCase(
            decimalLatitude=28.0, decimalLongitude=140.0, month=7,
            bathymetry=5000, sst=25.0, sss=34.0, shoredistance=2000,
            case_name="Open Pacific (Expected 0)"
        ),
        TestCase(
            decimalLatitude=-15.0, decimalLongitude=-45.0, month=11,
            bathymetry=400, sst=26.0, sss=35.0, shoredistance=60,
            case_name="Brazilian Coast (Expected 1)"
        ),
        TestCase(
            decimalLatitude=-5.0, decimalLongitude=150.0, month=3,
            bathymetry=250, sst=28.5, sss=35.5, shoredistance=40,
            case_name="Papua New Guinea (Expected 1)"
        ),
        TestCase(
            decimalLatitude=32.0, decimalLongitude=-160.0, month=6,
            bathymetry=4000, sst=19.0, sss=34.0, shoredistance=1800,
            case_name="North Pacific Too Cold (Expected 0)"
        ),
        TestCase(
            decimalLatitude=-32.0, decimalLongitude=25.0, month=4,
            bathymetry=300, sst=21.0, sss=35.0, shoredistance=50,
            case_name="South Africa Edge (Expected 1)"
        ),
        TestCase(
            decimalLatitude=12.0, decimalLongitude=40.0, month=9,
            bathymetry=150, sst=30.0, sss=36.0, shoredistance=20,
            case_name="Red Sea (Expected 1)"
        ),
        TestCase(
            decimalLatitude=-2.0, decimalLongitude=-30.0, month=10,
            bathymetry=3000, sst=27.5, sss=34.7, shoredistance=1000,
            case_name="Equatorial Atlantic Open (Expected 0)"
        ),
        TestCase(
            decimalLatitude=18.0, decimalLongitude=-60.0, month=6,
            bathymetry=200, sst=28.0, sss=35.0, shoredistance=80,
            case_name="Eastern Caribbean (Expected 1)"
        )
    ]

    # Expected outputs
    expected_outputs = [
        1,0,0,0,0,0,0,1,1,0,0,0,1,1,1,  # original 15
        1,1,0,1,1,0,1,1,0,1              # new 10
    ]

    # Check is_ocean first, then predict only for those
    ocean_cases = []
    for case in test_cases:
        lon = _wrap_lon(case.decimalLongitude)
        if is_ocean_location(case.decimalLatitude, lon):
            ocean_cases.append((case, lon))

    # Early return if nothing to predict
    if not ocean_cases:
        return []

    # Build DataFrame only for ocean points (keep column order expected by the model)
    df_ocean = pd.DataFrame([
        {
            "decimalLatitude": case.decimalLatitude,
            "decimalLongitude": lon,
            "month": case.month,
            "bathymetry": case.bathymetry,
            "sst": case.sst,
            "sss": case.sss,
            "shoredistance": case.shoredistance,
        }
        for case, lon in ocean_cases
    ])

    # Load model and make predictions only for ocean points
    model = joblib.load("./presence_model.pkl")
    predictions = model.predict(df_ocean)

    # Collect only positive predictions
    possible_habitats = []
    for (case, lon), pred in zip(ocean_cases, predictions):
        if int(pred) == 1:
            possible_habitats.append({
                "lat": case.decimalLatitude,
                "lng": lon,
                "bathymetry": case.bathymetry,
                "temperature": case.sst,
                "salinity": case.sss,
                "shoredistance": case.shoredistance
            })
    
    # Build dummy availability data to demonstrate other signals (pred = 1/2/3)
    base_lat = float(possible_habitats[0]["lat"])
    base_lng = float(possible_habitats[0]["lng"])
    offsets = [(0.00, 0.00), (0.15, -0.12), (-0.10, 0.20)]
    for pred_val in (1, 2, 3):
        for dx, dy in offsets:
            lat = max(-85.0, min(85.0, base_lat + dx + random.uniform(-0.05, 0.05)))
            lng = _wrap_lon(base_lng + dy + random.uniform(-0.05, 0.05))

        

    # Return activity results along with availability demo data
    return {"activity": possible_habitats}

@app.post("/sharkActivity")
async def sharkAct():
    """
    Run whale shark habitat predictions on predefined test cases.
    Returns only the locations where whale sharks might be present.
    """
    possible_habitats: List[dict] = []
    test_cases = [
        TestCase2(decimalLatitude=-10.0, decimalLongitude=95.0,  bathymetry=50.0,   shoredistance=10.0),
        TestCase2(decimalLatitude=15.0,  decimalLongitude=-137.0, bathymetry=4000.0,  shoredistance=180.0),
        TestCase2(decimalLatitude=-22.0, decimalLongitude=108.0, bathymetry=600.0,  shoredistance=200.0),
        TestCase2(decimalLatitude=5.0,   decimalLongitude=115.0, bathymetry=150.0,  shoredistance=30.0),
        TestCase2(decimalLatitude=18.0,  decimalLongitude=121.0, bathymetry=400.0,  shoredistance=120.0),

        TestCase2(decimalLatitude=-30.0, decimalLongitude=128.0, bathymetry=250.0,  shoredistance=60.0),
        TestCase2(decimalLatitude=8.0,   decimalLongitude=134.0, bathymetry=2000.0, shoredistance=900.0),
        TestCase2(decimalLatitude=22.0,  decimalLongitude=141.0, bathymetry=120.0,  shoredistance=15.0),
        TestCase2(decimalLatitude=-12.0, decimalLongitude=147.0, bathymetry=3500.0, shoredistance=1500.0),
        TestCase2(decimalLatitude=28.0,  decimalLongitude=153.0, bathymetry=500.0,  shoredistance=300.0),

        TestCase2(decimalLatitude=-40.0, decimalLongitude=160.0, bathymetry=700.0,  shoredistance=400.0),
        TestCase2(decimalLatitude=15.0,  decimalLongitude=166.0, bathymetry=80.0,   shoredistance=5.0),
        TestCase2(decimalLatitude=5.0,   decimalLongitude=172.0, bathymetry=22.0,  shoredistance=70.0),
        TestCase2(decimalLatitude=-18.0, decimalLongitude=1.0, bathymetry=3000.0, shoredistance=1200.0),
        TestCase2(decimalLatitude=32.0,  decimalLongitude=-175.0,bathymetry=4000.0, shoredistance=1800.0),

        TestCase2(decimalLatitude=-25.0, decimalLongitude=-169.0,bathymetry=180.0,  shoredistance=40.0),
        TestCase2(decimalLatitude=10.0,  decimalLongitude=-162.0,bathymetry=90.0,   shoredistance=8.0),
        TestCase2(decimalLatitude=45.0,  decimalLongitude=-156.0,bathymetry=600.0,  shoredistance=250.0),
        TestCase2(decimalLatitude=-5.0,  decimalLongitude=-149.0,bathymetry=1500.0, shoredistance=700.0),
        TestCase2(decimalLatitude=38.0,  decimalLongitude=-143.0,bathymetry=200.0,  shoredistance=50.0),

        TestCase2(decimalLatitude=-15.0, decimalLongitude=-137.0,bathymetry=75.0,   shoredistance=3.0),
        TestCase2(decimalLatitude=20.0,  decimalLongitude=-130.0,bathymetry=900.0,  shoredistance=300.0),
        TestCase2(decimalLatitude=-8.0,  decimalLongitude=-124.0,bathymetry=2800.0, shoredistance=1200.0),
        TestCase2(decimalLatitude=50.0,  decimalLongitude=-118.0,bathymetry=600.0,  shoredistance=200.0),
        TestCase2(decimalLatitude=-35.0, decimalLongitude=-111.0,bathymetry=320.0,  shoredistance=100.0),

        TestCase2(decimalLatitude=12.0,  decimalLongitude=-105.0,bathymetry=220.0,  shoredistance=60.0),
        TestCase2(decimalLatitude=-2.0,  decimalLongitude=-99.0, bathymetry=180.0,  shoredistance=20.0),
        TestCase2(decimalLatitude=25.0,  decimalLongitude=-92.0, bathymetry=500.0,  shoredistance=150.0),
        TestCase2(decimalLatitude=-28.0, decimalLongitude=-86.0, bathymetry=1200.0, shoredistance=500.0),
        TestCase2(decimalLatitude=40.0,  decimalLongitude=-80.0, bathymetry=300.0,  shoredistance=90.0),

        TestCase2(decimalLatitude=-10.0, decimalLongitude=-74.0, bathymetry=2500.0, shoredistance=1000.0),
        TestCase2(decimalLatitude=30.0,  decimalLongitude=-68.0, bathymetry=850.0,  shoredistance=350.0),
        TestCase2(decimalLatitude=-22.0, decimalLongitude=-62.0, bathymetry=200.0,  shoredistance=30.0),
        TestCase2(decimalLatitude=15.0,  decimalLongitude=-56.0, bathymetry=100.0,  shoredistance=10.0),
        TestCase2(decimalLatitude=-40.0, decimalLongitude=-50.0, bathymetry=3000.0, shoredistance=150.0),

        TestCase2(decimalLatitude=5.0,   decimalLongitude=-44.0, bathymetry=600.0,  shoredistance=220.0),
        TestCase2(decimalLatitude=18.0,  decimalLongitude=-38.0, bathymetry=320.0,  shoredistance=75.0),
        TestCase2(decimalLatitude=-12.0, decimalLongitude=-32.0, bathymetry=50.0,   shoredistance=5.0),
        TestCase2(decimalLatitude=28.0,  decimalLongitude=-26.0, bathymetry=1400.0, shoredistance=600.0),
        TestCase2(decimalLatitude=-5.0,  decimalLongitude=-20.0, bathymetry=2200.0, shoredistance=900.0),

        TestCase2(decimalLatitude=35.0,  decimalLongitude=-14.0, bathymetry=180.0,  shoredistance=25.0),
        TestCase2(decimalLatitude=-18.0, decimalLongitude=-8.0,  bathymetry=900.0,  shoredistance=400.0),
        TestCase2(decimalLatitude=42.0,  decimalLongitude=-2.0,  bathymetry=700.0,  shoredistance=280.0),
        TestCase2(decimalLatitude=-25.0, decimalLongitude=4.0,   bathymetry=300.0,  shoredistance=50.0),
        TestCase2(decimalLatitude=20.0,  decimalLongitude=10.0,  bathymetry=60.0,   shoredistance=12.0),

        TestCase2(decimalLatitude=-30.0, decimalLongitude=16.0,  bathymetry=3500.0, shoredistance=1600.0),
        TestCase2(decimalLatitude=8.0,   decimalLongitude=22.0,  bathymetry=450.0,  shoredistance=100.0),
        TestCase2(decimalLatitude=25.0,  decimalLongitude=28.0,  bathymetry=120.0,  shoredistance=15.0),
        TestCase2(decimalLatitude=-12.0, decimalLongitude=34.0,  bathymetry=220.0,  shoredistance=70.0),
        TestCase2(decimalLatitude=32.0,  decimalLongitude=40.0,  bathymetry=3000.0, shoredistance=1400.0),
    ]

    # Check is_ocean first, then predict only for those
    ocean_cases = []
    for case in test_cases:
        lon = _wrap_lon(case.decimalLongitude)
        if is_ocean_location(case.decimalLatitude, lon):
            ocean_cases.append((case, lon))

    if not ocean_cases:
        return []

    # Build data for activity model in the expected order: [depth, lat, lon, shore]
    X = [
        [case.bathymetry, case.decimalLatitude, lon, case.shoredistance]
        for case, lon in ocean_cases
    ]

    # Load model and make predictions (cache model for speed)
    global ACTIVITY_MODEL
    try:
        ACTIVITY_MODEL
    except NameError:
        ACTIVITY_MODEL = None
    if ACTIVITY_MODEL is None:
        ACTIVITY_MODEL = joblib.load("./shark_activity.pkl")
    model = ACTIVITY_MODEL
    predictions = model.predict(X)
    # Return only positives (these are already ocean points)
    possible_habitats = []
    for (case, lon), pred in zip(ocean_cases, predictions):
        if int(pred) == 1:
            possible_habitats.append({
                "lat": case.decimalLatitude,
                "lng": lon,
                "bathymetry": case.bathymetry,
                "shoredistance": case.shoredistance,
                "prediction": int(pred)
            })
    availability = [
        {"lat": 20.0, "lng": -80.0, "pred": 1},
        {"lat": 20.2, "lng": -80.3, "pred": 1},
        {"lat": 19.9, "lng": -80.1, "pred": 1},
        {"lat": 15.0, "lng": 120.0, "pred": 0},
        {"lat": 15.1, "lng": 120.2, "pred": 0},
        {"lat": 14.9, "lng": 119.8, "pred": 0},
        {"lat": -15.0, "lng": 45.0, "pred": 2},
        {"lat": -15.2, "lng": 45.2, "pred": 2},
        {"lat": -14.8, "lng": 44.8, "pred": 2},
    ]

    possible_habitats = [*possible_habitats, *availability]

    # Return only the array of positive predictions
    return possible_habitats

@app.post("/predictionSighting")
async def predict_global_habitats():
    """
    Predict whale shark habitats across the globe between Arctic and Antarctic circles.
    Only returns locations that are:
    1. In the ocean (not on land)
    2. Have suitable oceanographic conditions
    3. Predicted as suitable by the model
    """
    # Load model
    model = joblib.load("./presence_model.pkl")
    
    # Generate grid points and get their ocean parameters
    grid_points = await generate_grid_points()
    
    # Make predictions for all points
    possible_habitats = []
    for point in grid_points:
        try:
            prediction = model.predict([[
                point["decimalLatitude"],
                point["decimalLongitude"],
                point["month"],
                point["bathymetry"],
                point["sst"],
                point["sss"],
                point["shoredistance"]
            ]])[0]
            
            if prediction == 1:
                possible_habitats.append({
                    "lat": point["decimalLatitude"],
                    "lng": point["decimalLongitude"],
                    "bathymetry": point["bathymetry"],
                    "temperature": point["sst"],
                    "salinity": point["sss"],
                    "shoredistance": point["shoredistance"]
                })
        except Exception as e:
            print(f"Error making prediction for {point['decimalLatitude']}, {point['decimalLongitude']}: {str(e)}")
            continue
    
    return {
        "total_points_checked": len(grid_points),
        "possible_habitats": possible_habitats,
        "points_count": len(possible_habitats)
    }

@app.post("/getMigration")
async def getMigrate():
    model = joblib.load("./presence_model.pkl")
    # Build candidate points by using results from predictSighting2 as input sightings
    base_points = await predictSighting2()
    # Defaults for sampling
    month = datetime.datetime.now().month
    min_km = 30.0
    max_km = 200.0
    samples_per_base = 5  # exactly 5 points around each current location

    best_points = []
    # Use up to 50 base points to keep it fast
    for s in base_points[:50]:
        src_lat = float(s.get("lat"))
        src_lng = _wrap_lon(float(s.get("lng")))
        src = Point(src_lat, src_lng)

        # Collect up to 5 valid ocean candidates around this source
        local_candidates = []
        attempts = 0
        # Cap attempts to avoid long loops if many land hits
        while len(local_candidates) < samples_per_base and attempts < samples_per_base * 4:
            attempts += 1
            dist_km = random.uniform(min_km, max_km)
            bearing = random.uniform(0, 360)
            dest = geodesic(kilometers=dist_km).destination(src, bearing)
            lat = float(dest.latitude)
            lon = _wrap_lon(float(dest.longitude))

            # Ocean-only filter
            if not is_ocean_location(lat, lon):
                continue

            try:
                feats = get_nearest_csv_features(lat, lon)
                bathy_pos_m = get_bathymetry(lat, lon)
                local_candidates.append({
                    "decimalLatitude": lat,
                    "decimalLongitude": lon,
                    "month": month,
                    "bathymetry": -abs(bathy_pos_m),
                    "sst": feats.get("sst", np.nan),
                    "sss": feats.get("sss", np.nan),
                    "shoredistance": feats.get("shoredistance", np.nan)
                })
            except Exception:
                continue

        if not local_candidates:
            continue

        df = pd.DataFrame(local_candidates).dropna()
        if df.empty:
            continue

        # Score these 5 (or fewer) points and pick the best
        try:
            probs = model.predict_proba(df)[:, 1]
        except Exception:
            preds = model.predict(df)
            probs = np.array(preds, dtype=float)

        idx = int(np.argmax(probs))
        best_points.append({
            "lat": float(df.iloc[idx]["decimalLatitude"]),
            "lng": float(df.iloc[idx]["decimalLongitude"]),
            "prob": float(probs[idx]),
            "src": {"lat": src_lat, "lng": src_lng}
        })

    # Return the best candidate around each base point as a heatmap-compatible payload
    points = [
        [float(bp["lat"]), float(bp["lng"]), float(max(0.0, min(1.0, bp["prob"])))]
        for bp in best_points
    ]
    # Boost intensity and derive radius/blur from boosted probabilities
    if points:
        base_weights = [p[2] for p in points]
        # Boost weaker signals and cap at 1.0 for a stronger heatmap
        boosted_weights = [float(min(1.0, max(0.0, 0.12 + 1.35 * w))) for w in base_weights]
        # Replace weights with boosted weights
        for i, bw in enumerate(boosted_weights):
            points[i][2] = bw

        mean_w = float(np.mean(boosted_weights))
        # Stronger visual: widen radius/blur ranges
        radius = int(round(24 + 14 * mean_w))   # 24..38 as mean_w goes 0..1
        blur = int(round(16 + 10 * mean_w))     # 16..26 as mean_w goes 0..1
        # Hard bounds (increased upper caps)
        radius = max(16, min(48, radius))
        blur = max(12, min(32, blur))
    else:
        radius = 26
        blur = 18
    return {
        "thermal": {
            "points": points,
            "options": {
                "radius": radius,
                "blur": blur,
                "maxZoom": 12,
                "max": 1
            }
        }
    }

# Request body no longer needed; input is derived from predictSighting2