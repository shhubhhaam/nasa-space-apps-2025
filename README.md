# Sharks from Space — NASA Apps Project

A compact, user-friendly project that links NASA satellite products and local tracking data to identify shark presence and likely foraging hotspots. This repository contains a web frontend, a Python FastAPI backend, and pre-trained models that predict where sharks are likely to be present and whether they are active or resting.

## Quick overview

- Goal: Combine NASA satellite data (e.g., ocean color, sea-surface temperature, altimetry) with animal-tracking-derived features to locate likely shark foraging areas and present them on interactive maps.
- Deliverables: a simple web UI (`frontend/`), a Python API server with prediction endpoints (`backend/`), and lightweight models in `backend/` (`presence_model.pkl`, `shark_activity.pkl`).
- Audience: high-school students, educators, and the broader public interested in ocean science and conservation.

## What's in this repo

- `frontend/` — React + Vite demo app and public assets (icons, maps, photos). Notable assets in `frontend/public/`: `Whale Shark Map.png`, `whale_shark_main.jpg`, `Tag.jpg`, `shark.png`, and other illustrative images you can reuse in presentations.
- `backend/` — FastAPI app, helper utilities, and model files:
  - `server.py` — the API and prediction routes
  - `ocean_utils.py` — helpers for retrieving/estimating ocean parameters and nearest CSV-backed features
  - `presence.py` — a tiny wrapper that loads `presence_model.pkl` for local testing
  - `presence_model.pkl`, `shark_activity.pkl` — trained models used by the API
  - `requirements.txt` — Python dependencies for the backend
- `models/` — source notebooks, CSVs, and figures used during model development. Contains training artifacts and exploratory analysis.

## How it works (non-technical)

1. Satellite and local data provide environmental features such as sea-surface temperature, salinity, bathymetry (depth), and proximity to shore.
2. A trained presence model uses those features to predict whether a location is likely to host sharks (foraging/presence).
3. A separate activity model classifies short-term animal states near candidate locations (for example: resting vs. active/foraging vs. transit).
4. The frontend visualizes model outputs as heatmaps, sighting markers, and migration suggestions so anyone can explore predicted hotspots.

## Model label conventions (how to read predictions)

- Presence model (`presence_model.pkl`)

  - `1` = model predicts the location is a likely shark presence / foraging hotspot
  - `0` = model predicts absence / not a hotspot

- Activity model (`shark_activity.pkl`) — suggested/used mapping
  - `0` = Resting (low activity)
  - `1` = Active / Foraging (high probability of feeding)
  - `2` = Transit / Other behavior

Note: The activity labels above are the convention used in the backend demo payloads and example availability arrays. If you retrain or update the models, confirm label mappings in the training notebook before using them as authoritative.

## API endpoints (backend)

Run the backend and visit `http://localhost:8000/docs` for live OpenAPI docs. Key endpoints:

- `GET /get` — returns a demo payload with random sightings, thermal points, prey and climate samples. Useful for frontend development and UI testing.
- `POST /predictionSighting` — runs the presence model over a set of test cases or a generated grid and returns likely habitat locations (hotspots). Useful to get global candidate hotspots.
- `POST /sharkActivity` — runs the activity model on demo test points and returns activity predictions (the array may contain `pred` values such as 0, 1, 2 to indicate resting/active/transit).
- `POST /getMigration` — creates candidate migration points around predicted hotspots and returns a heatmap-friendly payload.

(See `backend/server.py` for the full implementation and additional helper routes.)

## Getting started (developer / demo)

Prerequisites

- Git (optional) and a bash-compatible shell (your system shows `bash.exe` as default)
- Python 3.11+ (create a virtual environment)
- Node.js 18+ and npm (for the frontend)

Backend (Python)

```bash
# from project root
python -m venv .venv
source .venv/bin/activate    # bash on Windows (WSL) / macOS / Linux
pip install --upgrade pip
pip install -r backend/requirements.txt

# Run the FastAPI backend (from project root)
uvicorn backend.server:app --host 0.0.0.0 --port 8000 --reload
```

Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev
# Open the local dev URL shown in the terminal (usually http://localhost:5173)
```

Once both are running, the frontend should call the backend endpoints to visualize predictions and hotspot maps.

## Example usage (curl)

```bash
# Quick test: get the demo payload
curl http://localhost:8000/get

# Run the global presence prediction (may take longer)
curl -X POST http://localhost:8000/predictionSighting

# Run the activity demo
curl -X POST http://localhost:8000/sharkActivity
```

## Visual assets (useful for presentations)

Local public assets (already included in the frontend):

- `frontend/public/whale_shark_main.jpg` — hero photo
- `frontend/public/Whale Shark Map.png` — example map image
- `frontend/public/Tag.jpg` — conceptual tag device image
- `frontend/public/shark.png`, `frontend/public/shark _navbar.png` — icons

Suggested freely-available online images you can link to in slides or the README (public domain / NASA sources):

- NASA Earth or ocean imagery: https://www.nasa.gov/multimedia/imagegallery/index.html
- PACE mission overview and imagery: https://pace.gsfc.nasa.gov/
- SWOT mission overview: https://swot.jpl.nasa.gov/

To include a local image in a Markdown file or slide, use a relative path (example):

```markdown
![Whale shark map](<frontend/public/Whale\ Shark\ Map.png>)
```

(Remember to escape spaces or rename files for cleaner URLs.)

## Tips, caveats and next steps

- The backend includes a CSV-backed fallback (`ocean_utils.py`) that uses a small local shark subset to estimate ocean parameters when remote API access is not available. This keeps the demo offline-friendly but is not a replacement for full satellite products.
- Model labels, training data, and thresholds should be verified if you intend to use predictions for operational decisions or publication. Treat this repo as a demonstrator and teaching tool.
- Want better results? Consider:
  - Adding real-time PACE/SWOT products or NOAA gridded datasets
  - Increasing the training dataset and doing cross-validation per-region
  - Adding uncertainty estimates (prediction probabilities) to maps
  - Building a simulated tag interface (e.g., with `Tag.jpg`) that streams diet & movement signals to the server

## Educational use & messaging

This project is intentionally designed for outreach: the maps, heatmaps, and tag-concept help explain why sharks matter, where they feed, and how predictions can guide conservation and safer coastal decisions. You can adapt the frontend for classroom use, or turn the notebooks in `models/` into lesson notebooks for students.

## Credits and data sources

- NASA satellite missions (PACE, SWOT and other Earth-observing instruments) provide the oceanographic context used to develop the science in this project. Please cite NASA product pages when using real data.
- Model and demo code developed using open-source Python packages (listed in `backend/requirements.txt`).

## License

This repository is provided for educational and demonstration purposes. If you want an explicit open-source license, consider adding an `LICENSE` file (MIT or CC-BY are common choices for community projects).

---

If you'd like, I can:

- Add a short 30–45 second narration script for a project video (based on your earlier request)
- Generate a cleaned set of presentation slides (Markdown or PowerPoint) using local images
- Rename local public assets to remove spaces for easier linking

Which of the above would you like next?
