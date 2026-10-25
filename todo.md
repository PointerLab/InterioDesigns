# TODO.md
## INTERIO – Interior Design & Renovation Cost Estimation Web App

Progress against the PRD. The original plan used Next.js, Express and Prisma; the project is built with
React + Vite and Django instead (see `tech stack`), so tasks are listed against what was actually built.

Legend: `[x]` done · `[ ]` not done · ~~struck through~~ replaced by another approach

---

## PHASE 0 – PROJECT SETUP & FOUNDATION

### 0.1 Repository & Tooling
- [x] Create GitHub repository
- [x] Add README.md (setup, logins, features, API, deploy guide)
- [x] Add tech stack document
- [x] Add TODO.md
- [x] Configure ESLint + Prettier
- [x] Environment variables (`backend/.env.example`, `frontend/.env.example`)

### 0.2 Frontend Setup
- [x] React 18 + Vite + TypeScript (~~Next.js~~)
- [x] Tailwind CSS
- [x] Radix UI primitives (trimmed shadcn components, custom SVG icon set)
- [x] Absolute imports (`@/`)
- [x] Layout: header, footer, dashboard layout

### 0.3 Backend Setup
- [x] Django 5.2 + Django REST Framework (~~Node.js + Express~~)
- [x] Apps: `accounts` (users) and `api` (pricing, estimates, gallery, consultations, staff)
- [x] CORS, rate limiting, HTTPS settings for production
- [x] Health-check API (`/api/health/`)

### 0.4 Database Setup
- [x] SQLite for development, PostgreSQL (Neon) through `DATABASE_URL`
- [x] Django ORM and migrations (~~Prisma~~)
- [x] Seed command (`python manage.py seed`)

---

## PHASE 1 – CORE DOMAIN MODELS

### 1.1 User & Roles
- [x] User accounts with profile (phone, city)
- [x] Customer and staff roles (`is_staff`); ~~separate SALES role~~ (staff covers it)
- [x] JWT authentication with refresh, logout and session revocation (~~NextAuth.js~~)
- [x] Protected customer and staff routes
- [x] Password change and email password reset

### 1.2 Property & Project Models
- [x] Property types (residential, commercial, office) with size presets
- [x] Project types (new, renovation)
- [x] Area and room inputs; kitchen-only and wardrobe-only scopes

### 1.3 Package Models
- [x] Basic / Standard / Premium packages
- [x] Rate per sq.ft and furniture grade multiplier
- [x] Description, inclusions, timeline and warranty
- [x] Editable in the Django admin

---

## PHASE 2 – FURNITURE & RENOVATION MODULES

### 2.1 Furniture Module
- [x] Furniture items grouped by category
- [x] Pricing per unit / per sq.ft
- [x] Package and property-type compatibility rules
- [x] Ready-made furniture flag
- [x] Furniture photos (uploaded in the admin; ~~Cloudinary~~)

### 2.2 Renovation Module
- [x] Services and renovation options (flooring, painting, electrical, plumbing, ceiling, ...)
- [x] Pricing per sq.ft or per unit
- [x] Enabled per project type (renovation-only work)

---

## PHASE 3 – COST ESTIMATION ENGINE

### 3.1 Pricing Logic
- [x] Area × package rate
- [x] Furniture at package grade
- [x] Services and renovation work
- [x] City multiplier and 18% GST
- [x] Cost split by category and ±10% range (`backend/api/pricing.py`)

### 3.2 Location-Based Pricing
- [x] City multipliers, editable in the admin

### 3.3 Timeline Estimation
- [x] Weeks from package, area, renovation and furniture volume
- [x] Phase-by-phase timeline in the UI and PDF

---

## PHASE 4 – ESTIMATION WIZARD (FRONTEND)

### 4.1 Wizard Flow
- [x] Space → Size → Package → Furniture → Services → Review (6 steps)

### 4.2 UX Enhancements
- [x] Step progress indicator
- [x] Validation at each step
- [x] Live running total
- [x] Mobile layout with a sticky total bar
- [x] Draft kept when signing in to save

---

## PHASE 5 – COST BREAKDOWN & OUTPUT

### 5.1 Cost Breakdown UI
- [x] Itemised breakdown
- [x] Edit and recalculate saved estimates
- [x] Package inclusions on the packages page and PDF
- [x] Timeline estimate
- [x] EMI calculator

### 5.2 PDF Generation
- [x] Branded quotation PDF built on the server (ReportLab)
- [x] Disclaimer and 30-day validity
- [x] Download for customers and staff
- [ ] Store generated PDFs (optional; they are generated on demand instead)

### 5.3 Sharing
- [x] Read-only share link, sent by WhatsApp or email, can be turned off

---

## PHASE 6 – ADMIN PANEL

### 6.1 Admin Dashboard
- [x] Staff login and staff-only panel (`/staff`)
- [x] Overview metrics (customers, estimates, pipeline value, bookings, messages)

### 6.2 Pricing Management (Django admin)
- [x] Packages and rates
- [x] Furniture prices and photos
- [x] Services and renovation prices
- [x] City multipliers
- [x] Gallery designs with image upload

### 6.3 Lead Management
- [x] Saved estimates as leads with search and filters
- [x] CSV export and per-lead quotation PDF
- [x] Consultations: confirm, complete, cancel, staff notes
- [x] Contact messages: reply by email, mark resolved
- [x] Email notifications to staff and customers

---

## PHASE 7 – LANDING PAGES & SEO

### 7.1 Marketing Pages
- [x] Home page (day-to-night hero, how it works, featured designs)
- [x] Package comparison page
- [x] Design gallery and detail pages
- [x] Contact page and consultation booking (with rescheduling)
- [x] Privacy and terms pages

### 7.2 SEO Optimization
- [x] Meta description and OpenGraph tags
- [x] Per-page titles
- [ ] Sitemap
- [x] Page speed: lazy-loaded routes, WebP hero frames, reduced-motion support

---

## PHASE 8 – ANALYTICS & MONITORING

- [ ] Google Analytics
- [ ] Sentry error tracking
- [ ] Track estimate completions
- [ ] Track lead conversions

---

## PHASE 9 – DEPLOYMENT & RELEASE

### 9.1 Deployment
- [x] Vercel config for the frontend (`frontend/vercel.json`)
- [x] Render config for the backend (`render.yaml`) and Neon PostgreSQL
- [ ] Deploy and share the live link
- [ ] CI (run tests on every push)

### 9.2 Testing
- [x] Pricing engine unit tests
- [x] API tests (auth, estimates, gallery, consultations, staff, PDF, sharing)
- [x] Frontend unit and component tests (Vitest + Testing Library)
- [ ] Manual UI testing pass
- [ ] Cross-device testing

---

## PHASE 10 – FUTURE ENHANCEMENTS

- [x] EMI calculator
- [x] WhatsApp quotation sharing
- [ ] AI package recommendations
- [ ] Vendor marketplace
- [ ] AR / 3D interior previews
- [ ] Multi-language support
- [ ] Mobile app (React Native)

---

## NOTE
All prices are estimates only. The site, PDF and API show a disclaimer that final costs depend on a site
measurement, site conditions and material availability.
