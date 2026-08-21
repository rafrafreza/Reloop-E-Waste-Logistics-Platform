# Reloop — E-Waste Pickup & Recycling Logistics Platform

A full-stack e-waste logistics marketplace: **consumers** schedule pickups,
**segregation centres** quote and process them, **pickup partners** handle
the physical handover, and an **admin** runs the whole operation — with
real-time UPI payouts (Cashfree), an AI chatbot (Gemini), interactive maps
(Leaflet), ratings, revenue analytics, environmental impact tracking,
dark mode, and support ticketing on top of the core pickup pipeline.

Built with **React 19 (Vite 8) + FastAPI + SQLite/PostgreSQL + Cashfree Payouts**.

---

## 1. What it does

A request moves through a single, fully-tracked pipeline:

```
PENDING → QUOTED → ACCEPTED → ASSIGNED → OUT_FOR_PICKUP → PICKED_UP → AT_CENTRE → COMPLETED
                 ↘ REJECTED                                                    (or CANCELLED
                                                                       earlier in the flow)
```

1. **Consumer** picks an address (with an interactive map picker), lists
   items by category (with optional dimensions and photos), and submits a
   request.
2. **Centre** (matched by city) reviews the request and returns a quotation
   (material value − handling charge − pickup charge), which also snapshots
   a platform commission for revenue reporting.
3. **Consumer** accepts or rejects the quotation. On acceptance, they choose
   a payment method — **UPI** (with automatic Cashfree payout) or **Cash**.
4. **Centre** assigns an available **pickup partner**, or the **partner
   self-accepts** from a job marketplace of unassigned requests in their
   city. A one-time handover OTP is generated.
5. **Partner** starts the pickup, verifies the OTP at the doorstep, and
   records the actual weight of each item. An **automatic UPI payout** to
   the consumer is triggered via Cashfree (if UPI was selected).
6. **Partner** delivers to the centre — items are automatically logged into
   the centre's warehouse inventory.
7. **Centre** marks the request complete — the partner's pickup fee is
   credited to their wallet and the consumer earns reward points.
8. **Centre** later dispatches warehouse items to a named licensed recycler
   and marks them recycled, closing the chain of custody.
9. **Consumer** can rate the partner and centre, and download a printable
   recycling certificate.

Every transition is notification-driven and recorded in a per-request status
timeline. There's also a full **Admin console** (users, category pricing
and CO₂ estimates, platform settings, revenue analytics, Cashfree payouts,
partner wallet balances, audit log, support inbox, and cross-platform
oversight).

---

## 2. Tech stack

| Layer     | Tech                                                         |
|-----------|--------------------------------------------------------------|
| Frontend  | React 19.2 (Vite 8), React Router 7, Tailwind CSS 3.4, Axios, Recharts, Leaflet + react-leaflet (maps), Lucide React (icons), date-fns |
| Backend   | FastAPI 0.115, SQLAlchemy 2.0, Pydantic v2, PyJWT + python-jose, passlib (bcrypt), LangChain + langchain-google-genai (AI chatbot), Cashfree Payouts API |
| Database  | SQLite (local dev, zero setup) · PostgreSQL on Render (production) |
| Auth      | JWT bearer tokens, role-gated endpoints (Consumer / Partner / Centre / Admin) |
| Payments  | Cashfree Payouts API (UPI transfers for consumer refunds & partner earnings) |
| Maps      | Leaflet + OpenStreetMap tiles, Nominatim geocoding, Google Maps navigation deep-links |
| Testing   | pytest (backend), oxlint (frontend linting) |

---

## 3. Project structure

