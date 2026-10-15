# PricingHub — Lok Chemicals Product Pricing

Internal web app for entering and viewing daily chemical market prices.
Admins manage products, prices, users and queries; users view prices and
send price queries. Includes a TV / live-ribbon view.

- **Backend:** Node.js + Express + MongoDB (Mongoose) — `server/`
- **Frontend:** React (Create React App) — `client/`

## First-time setup (Windows)

1. Install [Node.js](https://nodejs.org) (LTS).
2. Create `server/.env` by copying `server/.env.example` and filling in
   `MONGO_URI`, `JWT_SECRET` and `PORT`.
3. Double-click **INSTALL.bat** (installs server + client packages).
4. Double-click **START.bat**.
   - App: http://localhost:3000
   - API: http://localhost:5000

## First login

If the database has no admin, the server creates one on start:
`admin@lokchem.com` / `admin123`. **Change this password immediately.**

## Folder layout

```
server/
  index.js        API entry point
  models/         Product, PriceEntry, User, Query, Setting
  routes/         auth, products, prices, queries, settings
  middleware/     auth (JWT check)
  seed.js         one-off product import (node seed.js)
client/
  src/pages/      Login, dashboards, PriceCompare, admin pages
  src/components/ Sidebar, NewQueryForm
```

## Notes

- One price entry per product per date (`PriceEntry` unique on product + date).
- Data exports (`*.xlsx`, `*.csv`) are git-ignored because they contain user emails.
