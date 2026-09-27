# Royal Paan – orders, payments & dues

A mobile-first web app for **Royal Paan Family Restaurant** (Mahendra SEZ Road T-point, Neota, Rajasthan). Staff use it to take orders, record payments, chase unpaid dues and see how much money has come in. Everyone signs in with their own account (Admin or Staff).

**Stack:** Next.js 15 (App Router, Server Components, Server Actions) · TypeScript · Tailwind CSS 4 · MongoDB + Prisma 6 · Zod · Recharts · `qrcode`. Currency ₹ INR, time zone Asia/Kolkata, weeks start on Monday.

---

## Setup

Requires Node 20.12+ (22 recommended) and a MongoDB **replica set**, because the app uses transactions.

### 1. Database

**MongoDB Atlas (easiest).** Create a free cluster, add a database user, allow your IP, and copy the connection string. **Put a database name after `.net/`**, or Prisma refuses to connect ("empty database name not allowed"):

```
mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/royal_paan?retryWrites=true&w=majority
```

**Local single-node replica set.** Run it once:

```bash
mongod --replSet rs0 --dbpath ./data --port 27017
mongosh --eval 'rs.initiate({_id:"rs0",members:[{_id:0,host:"127.0.0.1:27017"}]})'
```

Then use `mongodb://127.0.0.1:27017/royal_paan?replicaSet=rs0&directConnection=true`.

### 2. App

```bash
cp .env.example .env          # then fill in DATABASE_URL
npm install
npm run db:push               # creates collections and indexes
npm run db:seed-admin         # creates "admin" with a random password, printed once
npm run db:seed               # optional: 10 sample menu items + 15 sample orders
npm run build && npm start    # production (fast); or: npm run dev
```

> ⚠️ `npm run db:seed` **deletes all menu items, orders, payments and customers** before adding sample data. User accounts are kept. Don't run it on a live database.

### Environment

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | MongoDB connection string (replica set, with database name). |
| `COOKIE_SECURE` | Leave empty behind HTTPS. Set to `false` only when serving the production build over plain HTTP on the shop LAN (e.g. `http://192.168.1.20:3000`). |
| `PUBLIC_BASE_URL` | Address printed in the table QR code, e.g. `https://royalpaan.example.com`. If empty, the current host is used, with `localhost` swapped for this machine's LAN IP. |

### Scripts

| Command | What it does |
|---|---|
| `npm run db:seed-admin` | Creates the `admin` account with a random password, shown once. |
| `npm run user:create -- --username ramesh --name "Ramesh Kumar" --role STAFF` | Adds an account; prints a random password once. |
| `npm run user:create -- --username admin --reset` | Password recovery: new password, ends all that user's sessions, re-enables the account and clears any login lock. |
| `npm run db:backfill-customers` | Rebuilds the Customer collection (returning-customer lookup) from existing orders. |
| `npm run db:seed` | Sample data (destructive, see above). |

---

## Screens

| Path | Who | What |
|---|---|---|
| `/login` | everyone | Username + password. |
| `/` New order | staff | Today's collections, order count and open dues. Menu cards with category tabs and search; items with sizes have one-tap size buttons (M / L). Running bill with +/−, customer phone/name/table, ₹ or % discount, Paid / Partial / Unpaid with Cash / UPI / Card, and change for cash. Known phone numbers fill in the name and warn about unpaid dues; typing part of a name or 3+ digits lists regulars (arrow keys + Enter, or tap). After saving: the bill, Print, and **Start next order**. |
| `/dues` | staff | All open bills, oldest first. Filter by phone, name or order number (`/dues?phone=…` pre-fills it). A red edge and an **Over 24h** badge after a day. Record full or partial payments. **Collect in one go** splits one amount across a customer's bills, oldest first, with a preview. Expand a bill for its items and payments. |
| `/history` | staff | Filter by dates, status, payment method, phone (partial) and name / order number (`12` or `#0012`). A phone filter shows a customer card (visits, billed, paid, due → Collect). 20 per page. CSV export. |
| `/orders/[id]` | staff | Receipt-style bill: record payment, Edit, Print (A4 and 80 mm thermal). Admins can also remove a payment or delete the order. |
| `/orders/[id]/edit` | staff | Change items, quantities, customer and discount. Existing lines keep their original price; new lines use today's price. |
| `/analytics` | staff | Today / This week / This month / Custom (up to 366 days). Collected, outstanding, orders, average order; daily revenue, collected vs outstanding, payment methods, category sales, top 10 items by quantity and by revenue, and who owes the most (all time). |
| `/menu` | staff / admin | Admins add, edit and delete items with 2–6 sizes (Medium and Large pre-filled; switched on automatically for Tea, Coffee, Shakes, Lassi, Beverages). Everyone can switch items on and off. |
| `/menu/qr` | staff | A printable table QR code pointing at `/m`. |
| `/m` | public | Read-only customer menu, no sign-in. |
| `/account` | staff | Change password, sign out, sign out of all other devices. Admins also see Team. |
| `/users` | admin | Add accounts, set Admin/Staff, disable, reset passwords, sign someone out. Admins can't demote or disable themselves. |
| `/api/export/orders`, `/api/export/payments` | staff | Streaming CSV in batches of 500 / 1000 rows. |

---

## Hindi / English

The whole app works in **Hindi (default)** and English. Tap **EN / हिंदी** in the header (also on the login page and the public menu), or choose on the Account page. The choice is remembered on that phone.

