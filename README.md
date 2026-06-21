# SmartRent — Setup Guide
Universal Web Service Rental System
Smart Design & Construction | 2025/2026

## Requirements
- Python 3.8+  (already installed)
- No other installations needed — SQLite is built into Python

## Setup (3 steps)

### 1. Install Python packages
Open a terminal inside the `smartrent/` folder and run:
```
pip install -r requirements.txt
```

### 2. Run the app
```
python app.py
```

### 3. Open in browser
Go to: http://127.0.0.1:5000

The database (smartrent.db) is created automatically on first run.

---

## Demo accounts (password: demo123)
| Email              | Role         |
|--------------------|--------------|
| ade@demo.com       | Both (renter + owner) |
| fatima@demo.com    | Renter only  |
| chisom@demo.com    | Owner only   |

---

## Project Structure
```
smartrent/
├── app.py          — Flask routes & API
├── config.py       — App configuration
├── database.py     — SQLite connection
├── schema.sql      — Table definitions & seed data
├── requirements.txt
├── smartrent.db    — Auto-created on first run
├── templates/
│   └── index.html  — Frontend SPA
└── static/
    ├── css/main.css
    └── js/app.js
```

## Tech Stack
- Backend:  Python Flask + SQLite
- Frontend: HTML, CSS (Satoshi font), Vanilla JS
- Icons:    Lucide Icons
