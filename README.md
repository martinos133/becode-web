# BeCode Web – Next.js + Nest.js + Supabase

Projekt pozostáva z **Next.js** frontendu a **Nest.js** API s prihlásením cez **Supabase** (Auth + DB).

## Požiadavky

- Node.js 18+
- Účet [Supabase](https://supabase.com) a projekt

## Rýchly štart

### 1. Supabase

1. V [Supabase Dashboard](https://app.supabase.com) vytvor projekt (alebo použij existujúci).
2. **Nastavenia → API** skopíruj:
   - **Project URL** → `SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `SUPABASE_ANON_KEY` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **JWT Secret** → `SUPABASE_JWT_SECRET` (potrebné pre Nest.js overenie tokenov)
3. V **Authentication → Users** pridaj používateľa (alebo sa zaregistruj):
   - E-mail: `muha@becode.sk`
   - Heslo: `Welcome2025+`
4. Pre reset hesla cez email: **Authentication → URL Configuration** → pridaj do **Redirect URLs**:
   - `http://localhost:3000/reset-password` (vývoj)
   - `https://tvojadomena.sk/reset-password` (produkcia)

### 2. Env premenné

**API (apps/api):**

```bash
cd apps/api
cp .env.example .env
# Uprav .env: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_JWT_SECRET
# Pre vytváranie nových používateľov cez Admin: pridaj SUPABASE_SERVICE_ROLE_KEY (Project Settings → API)
```

**Web (apps/web):**

```bash
cd apps/web
cp .env.local.example .env.local
# Uprav .env.local: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### 3. Inštalácia a spustenie

V koreni projektu:

```bash
npm install
npm run dev
```

- Frontend: [http://localhost:3000](http://localhost:3000)
- API: [http://localhost:3001](http://localhost:3001)

### 4. Prihlásenie

1. Otvor [http://localhost:3000](http://localhost:3000) → **Prihlásiť sa**.
2. E-mail: `muha@becode.sk`, heslo: `Welcome2025+`.
3. Po prihlásení presmerovanie na **Dashboard**.

## Štruktúra

- **apps/web** – Next.js (App Router), login, dashboard, Supabase Auth
- **apps/api** – Nest.js, endpointy `/auth/health`, `/auth/me` (chránený JWT), overenie Supabase JWT

## API

- `GET /auth/health` – verejný health check
- `GET /auth/me` – vráti prihláseného používateľa (hlavička `Authorization: Bearer <access_token>`)

Token získaš po `signInWithPassword` z Supabase na frontende a posielaš ho v požiadavkách na API.
