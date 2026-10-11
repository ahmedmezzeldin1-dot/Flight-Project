# Flight Operations | Decoupled Architecture

Production-ready, decoupled Flight Delay Intelligence web platform architected for independent deployment to **Vercel** and version-controlled with **Git**.

---

## Architecture Overview

The system is decoupled into two independent root services:

```
Flight-Project/
├── backend/                  # Serverless Flask API
│   ├── api/
│   │   └── index.py          # Primary Flask serverless entry point
│   ├── models/               # Model artifact directory (.gitkeep tracked)
│   │   ├── .gitkeep
│   │   └── flight_delay_model.pkl
│   ├── .gitignore            # Backend-specific ignore rules
│   ├── requirements.txt      # Python dependencies (Flask, CORS, Scikit-Learn, etc.)
│   └── vercel.json           # @vercel/python builder targeting api/index.py
│
├── frontend/                 # Static Web Dashboard
│   ├── index.html            # Clean semantic UI dashboard
│   ├── script.js             # Client logic with configurable BACKEND_URL
│   ├── style.css             # Responsive styling & design system
│   ├── .gitignore            # Frontend-specific ignore rules
│   └── vercel.json           # Clean-URL static hosting configuration
│
├── .gitignore                # Root repository ignore rules
└── README.md                 # Project documentation
```

---

## 1. Backend Service (`backend/`)

- **Framework**: Flask with `flask-cors` enabling cross-origin API calls.
- **Serverless Entry Point**: `backend/api/index.py` exporting the WSGI `app` callable.
- **Deployment**: Configured for Vercel via `@vercel/python` builder.
- **Endpoints**:
  - `GET /` & `GET /api` — Service health & API discovery.
  - `GET /api/health` — Runtime and ML model readiness check.
  - `GET /api/analytics` — Network activity KPIs and monthly delay trends.
  - `POST /api/predict` — Departure delay probability inference.

### Local Backend Execution

```powershell
cd backend
python -m pip install -r requirements.txt
python api/index.py
```
The Flask API will run on `http://127.0.0.1:5000`.

---

## 2. Frontend Service (`frontend/`)

- **Stack**: Vanilla HTML5, CSS3, and JavaScript.
- **Static Hosting**: Configured for Vercel with clean URLs.
- **Configuration**: `script.js` contains the configurable `BACKEND_URL`:
  ```javascript
  const BACKEND_URL = window.BACKEND_URL || (
    window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
      ? "http://127.0.0.1:5000/api/predict"
      : "/api/predict"
  );
  ```

### Local Frontend Execution

Serve static files with any local HTTP server (or Live Server):

```powershell
cd frontend
python -m http.server 3000
```
Open `http://localhost:3000` in your browser.

---

## 3. Deploying to Vercel

### Option A: Deploy Both via Vercel CLI

1. **Deploy Backend**:
   ```bash
   cd backend
   vercel --prod
   ```
   *Note the assigned production URL, e.g., `https://flight-backend.vercel.app`.*

2. **Configure Frontend**:
   In `frontend/script.js`, set `BACKEND_URL`:
   ```javascript
   const BACKEND_URL = "https://flight-backend.vercel.app/api/predict";
   ```

3. **Deploy Frontend**:
   ```bash
   cd frontend
   vercel --prod
   ```

### Option B: Monorepo Deployment via Vercel Dashboard

When importing the repository in Vercel:
- **Project 1 (Backend)**: Set Root Directory to `backend`.
- **Project 2 (Frontend)**: Set Root Directory to `frontend`.