- Every screen, button, error message, date ("27 सित॰") and time ("5 मिनट पहले") is translated. Amounts keep ₹ and ordinary digits.
- **Menu → हिंदी नाम अपने आप भरें** (admins) fills in Hindi names for every item that has none, from a built-in list of common dish words (`src/lib/hindi-names.ts`). Past bills of those items are updated too. Items with a word it doesn't know are listed rather than guessed. When adding an item, a Hindi name is suggested as you type the English one.
- Menu items have an optional **Hindi name** (Menu → edit item). In Hindi, staff see "मसाला चाय" with "Masala Chai" underneath, and search works in either language. Bills keep a copy of the Hindi name, like the English one. The public menu shows both names.
- Known categories and sizes appear in Hindi automatically (Tea → चाय, Desserts → मिठाई, Large → बड़ा). Categories are still stored in English.
- The table QR card shows its caption in both languages.
- CSV exports stay in English for accounts.
- All text lives in `src/lib/i18n/messages.ts`: `en` and `hi`, with matching keys. TypeScript fails the build if a Hindi line is missing.
- Devanagari fonts (Mukta, and Tiro Devanagari Hindi for headings) download only when Hindi text is on screen.

## Business rules

- **Money is integer paise** (₹1 = 100). Timestamps are stored in UTC; everything is shown and reported in Asia/Kolkata.
- **The server prices everything.** The client sends only item ids, size names and quantities. An item with sizes must be ordered with a size.
- **Bill lines are snapshots** (name, size, category, price), so editing or deleting a menu item never changes past bills. Deleting a menu item sets `menuItemId` to null on old lines.
- **Payment totals come from the payments themselves.** `amountPaid`, `balanceDue` and `status` are recomputed from SUM(payments) in the same MongoDB transaction that adds or removes a payment or changes a total. Each transaction first writes to the order document to claim it, and retries on write conflicts. Two people paying the same bill at once can never overpay it.
- Status: paid in full → PAID, something paid → PARTIAL, nothing → UNPAID.
- A payment can't exceed the balance due. An edit can't bring the total below what's already paid. Discounts are clamped so the total never goes below ₹0.
- Saving as **Paid** records exactly the bill total. "Cash received" only works out the change.
- **Order numbers** (#0001…) come from a counter incremented inside the order-creation transaction, so there are no gaps or duplicates.
- Deleting an order deletes its items and payments in the same transaction.
- Phone numbers are saved as digits (a leading `+` is kept). Returning customers match on the last 10 digits (`phoneKey`).

## Security

- Passwords use Node's `crypto.scrypt` (N=2¹⁵, r=8, p=1, 16-byte random salt). At least 10 characters, and they must not contain the username.
- **Server-side sessions.** The cookie holds a random 256-bit token; the database stores only its SHA-256. The cookie is HttpOnly and SameSite=Lax, plus Secure with the `__Host-` prefix in production (`COOKIE_SECURE=false` turns this off for plain-HTTP LAN use). Sessions end after 12 h idle or 7 days at most. Changing or resetting a password, disabling a user or changing their role ends that user's sessions.
- Every page, server action and API route calls `requireUser()` itself; admin actions check the role on the server. Middleware only redirects visitors without a cookie to `/login`.
- 5 wrong passwords lock a username for 15 minutes. Errors never reveal whether a username exists, and unknown usernames take the same time to reject.
- `?next=` after sign-in only accepts same-site paths. Security headers are set in `next.config.ts` (no framing, `nosniff`, `same-origin` referrer policy, restrictive permissions policy). Server Actions get Next.js's built-in Origin check against CSRF. CSV cells are protected against spreadsheet formula injection.

## Speed

The app is built to feel instant on a cheap phone:

- **Mostly server-rendered.** The shared JS is ~102 kB; most screens add 1–8 kB. Recharts (the heaviest library) loads only on Analytics, after the numbers are on screen.
- **The menu is cached** across requests (`unstable_cache`, tag `menu`) and invalidated the moment any item changes. New Order, Menu and the public `/m` page usually don't touch the database for it.
- **Streaming.** The greeting strip on New Order streams in separately, so the menu appears straight away. Each route has its own loading skeleton.
- **Few, parallel queries.** Every page runs its queries in parallel with only the fields it needs. The session lookup is cached per request, and "last seen" is written at most every 5 minutes, without waiting for it. Analytics uses MongoDB aggregation pipelines (one `$facet` per collection).
- **Indexes** on everything the screens filter or sort by: status+createdAt, createdAt, balanceDue, phone, phoneKey, payment date and method, customer name words.
- Customer lookup is a small cancellable `GET` with a 180 ms debounce; filtering on Dues happens in the browser.
- Use `npm run build && npm start` in the shop. Dev mode is much slower.

## Design

The palette follows the shop's signboard: warm cream background, **paan-leaf green** (`leaf`) for primary actions, **rani pink** (`rani`) as the accent, and a touch of gold. All colours are Tailwind theme tokens in `src/app/globals.css`. Headings use Fraunces, body text DM Sans (via `next/font`). The logo is a paan leaf. Each menu category has its own icon and colour (`src/lib/categories.ts`); unknown categories get a stable colour from a hash of their name. On phones: a floating bottom nav with a central **New order** button, bottom sheets, and large tap targets. On desktop: a pill nav and a sticky bill beside the menu.

## Project layout

```
prisma/schema.prisma        data model        prisma/seed.ts     sample data
scripts/                    admin, user and backfill scripts
src/middleware.ts           cookie-presence redirect only
src/lib/orders.ts           all order/payment mutations (transactions)
src/lib/pricing.ts          discount, status and allocation rules (shared with the client)
src/lib/auth/               passwords, sessions, login throttle
src/lib/analytics.ts        aggregation pipelines
src/app/(app)/              signed-in screens     src/app/m/    public menu
src/app/actions/            server actions        src/app/api/  customer lookup + CSV export
```