```
├── docker-compose.yml          # Multi-service Docker dev environment
├── render.yaml                 # Render.com Blueprint (one-click deploy)
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── app/
│   │   ├── main.py             # FastAPI app, CORS, static /uploads mount
│   │   ├── database.py         # SQLAlchemy engine/session
│   │   ├── models.py           # 18 ORM models (User → Payout)
│   │   ├── schemas.py          # Pydantic request/response schemas
│   │   ├── auth.py             # JWT + password hashing + role dependencies
│   │   ├── utils.py            # OTP generation, notifications, audit log
│   │   ├── seed.py             # Creates tables + demo data on first run
│   │   ├── cashfree.py         # Cashfree Payouts API client wrapper
│   │   ├── cashfree_payout.py  # Consumer & partner UPI payout orchestration
│   │   ├── knowledge_base.md   # RAG knowledge base for the AI chatbot
│   │   ├── services/
│   │   │   └── consumer_requests.py # Shared request create/update/cancel logic
│   │   └── routers/
│   │       ├── auth.py         # register/login/me/profile/change-password
│   │       ├── common.py       # categories, notifications, public settings
│   │       ├── consumer.py     # addresses, requests, quote accept/reject
│   │       ├── centre.py       # quoting, partner assignment, inventory, analytics
│   │       ├── partner.py      # pickup workflow (accept/start/OTP/deliver)
│   │       ├── admin.py        # users, categories, settings, revenue, payouts
│   │       ├── support.py      # support ticket creation and retrieval
│   │       ├── chat.py         # AI chatbot (LangChain + Gemini)
│   │       └── uploads.py      # item photo upload (saved to ./uploads)
│   └── tests/
│       ├── conftest.py         # pytest fixtures, test DB configuration
│       ├── test_auth.py        # Auth endpoint tests
│       ├── test_consumer.py    # Consumer endpoint tests
│       ├── test_partner.py     # Partner endpoint tests
│       ├── test_centre.py      # Centre endpoint tests
│       ├── test_admin.py       # Admin endpoint tests
│       ├── test_common.py      # Common endpoint tests
│       ├── test_chat.py        # Gemini tools, confirmations, and ownership tests
│       ├── test_e2e_lifecycle.py # Full pickup lifecycle tests
│       ├── test_support.py     # Support ticket tests
│       └── test_uploads.py     # Upload endpoint tests
└── frontend/
    ├── Dockerfile
    ├── package.json
    ├── tailwind.config.js
    ├── vite.config.js
    └── src/
        ├── App.jsx              # Route definitions (45+ routes)
        ├── main.jsx             # React entry point
        ├── index.css            # Tailwind + custom styles
        ├── api/
        │   ├── client.js        # Axios instance + JWT interceptor
        │   └── endpoints.js     # All API endpoint functions
        ├── context/
        │   ├── AuthContext.jsx   # Session state, login/logout, role routing
        │   └── ThemeContext.jsx  # Dark/light mode toggle (localStorage)
        ├── hooks/
        │   ├── useServiceCities.js
        │   ├── useDefaultCharges.js
        │   └── useIsMobile.js   # Responsive breakpoint detection
        ├── components/
        │   ├── layout/
        │   │   ├── AppShell.jsx      # Sidebar (desktop) + bottom nav (mobile)
        │   │   └── PublicLayout.jsx  # Marketing site navbar/footer
        │   ├── ui/
        │   │   ├── Primitives.jsx    # Spinner, Modal, StatTile, EmptyState
        │   │   ├── StatusBadge.jsx   # Color-coded status pills
        │   │   └── Stamp.jsx         # Rubber-stamp animation for terminal states
        │   ├── AIChatDrawer.jsx      # Slide-out AI chatbot (Gemini)
        │   ├── MapPicker.jsx         # Interactive Leaflet map + geocoding
        │   ├── MapViewer.jsx         # Read-only Leaflet map (partner view)
        │   ├── NotificationBell.jsx  # Real-time notification dropdown
        │   ├── PaginatedList.jsx     # Reusable search + pagination wrapper
        │   ├── ItemPhotos.jsx        # Photo gallery viewer
        │   ├── RequestCard.jsx       # Summary card for collection requests
        │   ├── Timeline.jsx          # Vertical status history log
        │   ├── ProtectedRoute.jsx    # Auth + role guard wrapper
        │   └── PendingApprovalNotice.jsx
        ├── constants/
        │   └── status.js        # STATUS_FLOW, STATUS_META color schemes
        ├── utils/
        │   ├── date.js          # IST date/time formatters
        │   └── formatDims.js    # L×B×H dimension formatter
        └── pages/
            ├── Profile.jsx      # Shared profile page for every role
            ├── Support.jsx      # Shared support ticket page for every role
            ├── NotFound.jsx     # 404 page
            ├── public/          # Home, HowItWorks, Pricing, Impact, FAQ,
            │                    # Contact, Privacy, Terms
            ├── auth/            # Login, Register
            ├── consumer/        # Dashboard, Addresses, NewRequest, Requests,
            │                    # RequestDetail, Certificate, Impact
            ├── partner/         # Dashboard, Assignments, RequestDetail,
            │                    # History, Earnings
            ├── centre/          # Dashboard, IncomingRequests, ActiveRequests,
            │                    # Inventory, History, RequestDetail
            └── admin/           # Dashboard, Users, Categories, Settings,
                                 # Requests, Revenue, Payouts, PartnerBalances,
                                 # AuditLog, AdminSupport
```

