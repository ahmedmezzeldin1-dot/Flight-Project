# Backend API Service

Serverless Flask prediction service configured for Vercel deployment and local development.

## Setup & Run

```powershell
pip install -r requirements.txt
python api/index.py
```
API runs on `http://127.0.0.1:5000`.

## Endpoints
- `GET /api/health`
- `GET /api/analytics`
- `POST /api/predict`
