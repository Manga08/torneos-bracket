# 🏆 Torneos Bracket

![React](https://img.shields.io/badge/React-v19-blue?logo=react)
![Vite](https://img.shields.io/badge/Vite-Lightning-yellow?logo=vite)
![TailwindCSS](https://img.shields.io/badge/Tailwind_v4-CSS-38B2AC?logo=tailwind-css)
![Supabase](https://img.shields.io/badge/Supabase-Backend-green?logo=supabase)
![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue?logo=typescript)
![License](https://img.shields.io/badge/License-MIT-purple)

Plataforma web moderna y reactiva para **crear, administrar y publicar torneos** (brackets) con **actualización en tiempo real**. Diseñada para ofrecer una experiencia de usuario premium con **temas visuales inmersivos** (Valorant, FIFA/EA FC), gestión de permisos granulares y un panel de administración robusto.

---

## 📑 Tabla de Contenido

- [✨ Características Principales](#-características-principales)
- [🛠️ Stack Tecnológico](#️-stack-tecnológico)
- [🚀 Quickstart](#-quickstart)
- [🔑 Variables de Entorno](#-variables-de-entorno)
- [🎨 Sistema de Temas](#-sistema-de-temas)
- [🗄️ Base de Datos (Supabase)](#️-base-de-datos-supabase)
- [🏗️ Arquitectura del Proyecto](#️-arquitectura-del-proyecto)
- [🧪 Testing](#-testing)
- [🧩 Cómo Extender el Proyecto](#-cómo-extender-el-proyecto)
- [📜 Scripts Disponibles](#-scripts-disponibles)
- [🔒 Seguridad y Roles](#-seguridad-y-roles)

---

## ✨ Características Principales

### 👤 Autenticación y Perfil

- **Login Seguro**: Autenticación vía Email/Password con Supabase Auth.
- **Gestión de Cuenta**: Actualización de perfil (`display_name`), cambio de correo (con confirmación) y reset de contraseña.
- **Roles de Usuario**: Sistema RBAC con roles `super_admin`, `admin`, `editor` y `viewer`.

### 🏆 Gestión de Torneos

- **Dashboard Intuitivo**: Vista centralizada de tus torneos y colaboraciones.
- **Creación Flexible**: Configura formato (Eliminación Simple, Doble, Grupos, Suizo), número de participantes y opciones avanzadas (tercer puesto, etc.).
- **Panel de Administración**:
  - **Setup**: Importación masiva de participantes, drag & drop de seeds, aleatorización.
  - **Bracket**: Gestión visual de partidos, avance automático de ganadores, reversión de resultados (Undo).
  - **Settings**: Configuración general, gestión de colaboradores y permisos.
- **Vista Pública**: URL única (`/t/:slug`) para compartir el torneo con espectadores, optimizada para móviles y escritorio.

### ⚡ Realtime Experience

- **Sincronización Instantánea**: Los cambios en el bracket se reflejan en tiempo real para todos los espectadores conectados (gracias a Supabase Realtime).
- **Feedback Visual**: Indicadores de estado y notificaciones toast para acciones críticas.

---

## 🛠️ Stack Tecnológico

El proyecto utiliza las últimas versiones de las herramientas más potentes del ecosistema React:

- **Frontend Core**:
  - [React v19](https://react.dev/)
  - [TypeScript](https://www.typescriptlang.org/)
  - [Vite](https://vitejs.dev/)
  - [React Router v7](https://reactrouter.com/)
- **Estilos & UI**:
  - [Tailwind CSS v4](https://tailwindcss.com/) (vía `@tailwindcss/vite`)
  - **Lucide React** (Iconografía)
  - **Framer Motion** (Animaciones fluidas)
  - **Sonner** (Notificaciones toast)
- **Backend & Data**:
  - [Supabase](https://supabase.com/) (Auth, Postgres, Realtime, Storage)
  - **Zustand** (Gestión de estado global ligero)
- **Calidad & Testing**:
  - **Vitest** + **Testing Library** (Unit/Integration)
  - **Playwright** (E2E)
  - **ESLint** + **Prettier**

---

## 🚀 Quickstart

Sigue estos pasos para levantar el proyecto en tu entorno local:

1.  **Clonar e Instalar**:

    ```bash
    git clone <repo-url>
    cd torneos-bracket
    npm install
    ```

2.  **Configurar Entorno**:
    Crea un archivo `.env.local` en la raíz (puedes basarte en `.env.example` si existe).

    ```bash
    cp .env.example .env.local
    ```

3.  **Iniciar Servidor de Desarrollo**:

    ```bash
    npm run dev
    ```

    La app estará disponible en `http://localhost:5173`.

4.  **Verificación Inicial**:
    Antes de empezar a programar, asegúrate de que todo está en orden:
    ```bash
    npm run verify
    ```

---

## 🔑 Variables de Entorno

La configuración se centraliza en `src/shared/config/env.ts`. **Importante**: No uses `import.meta.env` directamente en los componentes.

Define estas variables en tu `.env.local`:

```ini
# --- Supabase Configuration ---
VITE_SUPABASE_URL="https://tu-proyecto.supabase.co"
VITE_SUPABASE_ANON_KEY="eyJh..."

# --- Super Admin (Opcional) ---
# Lista de emails separados por comas que tendrán permisos globales automáticamente
VITE_SUPER_ADMIN_EMAILS="admin@tuapp.com,dev@tuapp.com"

# --- Auth Redirects ---
# Deben coincidir con la configuración en Supabase Dashboard -> Auth -> URL Configuration
VITE_AUTH_EMAIL_REDIRECT_URL="http://localhost:5173/auth/callback"
VITE_AUTH_RESET_PASSWORD_REDIRECT_URL="http://localhost:5173/auth/reset-password"
```

---

## 🎨 Sistema de Temas

La aplicación cuenta con un potente motor de temas que transforma completamente la interfaz. Los temas se configuran en `src/features/themes`.

### Temas Disponibles

| Tema             | ID         | Descripción                         | Estilo Visual                                                                                        |
| :--------------- | :--------- | :---------------------------------- | :--------------------------------------------------------------------------------------------------- |
| **Default**      | `default`  | Tema base moderno y limpio.         | Oscuro, acentos índigo/violeta, tipografía Inter.                                                    |
| **Valorant**     | `valorant` | Inspirado en el shooter de Riot.    | Rojo agresivo, formas angulares, tipografía Teko/Barlow, texturas tácticas.                          |
| **EA FC / FIFA** | `fifa`     | Inspirado en simuladores de fútbol. | Verde neón (`#6FFF38`), fondo nocturno profundo, tipografía deportiva, detalles de "campo de juego". |

### Cómo funciona

El tema se aplica inyectando una clase CSS en el `<body>` (`.theme-valorant`, `.theme-fifa`). Los componentes UI (`AppButton`, `BracketNode`, etc.) reaccionan a estas clases usando variables CSS y selectores específicos definidos en `src/index.css`.

---

## 🗄️ Base de Datos (Supabase)

El proyecto utiliza PostgreSQL con Row Level Security (RLS) para máxima seguridad.

### Esquema Principal

- `public.tournaments`: Configuración y estado de los torneos.
- `public.participants`: Jugadores o equipos inscritos.
- `public.matches`: Partidos, resultados y relaciones (next_match, loser_match).
- `public.profiles`: Datos extendidos de usuarios (roles).
- `public.user_tournament_permissions`: Tabla pivote para colaboradores.

### Configuración SQL Recomendada

Ejecuta este script en el SQL Editor de Supabase para configurar roles y políticas base:

```sql
-- 1. ENUM de Roles
CREATE TYPE public.user_role AS ENUM ('super_admin', 'admin', 'editor', 'viewer');

-- 2. Tabla de Perfiles (Extensión de auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email text,
  display_name text,
  role public.user_role DEFAULT 'viewer'::public.user_role,
  created_at timestamptz DEFAULT now()
);

-- 3. Función Helper para Super Admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'super_admin'::public.user_role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Políticas RLS (Ejemplo simplificado para Torneos)
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ver torneos públicos o propios" ON public.tournaments
FOR SELECT USING (
  is_public = true OR
  auth.uid() = created_by OR
  public.is_super_admin()
);

CREATE POLICY "Crear torneos" ON public.tournaments
FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Editar torneos propios" ON public.tournaments
FOR UPDATE USING (
  auth.uid() = created_by OR public.is_super_admin()
);
```

---

## 🏗️ Arquitectura del Proyecto

El código sigue una arquitectura modular basada en **Features**, diseñada para escalar.

```
src/
├── app/                  # Capa de composición global
│   ├── layout/           # Shell de la aplicación (Navbar, Footer)
│   ├── providers/        # Contextos globales (Auth, Router, Theme)
│   └── router/           # Definición de rutas y Guards
│
├── features/             # Módulos de dominio (El corazón de la app)
│   ├── auth/             # Login, Registro, Perfil
│   ├── tournaments/      # Lógica de torneos, brackets, partidos
│   │   ├── api/          # Endpoints y servicios
│   │   ├── components/   # Componentes específicos (BracketView, MatchModal)
│   │   ├── hooks/        # Lógica de negocio (useTournament, usePermissions)
│   │   └── pages/        # Vistas principales
│   └── themes/           # Configuración y lógica de temas visuales
│
├── shared/               # Utilidades reutilizables
│   ├── api/              # Cliente Supabase singleton
│   ├── components/ui/    # UI Kit (Botones, Modales, Inputs)
│   ├── config/           # Variables de entorno
│   └── store/            # Estado global (Zustand)
│
└── types/                # Definiciones de tipos globales (Database)
```

### Reglas de Oro 🥇

1.  **Feature Isolation**: Lo que pasa en `features/auth` se queda en `features/auth`. Si algo debe ser compartido, muévelo a `shared/`.
2.  **Imports Limpios**: Usa los alias (`@/shared`, `@/features`) en lugar de rutas relativas largas (`../../`).
3.  **Single Source of Truth**: Los tipos de base de datos viven en `src/types/database.ts`.

---

## 🧪 Testing

La calidad es innegociable. Tenemos tres niveles de tests:

1.  **Unitarios & Integración** (Vitest):
    Para lógica de negocio (generación de brackets) y componentes aislados.

    ```bash
    npm run test
    npm run test:watch
    ```

2.  **End-to-End** (Playwright):
    Para flujos críticos de usuario (Crear torneo, Login).

    ```bash
    npm run test:e2e
    ```

3.  **Verificación Estática**:
    Linting, formateo y chequeo de tipos.
    ```bash
    npm run verify
    ```

---

## 🧩 Cómo Extender el Proyecto

### Crear una nueva Feature

1.  Crea `src/features/mi-feature`.
2.  Estructura interna: `api`, `components`, `hooks`, `pages`.
3.  Registra las rutas en `src/app/router/AppRouter.tsx`.

### Agregar un Nuevo Tema

1.  Crea la configuración en `src/features/themes/config/miTema.ts`.
2.  Define la paleta de colores y tipografía.
3.  Registra el tema en `themeRegistry.ts`.
4.  Añade los estilos CSS específicos en `src/index.css` bajo la clase `.theme-miTema`.

---

## 📜 Scripts Disponibles

| Script             | Descripción                                                                                |
| :----------------- | :----------------------------------------------------------------------------------------- |
| `npm run dev`      | Inicia el servidor de desarrollo.                                                          |
| `npm run build`    | Compila la aplicación para producción.                                                     |
| `npm run preview`  | Vista previa local del build de producción.                                                |
| `npm run lint`     | Busca problemas en el código (ESLint).                                                     |
| `npm run lint:fix` | Intenta corregir problemas de lint automáticamente.                                        |
| `npm run format`   | Formatea todo el código con Prettier.                                                      |
| `npm run test`     | Ejecuta la suite de tests unitarios.                                                       |
| `npm run verify`   | **El comando supremo**: corre lint, format check, build y tests. Úsalo antes de cada push. |

---

## 🔒 Seguridad y Roles

- **RLS es la ley**: La seguridad real está en la base de datos. La UI solo oculta botones, pero Supabase RLS bloquea los accesos no autorizados.
- **Colaboradores**: Se gestionan mediante la tabla `user_tournament_permissions`. Actualmente soportamos permisos de edición (`can_edit`).
- **Super Admin**: Tiene acceso total (bypass de algunas reglas de negocio en UI, y políticas RLS permisivas).

---

_Desarrollado con ❤️ usando React y Supabase._
