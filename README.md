# INTERIO – Interior Design & Renovation Estimator

A full-stack web platform where people can price an interior project (home, office or shop), browse a design
gallery, save estimates to their account and book a consultation with a designer. Studio staff get a panel to
manage leads, bookings and messages, and control pricing through the Django admin.

- `frontend/` – React 18 + Vite + TypeScript + Tailwind CSS
- `backend/` – Django 5.2 + Django REST Framework, JWT auth, SQLite (or PostgreSQL)

## Login credentials

These accounts are created by `python manage.py seed` (see [Quick start](#quick-start)).

| Account          | Email                 | Password           | Sign in at                                | Can access                                                           |
| ---------------- | --------------------- | ------------------ | ----------------------------------------- | -------------------------------------------------------------------- |
| Customer (demo)  | `demo@interio.local`  | `InterioDemo@123`  | http://localhost:8085/login               | Customer dashboard: estimates, saved designs, consultations, profile |
| Staff / admin    | `admin@interio.local` | `InterioAdmin@123` | http://localhost:8085/login               | Staff panel at `/staff`: leads, consultations, messages              |
| Django admin     | `admin@interio.local` | `InterioAdmin@123` | http://localhost:8085/admin/ (or http://127.0.0.1:8000/admin/) | Pricing, packages, furniture, services, cities, gallery designs, all data |

- The staff account is a Django superuser, so the same login works for the staff panel and the Django admin.
- Django admin asks for a **Username**: use the email `admin@interio.local`.
- The login page also shows these demo accounts while running in development mode.
- You can also create your own customer account at http://localhost:8085/signup.
- Running `seed` again won't reset a password that was changed. To reset one:
  `python manage.py changepassword admin@interio.local`
- To create another staff/admin user: `python manage.py createsuperuser` (use the email as the username).

> These are development credentials for local use and demos. Change or remove them before putting the site
> online (`python manage.py seed --no-demo-users` skips creating them).

## Features

**For customers**

- **Cost estimator**: a 6-step wizard (space → size → package → furniture → services → review) with a live
  running total. Covers new interiors and renovations for homes (1 BHK to villa), shops, showrooms, cafés and
  offices, plus kitchen-only and wardrobe-only estimates.
- **Transparent breakdown**: package work, itemised furniture and services, city price adjustment, 18% GST,
  expected range, cost split by category and a phase-by-phase timeline.
- **Saved estimates**: save, rename, edit and recalculate, delete, print, and download a branded PDF quotation
  (itemised costs, cost split, timeline, package inclusions, 30-day validity).
- **Share an estimate**: a read-only link (without your contact details) to copy, send on WhatsApp or email,
  and turn off again at any time.
  Anonymous visitors can use the whole estimator; answers are kept if they sign in to save.
- **Design gallery**: filter by space, room and style, search, detail pages, "estimate this look", and a saved
  designs shortlist.
- **Consultations**: book a studio visit, video call or site visit in an open slot (Mon–Sat, no double
  booking), attach an estimate, see status and notes from the studio, reschedule or cancel.
- **Account**: sign up, sign in, profile, change password, forgot/reset password by email.
- **Package comparison** page with live sample totals, contact form, privacy and terms pages.

**For staff** (users with `is_staff`)

- Overview of customers, estimates, pipeline value, bookings to confirm and open messages.
- Estimates & leads: search, filter, full breakdown per lead, quotation PDF, CSV export.
- Consultations: confirm / complete / cancel, add a note the customer sees.
- Messages from the contact form: reply by email, mark resolved.
- Pricing & catalog (packages, rates, furniture with photos, services, city multipliers, gallery designs with image
  upload)
  in the Django admin at `/admin/`.

## Quick start

You need **Python 3.10+** and **Node.js 18+**.

### 1. Backend

```bash
cd backend
cp .env.example .env               # Windows: copy .env.example .env  (turns on debug mode)
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py seed              # pricing catalog, cities, 22 gallery designs, demo accounts
python manage.py runserver         # http://127.0.0.1:8000
```

`seed` is safe to run again; it updates the catalog without touching customer data.

### 2. Frontend (in a second terminal)

```bash
cd frontend
npm install
npm run dev                        # http://localhost:8085
```

Open **http://localhost:8085**. The Vite dev server proxies `/api`, `/media` and `/admin` to Django, so no CORS
setup is needed and the Django admin is also reachable at http://localhost:8085/admin/.

### 3. Sign in

Use the accounts listed under [Login credentials](#login-credentials).

### Emails

Without SMTP settings, emails (password reset links) are printed in the terminal running `runserver`.

## Configuration

The frontend works with no configuration. The backend reads `backend/.env`:

- `backend/.env.example` → `backend/.env` – secret key, debug, PostgreSQL `DATABASE_URL`, SMTP, frontend URL.
  Debug mode is **off** unless `DJANGO_DEBUG=true`, so a server that forgets the setting never shows debug pages.
  Without debug mode Django won't serve admin styles or uploaded images, so keep the copied `.env` for local work.
- `frontend/.env.example` → `frontend/.env` – backend address for the dev proxy

## How the estimate is calculated

```
base      = carpet area × package rate per sq.ft        (design, civil and finishing work)
furniture = Σ item price × quantity × package furniture multiplier
services  = Σ per-sq.ft services × area + Σ per-unit services × quantity
subtotal  = base + furniture + services
total     = subtotal × city multiplier + 18% GST        (range shown as ±10%)
```

Timeline: package base weeks, +1 week per extra 600 sq.ft, +2 weeks for renovations, +1 week for large
furniture orders. The engine lives in `backend/api/pricing.py`; every rate is editable in the admin.

## Project structure

```
backend/
  accounts/            users: register, login (JWT), profile, password change and reset
  api/
    models.py          packages, furniture, services, cities, estimates, designs, consultations, messages
    pricing.py         cost estimation engine
    views.py           REST endpoints (public, customer and staff)
    seed_data.py       default catalog loaded by `manage.py seed`
  backend/settings.py
frontend/
  public/images/       gallery and page images
  public/frames/       day-to-night hero animation frames
  src/
    pages/             Home, Designs, Estimate wizard, Packages, Contact, auth/, dashboard/, staff/
    components/        layout, estimate breakdown, shared UI, icons (custom SVG set)
    lib/               API client (JWT + refresh), auth context, data hooks, formatting
```

## API overview

All endpoints are under `/api/`. Authenticated requests send `Authorization: Bearer <access token>`.

| Method      | Endpoint                                        | Access   |
| ----------- | ----------------------------------------------- | -------- |
| POST        | `auth/register/`, `auth/login/`                 | public   |
| POST        | `auth/token/refresh/`                           | public   |
| POST        | `auth/logout/` (revokes the refresh token)      | public   |
| POST        | `auth/password-reset/`, `.../confirm/`          | public   |
| GET, PATCH  | `auth/me/`                                      | customer |
| POST        | `auth/change-password/`                         | customer |
| GET         | `catalog/`                                      | public   |
| POST        | `estimates/preview/`                            | public   |
| GET, POST   | `estimates/`                                    | customer |
| GET, PUT, PATCH, DELETE | `estimates/<id>/`                   | owner    |
| GET         | `estimates/<id>/pdf/` (PDF quotation)           | owner or staff |
| POST, DELETE | `estimates/<id>/share/` (share link on/off)    | owner    |
| GET         | `shared/<token>/`                               | public   |
| GET         | `designs/`, `designs/<slug>/`                   | public   |
| POST, DELETE | `designs/<slug>/save/`                         | customer |
| GET         | `designs/saved/`                                | customer |
| GET         | `consultations/slots/?date=YYYY-MM-DD`          | public   |
| GET, POST   | `consultations/`                                | customer |
| POST        | `consultations/<id>/cancel/`                    | owner    |
| POST        | `consultations/<id>/reschedule/`                | owner    |
| POST        | `contact/`                                      | public   |
| GET         | `staff/overview/`, `staff/estimates/`, `staff/estimates/export/`, `staff/consultations/`, `staff/messages/` | staff |
| PATCH       | `staff/consultations/<id>/`, `staff/messages/<id>/` | staff |

## Deploying

The repo is set up for the hosting in the tech stack doc: the API on **Render**, the database on **Neon**
(PostgreSQL) and the React app on **Vercel**. All three have free plans.

1. **Database**: create a Neon project and copy its connection string (it ends in `?sslmode=require`).
2. **API on Render**: New → Blueprint → pick this repo. `render.yaml` sets up the service. Fill in the values
   it asks for:
   - `DATABASE_URL`: the Neon connection string
   - `FRONTEND_URL` and `CORS_ALLOWED_ORIGINS`: your Vercel URL, e.g. `https://interio.vercel.app`
   - `CSRF_TRUSTED_ORIGINS`: the Render URL, e.g. `https://interio-backend.onrender.com`
   - `MEDIA_URL`: the Render URL + `/media/`
   - `DJANGO_SUPERUSER_USERNAME` / `_EMAIL` / `_PASSWORD`: your first admin account (use the email as the username)

   Each deploy installs packages, runs `collectstatic`, `migrate` and `seed --no-demo-users`, and creates the
   admin account if it doesn't exist yet. The secret key is generated by Render.
3. **Frontend on Vercel**: import the repo, set **Root Directory** to `frontend`, and add the environment
   variable `VITE_API_BASE_URL` = the Render URL + `/api`. `vercel.json` sends every page URL to the React app.
4. Open the Vercel URL, sign in with the admin account, and manage prices at the Render URL + `/admin/`.

Good to know:

- Render's free plan sleeps after 15 minutes without traffic, so the first request after that takes ~30 s.
- Uploaded images are stored on the Render disk, which is wiped on every deploy. The seeded gallery and
  furniture photos are part of the frontend, so they aren't affected.
- For email (password reset and booking notifications), add the `EMAIL_*` settings from `backend/.env.example`.

## Tests and checks

```bash
# backend
cd backend && python manage.py test

# frontend
cd frontend
npm run test      # unit tests (vitest)
npm run lint
npm run build
```

## Notes

- The planning documents are `prd` (requirements), `design doc` (visual direction), `tech stack` (what is used,
  and how it differs from the first Next.js/Express plan) and `todo.md` (progress against the PRD).
- Studio contact details shown on the site (email, phone, address) are placeholders in
  `frontend/src/lib/site.ts`.
- All prices are indicative. Final costs are confirmed after a site measurement.