---

## 4. Environment variables

| Variable | Required | Where | Description |
|----------|----------|-------|-------------|
| `GOOGLE_API_KEY` | Yes | Backend | Google Gemini API key (powers the AI chatbot) |
| `APP_ENV` | No | Backend | Set to `production` to enforce production secret requirements |
| `SECRET_KEY` | Yes (prod) | Backend | Signs JWTs and Gemini action-confirmation tokens; Render generates it automatically |
| `DATABASE_URL` | No | Backend | Defaults to `sqlite:///./ewaste.db`; set to a PostgreSQL URL for production |
| `CASHFREE_CLIENT_ID` | No | Backend | Cashfree Payouts API client ID (payouts disabled without it) |
| `CASHFREE_CLIENT_SECRET` | No | Backend | Cashfree Payouts API secret |
| `STRIPE_SECRET_KEY` | No | Backend | Stripe API key (reserved for future use) |
| `FRONTEND_URL` | No | Backend | Frontend origin for CORS (auto-set on Render) |
| `VITE_API_URL` | No | Frontend | Backend API base URL (defaults to `http://localhost:8000`) |

---

## 5. Running it locally

### Option A: Using Docker (Recommended)

You don't need Python or Node.js installed. With Docker installed, simply run:
```bash
# Set Gemini key (required for the AI chatbot)
export GOOGLE_API_KEY="your_actual_api_key_here"

docker compose up --build -d
```
- API base: **http://localhost:8000**
- Interactive API docs (Swagger UI): **http://localhost:8000/docs**
- App: **http://localhost:5173**

### Option B: Manual Setup

You need **Python 3.10+** and **Node.js 18+** installed.

#### Backend (Terminal 1)

```bash
cd backend
python3 -m venv venv

# Activate the virtual environment
source venv/bin/activate        # macOS / Linux
venv\Scripts\activate           # Windows

pip install -r requirements.txt

# Export your Gemini API Key before running the server
export GOOGLE_API_KEY="your_actual_api_key_here"

# Windows PowerShell equivalent:
# $env:GOOGLE_API_KEY="your_actual_api_key_here"

# Optional Gemini model override. The current default is gemini-3.5-flash-lite.
# $env:GEMINI_MODEL="gemini-3.6-flash"

# Required in production; local development uses a built-in fallback
export SECRET_KEY="replace_with_a_long_random_secret"

# Optional environment mode. Production refuses to start without SECRET_KEY.
# $env:APP_ENV="production"

# (Optional) For Cashfree payouts:
# export CASHFREE_CLIENT_ID="..."
# export CASHFREE_CLIENT_SECRET="..."

uvicorn app.main:app --reload --port 8000
```

The first run automatically creates `ewaste.db` (SQLite) and seeds demo
accounts + categories. You should see the demo login credentials printed in
the terminal.

- API base: **http://localhost:8000**
- Interactive API docs (Swagger UI): **http://localhost:8000/docs**

#### Frontend (Terminal 2)

```bash
cd frontend
npm install
npm run dev
```

- App: **http://localhost:5173**

Open the app in your browser, and sign in with one of the demo accounts
below (or use the quick-fill buttons on the login page).

---

## 5.5. Deployment (Render)

