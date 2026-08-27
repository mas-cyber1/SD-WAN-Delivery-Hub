# SD-WAN Delivery Hub

Internal department pilot for managing SD-WAN project delivery.

## Phase 1

This phase provides the standalone UI shell and navigation for the pilot modules. Business data, authentication, and database integration are intentionally deferred to later phases.

## Local development

```powershell
npm install
npm run dev
```

Open `http://localhost:5173` in a browser.

## Backend setup (admin PC)

Create `backend\.env` from `backend\.env.example`, set the PostgreSQL password and a long random `JWT_SECRET`, then install the backend dependencies:

```powershell
Set-Location backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Set the first administrator values for the current PowerShell session, then initialize the database:

```powershell
$env:INITIAL_ADMIN_EMAIL = "your.department.email@example.com"
$env:INITIAL_ADMIN_PASSWORD = "use-a-private-password-here"
$env:INITIAL_ADMIN_NAME = "Department Administrator"
$env:INITIAL_TENANT_NAME = "Internal Department"
python -m scripts.init_db
```

Start the API in a second PowerShell window:

```powershell
Set-Location backend
.\.venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --reload --port 8000
```
