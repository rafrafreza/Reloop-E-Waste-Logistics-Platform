# Reloop — E-Waste Pickup & Recycling Logistics Platform

A three-sided e-waste logistics
marketplace: **consumers** schedule pickups, **segregation centres** quote
and process them, and **pickup partners** handle the physical handover.

Built with **React (Vite) + FastAPI + SQLite/SQLAlchemy**.

---

## 1. What it does

A request moves through a single, fully-tracked pipeline:

```
PENDING → QUOTED → ACCEPTED → ASSIGNED → OUT_FOR_PICKUP → PICKED_UP → AT_CENTRE → COMPLETED
                 ↘ REJECTED                                                    (or CANCELLED
                                                                       earlier in the flow)
```

1. **Consumer** picks an address, lists items by category with an estimated
   weight, and submits a request.
2. **Centre** (matched by city) reviews the request and returns a quotation
   (material value − handling charge − pickup charge).
3. **Consumer** accepts or rejects the quotation.
4. **Centre** assigns an available **pickup partner**; a one-time handover
   OTP is generated.
5. **Partner** starts the pickup, verifies the OTP at the doorstep, and
   records the actual weight of each item.
6. **Partner** delivers to the centre — items are automatically logged into
   the centre's warehouse inventory.
7. **Centre** marks the request complete.

Every transition is notification-driven and recorded in a per-request status
timeline. There's also a full **Admin console** (users, category pricing,
platform settings, and cross-platform oversight).

---

## 2. Tech stack

| Layer     | Tech                                                         |
|-----------|---------------------------------------------------------------|
| Frontend  | React 19 (Vite), React Router, Tailwind CSS, Axios            |
| Backend   | FastAPI, SQLAlchemy ORM, Pydantic v2, python-jose (JWT), passlib (bcrypt) |
| Database  | SQLite (file-based, zero setup)                                |
| Auth      | JWT bearer tokens, role-gated endpoints (Consumer/Partner/Centre/Admin) |

---

## 3. Project structure

```
ewaste/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI app, CORS, static /uploads mount
│   │   ├── database.py      # SQLAlchemy engine/session
│   │   ├── models.py        # All ORM models
│   │   ├── schemas.py       # Pydantic request/response schemas
│   │   ├── auth.py          # JWT + password hashing + role dependencies
│   │   ├── utils.py         # OTP generation, notifications, serialization
│   │   ├── seed.py          # Creates tables + demo data on first run
│   │   └── routers/
│   │       ├── auth.py      # register/login/me/profile/change-password
│   │       ├── common.py    # categories, notifications, public settings
│   │       ├── consumer.py  # addresses, requests, quote accept/reject
│   │       ├── centre.py    # quoting, partner assignment, inventory
│   │       ├── partner.py   # pickup workflow (start/OTP/deliver)
│   │       ├── admin.py     # users, categories, settings, oversight
│   │       └── uploads.py   # item photo upload (saved to ./uploads)
│   ├── uploads/              # item photos (created at runtime, gitignored)
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── api/              # axios client + endpoint functions
    │   ├── context/          # AuthContext (session state)
    │   ├── hooks/             # useServiceCities, useDefaultCharges
    │   ├── components/       # layout (incl. mobile bottom nav), UI kit
    │   ├── constants/        # status labels/colors
    │   └── pages/
    │       ├── public/       # marketing site (home, pricing, FAQ, etc.)
    │       ├── auth/         # login, register
    │       ├── Profile.jsx   # shared profile page for every role
    │       ├── consumer/     # dashboard, addresses, new request, requests
    │       ├── partner/      # dashboard, assignments, pickup workflow
    │       ├── centre/       # dashboard, incoming, active, inventory
    │       └── admin/        # dashboard, users, categories, settings
    └── package.json
```

---

## 4. Running it locally

You need **Python 3.10+** and **Node.js 18+** installed.

### Backend (Terminal 1)

