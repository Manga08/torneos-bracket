# Torneos Bracket (React + Vite + Supabase)

Plataforma web para **crear, administrar y publicar torneos** (brackets) con **actualización en tiempo real**, **temas visuales por torneo**, **colaboradores con permisos**, y un **panel de super admin** para gestionar usuarios/roles.

---

## Tabla de contenido

- [Qué hace la app (funcional)](#qué-hace-la-app-funcional)
- [Stack / Tecnologías](#stack--tecnologías)
- [Quickstart](#quickstart)
- [Variables de entorno](#variables-de-entorno)
- [Base de datos (Supabase): tablas, RLS y configuración](#base-de-datos-supabase-tablas-rls-y-configuración)
- [Arquitectura del código](#arquitectura-del-código)
  - [Estructura por carpetas](#estructura-por-carpetas)
  - [Reglas del repo (importantes)](#reglas-del-repo-importantes)
  - [Rutas principales](#rutas-principales)
- [Tests (robustos y escalables)](#tests-robustos-y-escalables)
- [Cómo extender el proyecto](#cómo-extender-el-proyecto)
  - [Crear una nueva feature](#crear-una-nueva-feature)
  - [Crear un nuevo componente](#crear-un-nuevo-componente)
  - [Agregar un nuevo tema](#agregar-un-nuevo-tema)
  - [Agregar lógica de datos (API + hooks)](#agregar-lógica-de-datos-api--hooks)
- [Scripts disponibles](#scripts-disponibles)
- [Troubleshooting](#troubleshooting)
- [Notas de seguridad](#notas-de-seguridad)

---

## Qué hace la app (funcional)

### Autenticación y cuenta

- **Login** con email+password.
- **Registro** de usuarios (sign up).
- **Mi cuenta**: actualizar:
  - `display_name` (en `public.profiles`)
  - email (requiere confirmación por correo)
  - contraseña
- **Recuperación de contraseña** (password reset por email).

### Roles y permisos

- Roles soportados: `super_admin | admin | editor | viewer`.
- El rol vive en `public.profiles.role` (ENUM `public.user_role`).
- `super_admin` puede definirse por:
  - rol `super_admin`, o
  - lista de correos en `VITE_SUPER_ADMIN_EMAILS` (comma-separated).
- Colaboradores por torneo en `public.user_tournament_permissions` (por ahora `can_edit: boolean`).

### Torneos

- **Dashboard**: lista de torneos accesibles para el usuario (depende de tu RLS/políticas).
- **Crear torneo**:
  - define metadatos y `config` (formato, participantes máximos, banderas como “tercer puesto”, etc.)
  - previsualización de tema
- **Administración (detalle del torneo)**:
  - Setup: añadir/importar participantes, aleatorizar seeds, toggles de configuración, preview del bracket
  - Bracket: manejo del cuadro y resultados
  - Settings: configurar datos del torneo, tema, colaboradores, etc.
  - Acciones críticas protegidas por `canEdit` (UI + RLS recomendado).
- **Vista pública** por `slug` con **realtime**.

### Temas

- Sistema centralizado en `src/features/themes`:
  - `default`, `valorant`
- Se aplica por clase en `<body>`: `theme-default`, `theme-valorant`, etc.
- `TournamentDetail`, `PublicTournamentView` y `CreateTournament` resuelven tema desde el torneo (o fallback) y lo aplican.

### Realtime (Supabase Realtime)

- Suscripciones a cambios de:
  - torneo
  - matches
- También para la vista pública, con callbacks dedicados.

---

## Stack / Tecnologías

- **React + TypeScript**
- **Vite**
- **Tailwind CSS v4** (via `@tailwindcss/vite`) + estilos propios en `src/index.css`
- **Supabase**:
  - Auth
  - Postgres
  - Realtime
  - RLS (Row Level Security)
- **Zustand** para estado global de auth
- **Vitest + Testing Library** para tests unitarios/integración
- **Playwright** (base) para E2E
- **ESLint + Prettier** como guardrails de calidad

---

## Quickstart

1. Instala dependencias:

```bash
npm i
```

2. Crea tu `.env.local` (ver sección de env):

```bash
cp .env.example .env.local # si existe; si no, crea el archivo a mano
```

3. Corre en dev:

```bash
npm run dev
```

4. Verificación completa (recomendado antes de commit/push):

```bash
npm run verify
```

---

## Variables de entorno

El proyecto centraliza env en `src/shared/config/env.ts`. **Evita usar `import.meta.env` directamente** fuera de esa capa.

Crea un `.env.local` con:

```bash
# Supabase
VITE_SUPABASE_URL="https://xxxx.supabase.co"
VITE_SUPABASE_ANON_KEY="eyJhbGciOi..."

# Super admin fallback (opcional)
# Lista separada por comas. Ej:
# VITE_SUPER_ADMIN_EMAILS="admin@tuapp.com,otro@tuapp.com"
VITE_SUPER_ADMIN_EMAILS=""

# Redirects para emails de Auth (importante)
# Deben existir en Supabase Auth -> URL Configuration -> Redirect URLs
VITE_AUTH_EMAIL_REDIRECT_URL="http://localhost:5173/auth/callback"
VITE_AUTH_RESET_PASSWORD_REDIRECT_URL="http://localhost:5173/auth/reset-password"
```

> En dev, si faltan `VITE_SUPABASE_URL` o `VITE_SUPABASE_ANON_KEY`, el getter lanza error para evitar estados raros.

---

## Base de datos (Supabase): tablas, RLS y configuración

### Tipos / “source of truth”

Los tipos de dominio actuales se apoyan en:

- `src/types/database.ts` (interfaces principales: `Tournament`, `Participant`, `Match`, `Profile`)
- `src/features/tournaments/types/domain.ts` (ej: `TournamentConfig` como “single source of truth”)
- `src/features/tournaments/types/dbTypes.ts` (aliases de filas)

### Tablas mínimas esperadas

- `public.tournaments`
- `public.participants`
- `public.matches`
- `public.profiles`
- `public.user_tournament_permissions` (colaboradores)

### Importante: sincronía Auth ↔ profiles

La app asume que existe (o se crea) un registro en `public.profiles` ligado a `auth.users.id`.
Lo más común es usar un **trigger** “on user created” que inserta una fila en `profiles`.

### Configuración de URLs en Supabase Auth

Para que registro y reset-password funcionen:

- Supabase Dashboard → **Authentication → URL Configuration**
- Añade a **Redirect URLs**:
  - `http://localhost:5173/auth/callback`
  - `http://localhost:5173/auth/reset-password`
- Configura **Site URL** como tu dominio base (ej: `http://localhost:5173` en local)

### SQL recomendado (roles + permisos + RLS)

> Nota: adapta esto a tu política de privacidad. Si quieres que “Mis Torneos” realmente sea “solo mis torneos”, tu política `SELECT` de tournaments NO debería ser `USING (true)`.

```sql
-- =========================
-- 1) Roles en profiles
-- =========================
DO $$ BEGIN
    CREATE TYPE public.user_role AS ENUM ('super_admin', 'admin', 'editor', 'viewer');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'super_admin';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'admin';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'editor';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'viewer';

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS role public.user_role DEFAULT 'viewer'::public.user_role;

UPDATE public.profiles
SET role = 'viewer'::public.user_role
WHERE role IS NULL;

-- Helper para super admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'super_admin'::public.user_role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =========================
-- 2) Tabla de permisos por torneo
-- =========================
CREATE TABLE IF NOT EXISTS public.user_tournament_permissions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tournament_id uuid REFERENCES public.tournaments(id) ON DELETE CASCADE NOT NULL,
  can_edit boolean DEFAULT true NOT NULL,
  UNIQUE(user_id, tournament_id)
);

CREATE INDEX IF NOT EXISTS idx_utp_user_id ON public.user_tournament_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_utp_tournament_id ON public.user_tournament_permissions(tournament_id);


-- =========================
-- 3) RLS sugerido (ajústalo a tu caso)
-- =========================
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;

-- SELECT (ejemplo seguro):
-- - Público: torneos con is_public = true
-- - Autenticado: owner o collaborator
DROP POLICY IF EXISTS "Tournaments are viewable by public/owners/collabs" ON public.tournaments;
CREATE POLICY "Tournaments are viewable by public/owners/collabs"
ON public.tournaments
FOR SELECT
USING (
  is_public = true
  OR auth.uid() = created_by
  OR EXISTS (
    SELECT 1 FROM public.user_tournament_permissions p
    WHERE p.tournament_id = id AND p.user_id = auth.uid()
  )
  OR public.is_super_admin()
);

DROP POLICY IF EXISTS "Users can create tournaments" ON public.tournaments;
CREATE POLICY "Users can create tournaments"
ON public.tournaments
FOR INSERT
WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Owners/collabs can update tournaments" ON public.tournaments;
CREATE POLICY "Owners/collabs can update tournaments"
ON public.tournaments
FOR UPDATE
USING (
  auth.uid() = created_by
  OR EXISTS (
    SELECT 1 FROM public.user_tournament_permissions
    WHERE tournament_id = id AND user_id = auth.uid() AND can_edit = true
  )
  OR public.is_super_admin()
);

DROP POLICY IF EXISTS "Owners can delete tournaments" ON public.tournaments;
CREATE POLICY "Owners can delete tournaments"
ON public.tournaments
FOR DELETE
USING (
  auth.uid() = created_by
  OR public.is_super_admin()
);

-- Permisos: user_tournament_permissions
ALTER TABLE public.user_tournament_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View tournament permissions" ON public.user_tournament_permissions;
CREATE POLICY "View tournament permissions"
ON public.user_tournament_permissions
FOR SELECT
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.tournaments
    WHERE id = tournament_id AND created_by = auth.uid()
  )
  OR public.is_super_admin()
);

DROP POLICY IF EXISTS "Manage tournament permissions" ON public.user_tournament_permissions;
CREATE POLICY "Manage tournament permissions"
ON public.user_tournament_permissions
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.tournaments
    WHERE id = tournament_id AND created_by = auth.uid()
  )
  OR public.is_super_admin()
);

-- Profiles: para panel de super admin
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Super admins can view all profiles" ON public.profiles;
CREATE POLICY "Super admins can view all profiles"
ON public.profiles FOR SELECT
USING (public.is_super_admin());

DROP POLICY IF EXISTS "Super admins can update profiles" ON public.profiles;
CREATE POLICY "Super admins can update profiles"
ON public.profiles FOR UPDATE
USING (public.is_super_admin());

-- Backfill: owner siempre queda como editor (opcional)
INSERT INTO public.user_tournament_permissions (user_id, tournament_id, can_edit)
SELECT created_by, id, true
FROM public.tournaments
WHERE created_by IS NOT NULL
ON CONFLICT (user_id, tournament_id) DO NOTHING;
```

---

## Arquitectura del código

### Estructura por carpetas

> El repo usa **arquitectura por features** + una capa `app/` para composición y “wiring”.

```
src/
  app/
    router/            # AppRouter + guards (ProtectedRoute)
    providers/         # AppProviders (BrowserRouter + bootstrap auth)
    layout/            # AppLayout (shell global)

  features/
    auth/
      api/             # authApi, usersApi
      components/      # LoginForm, RegisterForm
      hooks/           # useAuth wrapper
      pages/           # LoginPage, RegisterPage, AccountPage, UserManagement (admin)
      types/           # authTypes, userTypes

    tournaments/
      api/             # facade + módulos (crud, participants, matches, realtime, public, permissions)
      components/      # UI por dominio (header, setup, settings, collaborators, bracket, etc.)
      hooks/           # useDashboardTournaments, usePublicTournament, useTournamentPermissions
      pages/           # Dashboard, CreateTournament, TournamentDetail (admin), PublicTournamentView
      types/           # domain.ts (TournamentConfig), dbTypes.ts, permissions.ts
      utils/           # bracketUtils, tournamentLogic, permissions helpers

    themes/
      config/          # themes aislados + registry
      hooks/           # useBodyTheme, useTournamentTheme
      types/           # themeTypes

  shared/
    api/               # supabaseClient (cliente único)
    config/            # env.ts (centralizado)
    components/ui/     # AppButton, ConfirmDialog, Navbar
    store/             # authStore (Zustand)
    ...                # (carpetas preparadas para crecer)

  components/layout/   # Layout legacy “real” usado por AppLayout (hasta migración total)
  types/               # database.ts (interfaces principales)
  setupTests.ts        # setup global de Vitest/RTL
  index.css            # estilos globales + tokens/theme variables
```

### Reglas del repo (importantes)

1. **Cliente Supabase único**

- Se crea en `src/shared/api/supabaseClient.ts`.
- No crees clientes duplicados.

2. **No imports relativos profundos hacia `shared/` o `types/`**

- Usa alias `@/shared/...` y `@/types/...`.
- Existe guardrail automático: `npm run lint:imports`.

3. **Feature boundaries**

- Lógica del dominio (torneos/auth/themes) vive dentro de `src/features/<feature>/...`.
- `shared/` es para cosas reutilizables por múltiples features.

4. **Separación de responsabilidades**

- **Pages**: orquestan, llaman hooks, coordinan navegación/estado.
- **Components**: idealmente presentacionales (reciben props/callbacks).
- **Hooks**: data-fetching, realtime, permisos, estados derivados.
- **API**: encapsula Supabase y devuelve datos tipados.

5. **Antes de integrar cambios**

- Ejecuta siempre:

```bash
npm run verify
```

### Rutas principales

Definidas en `src/app/router/AppRouter.tsx`:

- `/` → Dashboard (protegido)
- `/create` → Crear torneo (protegido)
- `/tournament/:id` → Admin Tournament Detail (protegido)
- `/t/:slug` → Vista pública
- `/login` → Login
- `/register` → Registro
- `/account` → Mi cuenta (protegido)
- `/admin/users` → Panel de usuarios (solo super admin, validación en página)

---

## Tests (robustos y escalables)

### Unit + Integration

- **Runner**: Vitest
- **UI testing**: React Testing Library
- **Setup**: `src/setupTests.ts` (incluye `@testing-library/jest-dom`)
- **Config**: `vite.config.ts` define `environment: 'jsdom'`

Ejecutar:

```bash
npm run test
npm run test:watch
```

Dónde viven:

- `src/**/*.test.ts`
- `src/**/*.test.tsx`

Qué se testea hoy:

- Utils de brackets (generación y reglas)
- Lógica de “Swiss” / standings
- API (mockeando el cliente de Supabase)
- Componentes clave (render + callbacks)

### E2E (base)

- **Playwright** (carpeta `tests/e2e/`)
- Specs placeholder para expandir.

Ejecutar:

```bash
npm run test:e2e
```

### “Verify” de integridad

`npm run verify` corre:

1. `lint:imports` (guardrail alias)
2. `build`
3. `test`

---

## Cómo extender el proyecto

### Crear una nueva feature

1. Crea carpeta:

```
src/features/miFeature/
  api/
  components/
  hooks/
  pages/
  types/
  utils/
  index.ts
```

2. Reglas:

- Si accedes a Supabase: **solo desde `api/`**.
- Si vas a compartir algo entre features: muévelo a `shared/`.
- Mantén imports hacia `shared/` y `types/` con alias `@/`.

3. Conecta rutas en `src/app/router/AppRouter.tsx`.

4. Agrega tests:

- unit: `utils/*.test.ts`
- componentes: `components/*.test.tsx`
- hooks: `hooks/*.test.ts` (si aplica; a veces se testea por integración en páginas)

### Crear un nuevo componente

**Si es dominio específico** (ej. torneos):

- Va en `src/features/tournaments/components/...`
- Ideal: presentacional (props + callbacks), sin Supabase dentro del componente.

**Si es reutilizable global**

- Va en `src/shared/components/ui/` (o `shared/components/...` según la naturaleza)

Checklist:

- Tipos en `types/` del feature si son de dominio.
- Evitar `any`. Si algo es JSON flexible: usa `Record<string, unknown>` o define un tipo específico.
- Si afecta imports, corre:

```bash
npm run verify
```

### Agregar un nuevo tema

1. Crea archivo de config:

- `src/features/themes/config/<miTema>.ts` (ej: `fifaTheme.ts`)
- Debe exportar un `AppTheme`.

2. Regístralo en:

- `src/features/themes/themeRegistry.ts`
  - añade el id a `ThemeId`
  - agrega el tema a `THEME_CONFIGS`
  - inclúyelo en `AVAILABLE_THEMES`

3. Agrega estilos en `src/index.css`

- Crea la clase:

```css
.theme-miTema {
  /* variables CSS del tema */
}
```

4. La UI ya usa:

- `useTournamentTheme()` para resolver el tema del torneo
- `useBodyTheme()` para aplicarlo en `<body>`

### Agregar lógica de datos (API + hooks)

Patrón recomendado:

- API: `src/features/<feature>/api/*.api.ts`
- Facade: `src/features/<feature>/api/<feature>Api.ts` solo re-exports
- Hook: `src/features/<feature>/hooks/useX.ts` consume la API + maneja loading/error/subscriptions

Ejemplo actual:

- `src/features/tournaments/api/tournamentsApi.ts` es facade
- módulos internos:
  - `tournamentCrud.api.ts`
  - `participants.api.ts`
  - `matches.api.ts`
  - `realtime.api.ts`
  - `public.api.ts`
  - `permissions.api.ts`

---

## Scripts disponibles

Desde `package.json`:

- `npm run dev` → servidor local
- `npm run build` → build producción
- `npm run preview` → preview del build
- `npm run typecheck` → TypeScript check
- `npm run lint` → ESLint
- `npm run format` → Prettier (write)
- `npm run format:check` → Prettier check
- `npm run test` → Vitest run
- `npm run test:watch` → Vitest watch
- `npm run test:e2e` → Playwright
- `npm run lint:imports` → guardrail de imports (script Node)
- `npm run verify` → `lint:imports` + `build` + `test`

---

## Troubleshooting

### 1) “Missing env var …”

- Asegura `.env.local` con `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
- Reinicia el dev server.

### 2) Registro / reset-password no redirige bien

- Verifica:
  - `VITE_AUTH_EMAIL_REDIRECT_URL`
  - `VITE_AUTH_RESET_PASSWORD_REDIRECT_URL`
- En Supabase: Authentication → URL Configuration:
  - agrega esas URLs a “Redirect URLs”

### 3) “No tengo torneos en dashboard” (o veo más de los que debería)

- Es un tema de **RLS/políticas**.
- Revisa tu policy `SELECT` en `public.tournaments` para que refleje:
  - owner/collabs
  - público (si aplica) por `is_public = true`

### 4) Errores por imports relativos

- Corre:

```bash
npm run lint:imports
```

- Si falla: usa alias `@/shared/...` o `@/types/...`.

---

## Notas de seguridad

- La UI oculta acciones según `canEdit`, pero **la seguridad real debe estar en RLS**.
- Nunca dependas solo de “ocultar botones”.
- Para el panel de usuarios (`/admin/users`), asegúrate de tener RLS correcto en `public.profiles`:
  - usuarios ven solo su perfil
  - super admin ve/edita todos

---

## Licencia

Define aquí la licencia si vas a open-source (MIT / Apache-2.0 / privada, etc.).