This project includes a `render.yaml` Blueprint for instant, one-click deployments to [Render.com](https://render.com/).
When you connect your GitHub repository to Render as a Blueprint, it will automatically:
1. Provision a **PostgreSQL database** (`ewaste-db`, free tier).
2. Deploy the Backend as a **Docker Web Service** with `SECRET_KEY` auto-generated and `DATABASE_URL` linked to the database.
3. Deploy the Frontend as a free, ultra-fast **Static Site** (built with `npm run build`, served from `dist/`).
4. Link the frontend to the backend's public URL via the `VITE_API_URL` environment variable.

> **Note:** You must manually enter `GOOGLE_API_KEY` (and optionally `CASHFREE_CLIENT_ID` / `CASHFREE_CLIENT_SECRET`) in the Render Dashboard after deployment.

---

## 6. Demo accounts

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
admin approval before they can sign in — see section 9 below.

---

## 7. Resetting the database

The SQLite database is a single file at `backend/ewaste.db`. To start over
with a clean, freshly-seeded database, just stop the server and delete it:

```bash
rm backend/ewaste.db
```

It will be recreated and reseeded the next time you start the backend.

The application creates missing tables on startup and applies the current
lightweight additive schema upgrade for existing SQLite and PostgreSQL
databases. This covers nullable columns such as the request address reference.
For larger production schema changes, use a proper migration tool such as
Alembic rather than relying on the lightweight upgrader. Deleting
`backend/ewaste.db` is still the quickest way to reset local demo data.

---

## 8. Running tests

### Backend (pytest)

```bash
cd backend
source venv/bin/activate
pytest tests/ -v
```

The backend suite contains 156 tests covering authentication, consumer,
partner, centre, admin, common, support, uploads, payouts, chat tools, and
end-to-end lifecycle behavior. Tests use an isolated SQLite database through
`tests/conftest.py`.

### Frontend (linting)

```bash
cd frontend
npx oxlint
```

No automated UI test suite (Vitest / Cypress / Playwright) is currently
configured — see § 11 for planned improvements.

---

## 9. Feature tour

Beyond the core pickup pipeline, every role gets a full set of tools:

**Consumer**
- **Interactive map picker** for addresses: drop a pin, search by city,
  auto-fill street/pincode/coordinates via Nominatim reverse geocoding.
- Item photos (multiple) and L×B×H dimensions on every item, so partners
  know what vehicle a job needs before they arrive.
- **Payment method selection**: choose UPI (triggers an automatic Cashfree
  payout on pickup) or Cash when accepting a quotation.
- **My Impact** page: personal kg recycled, estimated CO₂e avoided, reward
  points, and milestone badges (5 kg → 500 kg).
- Referral program: every user gets a referral code (`/register?ref=CODE`
  pre-fills it); both sides earn reward points on a successful signup.
- **Reorder**: duplicate a past request's items into a new one in one click.
- Downloadable/printable **recycling certificate** for completed requests.
- Rate the pickup partner and centre (1–5 stars + optional review) after
  completion; ratings feed each partner/centre's public average.
- **Support** ticket system, optionally linked to a specific request.

- **AI-assisted account operations**: the authenticated consumer assistant can
  list saved addresses, list orders, retrieve an individual order, list and
  summarize support tickets, retrieve earnings and impact statistics, and
  prepare order/support-ticket changes for confirmation.
- **Order creation choices**: the assistant asks the consumer to select a
  saved address and choose Standard or Priority pickup before preparing an
  order preview. No order is created until the consumer confirms it.
- **Paginated assistant results**: bulk address, order, and support-ticket
  results are limited to three records. When more records exist, the assistant
  asks before retrieving the next three.
- **Weight-source transparency**: assistant order summaries use the pickup
  partner's actual item weight when available and otherwise show the consumer's
  estimate, with the source labeled accordingly.

**Pickup Partner**
- **Job marketplace**: browse unassigned accepted requests in your city and
  self-accept, in addition to being assigned by a centre.
- Self-service **availability toggle** (Available / Offline) — locked to
  "On a job" while assigned, like a real gig-work app.
- **Google Maps navigation** deep-link from the request detail page for
  turn-by-turn directions to the pickup address.
- **OTP verification** with actual weight entry per item — recalculates
  the final payout based on weighed quantities.
- Partner acceptance changes availability to **Busy**; delivery returns the
  partner to **Available**, and partners cannot go offline while an active job
  is assigned.
- **Earnings** page: total/paid/pending wallet balance, per-job history,
  and your rating — the pickup fee is snapshotted per job from an
  admin-configurable setting so later fee changes don't rewrite history.
- **UPI payout**: wallet balance settled via Cashfree when admin processes
  payout from the Partner Balances page.

**Segregation Centre**
- **Dashboard with analytics**: 4 Recharts visualizations (inventory status,
  category breakdown, processing trends, partner distribution).
- **Warehouse capacity bar** (used vs. total kg) on the dashboard and
  inventory page.
- Chain-of-custody workflow: bulk-select warehouse items → **Dispatch** to
  a named licensed recycler → **Mark recycled**, closing the loop that
  the original MVP left open at "item arrived at centre."
- Partner ratings shown right in the assign-partner picker, so a centre can
  factor trust into who gets the job.

**Admin**
- **Revenue** analytics: material value, handling revenue, partner payouts,
  and platform commission, broken down by month and by city, with Recharts
  bar charts.
- **Dashboard** with 6 analytics charts: request status distribution,
  revenue trends, category breakdown, city breakdown, user role distribution,
  and inventory status.
- **Payouts** management page: view all Cashfree transfers (Pending,
  Processing, Success, Failed, Cash Collected), check live transfer status,
  and retry failed payouts.
- **Partner Balances** page: view each partner's wallet balance and trigger
  UPI payout via Cashfree.
- **Impact** stats (platform-wide kg recycled / CO₂e avoided) — the same
  numbers power the public `/impact` marketing page.
- **Audit log**: who approved/deactivated a user, changed a setting, or
  edited a category, and when.
- **Support inbox**: respond to and resolve tickets from any role.
- Category CO₂e factor is editable alongside price, feeding both the
  impact stats and the consumer-facing sustainability estimates.

**Platform-wide**
- **AI Chatbot** (Gemini): a slide-out drawer accessible from every
  authenticated page, powered by `langchain-google-genai` with a custom
  `knowledge_base.md` system prompt. Answers questions about e-waste
  disposal, category pricing, data wiping, and service availability. Its
  consumer tools include address lookup, category lookup, order lookup and
  creation, order update/cancel/remove, impact, earnings, support-ticket
  creation/update/listing, and ticket summaries.
- **Secure confirmations**: write operations create short-lived signed
  confirmation tokens, enforce consumer ownership, require explicit user
  confirmation, and reject token reuse.
- **Conversation safeguards**: the chat endpoint validates message sizes and
  history length, while the frontend sends a bounded recent history window.
  User-facing replies are instructed and sanitized to avoid exposing tool
  names or internal JSON fields.
- **Dark / Light mode**: toggled via a sun/moon button in the header;
  preference persisted in `localStorage`.
- **Responsive mobile navigation**: fixed sidebar on desktop, bottom bar
  with overflow drawer on mobile screens.
- **Search & Pagination**: all heavy data tables use a reusable
  `PaginatedList.jsx` component for scalable browsing and live search
  filtering.
- **Real-time notifications**: websocket notifications with an unread count
  badge on the notification bell, with polling-based UI support retained for
  compatibility.
- **UI Aesthetics**: premium glassmorphism (backdrop blur) header, custom
  color palette with circuit/copper/amber tones, rubber-stamp animations
  for terminal statuses, and smooth slide-up drawer transitions.

---

## 10. Design notes

- **Roles are strict**: every backend endpoint is guarded by a
  `require_role(...)` dependency, and the frontend mirrors this with
  `ProtectedRoute`. A partner account can't reach `/centre/*` routes even by
  typing the URL directly.
- **City-based routing**: centres only see `PENDING` requests whose address
  city matches their own city; pickup partners are only assignable (or can
  only self-accept) within that same city.
- **Partner self-assignment**: in addition to centre-initiated assignment,
  partners can browse a marketplace of unassigned accepted requests in their
  city and self-accept jobs.
- **OTP handover**: a 6-digit OTP is generated when a partner is assigned
  and must be entered by the partner (given to them by the consumer in
  person) before a pickup can be marked collected — this models a basic
  chain-of-custody control.
- **Cashfree payouts**: when a partner verifies the OTP and records actual
  weights, the system recalculates the final payout amount and triggers an
  automatic UPI transfer to the consumer via Cashfree (if UPI was selected).
  Partner earnings accumulate in a wallet and are paid out by admin from
  the Partner Balances page.
- **Notifications** are created server-side at each state transition and
  delivered through the notification manager. The WebSocket endpoint validates
  the same JWT secret used by the REST API.
- **Partner/Centre approval**: registering as a Pickup Partner or
  Segregation Centre creates the account with `is_active=False`. Logging in
  before approval returns a dedicated "application under review" screen
  instead of a dashboard. An Admin approves the account from **Admin →
  Users** (the same Activate/Deactivate toggle used for account management).
  Consumer accounts are active immediately and never need approval.
- **Profile editing**: every role has a Profile page (name, phone, and
  role-specific fields — vehicle number and UPI ID for partners; centre
  name, address, and city for centres) plus a change-password form.
- **Admin settings actually take effect**: `service_cities` drives every
  city dropdown in the app (address form, registration, profile), and
  `default_handling_charge` / `default_pickup_charge` pre-fill the centre's
  quotation form. `platform_fee_percent` and `partner_pickup_fee` drive the
  revenue model. Update any of them from **Admin → Settings** and they
  apply immediately (no restart needed).
- **Item dimensions & photos**: each item in a request can optionally record
  L×B×H (cm) and multiple photos, uploaded to `backend/uploads/items/` and
  served statically at `/uploads/...`. This is shown to the pickup partner
  on the request detail page so they can judge what vehicle a job needs.
- **Dark mode**: toggled via a sun/moon button in the header; preference
  persisted in `localStorage` (`reloop_theme`); implemented via Tailwind's
  `.dark` class strategy with a custom `ThemeContext` provider.
- **Maps**: consumer address form includes an interactive Leaflet map with
  click-to-place marker, city search, and Nominatim reverse geocoding.
  Partner request detail shows a read-only map pin and a "Navigate" button
  that deep-links to Google Maps for turn-by-turn directions.
- **Mobile navigation**: the four role dashboards (Consumer, Partner,
  Centre, Admin) use a fixed sidebar on desktop and a bottom bar with a
  hamburger menu on mobile (`md:` breakpoint and below) — tap **Menu** to
  open the full navigation drawer. The public marketing site keeps its own
  top navbar/hamburger, which is a separate, unrelated layout.
- **AI Assistant**: a custom AI chatbot powered by `langchain-google-genai`
  uses a custom `knowledge_base.md` system prompt to help users with
  e-waste queries and consumer account operations. Write operations are
  confirmation-gated, scoped to the authenticated consumer, and signed with
  the application secret. The chat interface is implemented as a sliding
  `AIChatDrawer.jsx` component accessible from the app header.
- **Search & Pagination**: all heavy data tables (e.g., Active Requests,
  Users, Assignments) utilize a reusable `PaginatedList.jsx` component for
  scalable browsing and live search filtering.

---

## 11. AI Assistant enhancements and other related improvements and fixes

### Gemini assistant

- Added fourteen consumer-scoped tools for addresses, categories, orders,
  impact, earnings, and support tickets.
- Added order creation, update, cancellation, and removal previews with
  explicit confirmation before database mutation.
- Added support-ticket creation and follow-up previews with confirmation.
- Added signed, expiring confirmation tokens and replay protection through
  audit logs.
- Added consumer ownership checks for orders, addresses, tickets, and linked
  request IDs.
- Added three-record paging for bulk addresses, orders, and support tickets.
- Added bounded chat history handling to respect the endpoint's 20-message
  validation limit.

### Pickup and data accuracy

- Partner-entered actual item weights are persisted during OTP verification.
- Final material value and payout are recalculated from actual weights when
  they are available.
- Assistant order summaries expose both the original estimate and the selected
  weight source (`actual` or `estimate`).
- Partner availability now reflects assignment state and prevents going
  offline during active jobs.
- Shared consumer request service logic keeps create, update, and cancel
  behavior consistent across REST and assistant flows.

### Security and deployment

- `SECRET_KEY` is shared by REST JWTs, WebSocket authentication, and assistant
  confirmation tokens.
- Production mode fails fast when `SECRET_KEY` is missing instead of silently
  using a development secret.
- Render sets `APP_ENV=production` and generates a persistent `SECRET_KEY`.
- Docker Compose requires `SECRET_KEY` from the host environment.
- Startup schema upgrades support additive changes on SQLite and PostgreSQL.
- Startup no longer blocks on an external IP-discovery request.
- Existing admin support responses, registration compatibility, referral
  signups, and partner lifecycle behavior are covered by regression tests.

### Validation

- Backend: **156 tests passed**.
- Frontend: production Vite build passed with 1011 modules transformed.
- Static diagnostics: no errors reported in the changed backend or frontend
  files.

### Deployment checklist

Before deploying, configure `SECRET_KEY`, `GOOGLE_API_KEY`, and `DATABASE_URL`.
For Cashfree production payouts, also configure production credentials,
webhook signature verification, domain whitelisting, and backend payment
re-verification. Do not commit `.env` files, runtime uploads, API keys, or
generated database files.

---

## 12. Possible next versions

The codebase intentionally leaves room to grow without a rewrite:

- Swap SQLite → PostgreSQL locally by changing `DATABASE_URL` in
  `database.py` (already PostgreSQL on Render).
- Add Redis + Celery for async notification delivery / SMS-OTP.
- WebSocket notifications to replace the current 15-second polling.
- Vitest / Playwright frontend test suite.
- Multi-language i18n support.
- SMS OTP delivery (currently OTP is displayed in-app only).
- Track approval history separately from active/inactive status, so an
  admin-deactivated account can be distinguished from one that was never
  approved in the first place.