```bash
cd backend
python3 -m venv venv

# Activate the virtual environment
source venv/bin/activate        # macOS / Linux
venv\Scripts\activate           # Windows

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

The first run automatically creates `ewaste.db` (SQLite) and seeds demo
accounts + categories. You should see the demo login credentials printed in
the terminal.

- API base: **http://localhost:8000**
- Interactive API docs (Swagger UI): **http://localhost:8000/docs**

### Frontend (Terminal 2)

```bash
cd frontend
npm install
npm run dev
```

- App: **http://localhost:5173**

Open the app in your browser, and sign in with one of the demo accounts
below (or use the quick-fill buttons on the login page).

---

## 5. Demo accounts

| Role     | Email                       | Password    |
|----------|------------------------------|-------------|
| Consumer | consumer@reloop.com      | consumer123 |
| Partner  | partner@reloop.com       | partner123  |
| Centre   | centre@reloop.com        | centre123   |
| Admin    | admin@reloop.com         | admin123    |

There is also a second Delhi-based centre/partner pair
(`centre.delhi@reloop.com` / `partner.delhi@reloop.com`, same
passwords) to demonstrate city-based routing — a request placed with a Delhi
address will only be visible to the Delhi centre.

You can also register new accounts from the app (`/register`) for any role
except Admin. **Pickup Partner and Segregation Centre** signups require
admin approval before they can sign in — see section 8 below.

---

## 6. Resetting the database

The SQLite database is a single file at `backend/ewaste.db`. To start over
with a clean, freshly-seeded database, just stop the server and delete it:

```bash
rm backend/ewaste.db
```

It will be recreated and reseeded the next time you start the backend.

Since this project has no migration tool (by design, to keep it simple),
**pulling updated code that changes `models.py` always requires deleting
`ewaste.db` and letting it reseed** - otherwise the old SQLite file won't
have the new columns/tables and you'll see database errors.

---

## 7. Design notes

- **Roles are strict**: every backend endpoint is guarded by a
  `require_role(...)` dependency, and the frontend mirrors this with
  `ProtectedRoute`. A partner account can't reach `/centre/*` routes even by
  typing the URL directly.
- **City-based routing**: centres only see `PENDING` requests whose address
  city matches their own city; pickup partners are only assignable within
  that same city.
- **OTP handover**: a 6-digit OTP is generated when a partner is assigned
  and must be entered by the partner (given to them by the consumer in
  person) before a pickup can be marked collected — this models a basic
  chain-of-custody control.
- **Notifications** are created server-side at each state transition and
  polled from the frontend (no websockets — kept deliberately simple for a
  local, single-instance deployment).
- **Partner/Centre approval**: registering as a Pickup Partner or
  Segregation Centre creates the account with `is_active=False`. Logging in
  before approval returns a dedicated "application under review" screen
  instead of a dashboard. An Admin approves the account from **Admin →
  Users** (the same Activate/Deactivate toggle used for account management).
  Consumer accounts are active immediately and never need approval.
- **Profile editing**: every role has a Profile page (name, phone, and
  role-specific fields — vehicle number for partners; centre name, address,
  and city for centres) plus a change-password form.
- **Admin settings actually take effect**: `service_cities` drives every
  city dropdown in the app (address form, registration, profile), and
  `default_handling_charge` / `default_pickup_charge` pre-fill the centre's
  quotation form. Update them from **Admin → Settings** and they apply
  immediately (no restart needed).
- **Item dimensions & photos**: each item in a request can optionally record
  L×B×H (cm) and multiple photos, uploaded to `backend/uploads/items/` and
  served statically at `/uploads/...`. This is shown to the pickup partner
  on the request detail page so they can judge what vehicle a job needs.
- **Mobile navigation**: the four role dashboards (Consumer, Partner,
  Centre, Admin) use a fixed sidebar on desktop and a bottom bar with a
  hamburger menu on mobile (`md:` breakpoint and below) — tap **Menu** to
  open the full navigation drawer. The public marketing site keeps its own
  top navbar/hamburger, which is a separate, unrelated layout.

## 8. Possible next versions

The codebase intentionally leaves room to grow without a rewrite:

- Swap SQLite → PostgreSQL by changing `DATABASE_URL` in `database.py`.
- Add Redis + Celery for async notification delivery / SMS-OTP.
- Containerize with Docker Compose once the above are introduced.
- Add real payment/escrow handling instead of the current settlement note.
- Track approval history separately from active/inactive status, so an
  admin-deactivated account can be distinguished from one that was never
  approved in the first place.
