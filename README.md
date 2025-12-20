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

El proyecto utiliza PostgreSQL con Row Level Security (RLS) para máxima seguridad. A continuación se describe el esquema actual de la base de datos.

### 📋 Esquema de Tablas

#### `tournaments`

Almacena la información principal de cada torneo.

- `id`: Identificador único (UUID).
- `name`: Nombre del torneo.
- `slug`: URL amigable única para compartir.
- `game`: Juego del torneo (ej: 'valorant', 'fifa'). Define el tema visual por defecto.
- `format`: Formato de competición ('single_elim', 'double_elim', 'round_robin', 'league').
- `config`: JSON con configuraciones específicas (tercer puesto, puntos por victoria, etc.).
- `is_public`: Si es visible para todos o solo para administradores.
- `created_by`: ID del usuario creador (Owner).
- `status`: Estado del ciclo de vida ('draft', 'active', 'completed').
- `created_at` / `updated_at`: Timestamps de auditoría.

#### `participants`

Jugadores o equipos inscritos en un torneo.

- `id`: Identificador único.
- `tournament_id`: Torneo al que pertenece.
- `name`: Nombre del equipo o jugador.
- `tag`: Etiqueta corta o abreviatura (opcional).
- `seed`: Número de siembra para el ordenamiento inicial.
- `metadata`: JSON para datos extra (avatar, estadísticas, info de contacto).
- `created_at` / `updated_at`: Timestamps.

#### `matches`

Representa cada enfrentamiento en el bracket o liga.

- `id`: Identificador único.
- `tournament_id`: Torneo al que pertenece.
- `stage_id`: Etapa del torneo (fase de grupos, playoffs, etc.).
- `round_number`: Número de ronda (1 = Octavos, 2 = Cuartos, etc.).
- `match_number`: Orden del partido dentro de la ronda.
- `participant_a_id` / `participant_b_id`: IDs de los participantes enfrentados.
- `score_a` / `score_b`: Puntuación actual.
- `winner_id`: ID del participante ganador.
- `state`: Estado del partido ('pending', 'scheduled', 'in_progress', 'completed').
- `next_match_id`: ID del siguiente partido al que avanza el ganador.
- `loser_match_id`: ID del partido al que va el perdedor (para Double Elimination).
- `metadata`: JSON para detalles específicos (mapas, bans, info de rondas).
- `status`: Estado general ('pending', 'live', 'completed').

#### `stages`

Define las fases de un torneo (ej: "Fase de Grupos", "Playoffs").

- `id`: Identificador único.
- `tournament_id`: Torneo al que pertenece.
- `name`: Nombre de la etapa.
- `type`: Tipo de etapa (ej: 'groups', 'elimination').
- `order`: Orden secuencial de la etapa.

#### `profiles`

Información extendida de los usuarios autenticados.

- `id`: Vinculado al `auth.users` de Supabase.
- `email`: Correo electrónico.
- `display_name`: Nombre visible en la plataforma.
- `avatar_url`: URL de la imagen de perfil.
- `role`: Rol global en la plataforma ('super_admin', 'admin', 'editor', 'viewer').

#### `user_tournament_permissions`

Gestiona los colaboradores por torneo.

- `id`: Identificador único.
- `user_id`: Usuario colaborador.
- `tournament_id`: Torneo compartido.
- `can_edit`: Booleano que otorga permisos de edición sobre el torneo.

---

## 🏗️ Arquitectura del Proyecto

Este proyecto adopta una **Arquitectura Modular basada en Features** (Feature-Sliced Design simplificado). A diferencia de la estructura tradicional por capas (donde tienes carpetas gigantes de `components`, `hooks`, `pages`), aquí organizamos el código por **dominio de negocio**.

### 🧠 Filosofía: ¿Por qué Features?

El objetivo es la **escalabilidad** y la **mantenibilidad**.

- **Cohesión**: Todo lo relacionado con una funcionalidad (ej: Autenticación) vive junto.
- **Desacoplamiento**: Modificar la lógica de los Torneos no debería romper el Login.
- **Escalabilidad**: Es fácil agregar nuevas features sin aumentar la complejidad cognitiva del proyecto base.

### 📐 Estructura Ideal de una Feature

Cada feature funciona como una "mini-aplicación" autocontenida. Esta es la estructura canónica que debe seguir cualquier nueva funcionalidad:

```
src/features/nombre-feature/
├── api/          # Servicios de conexión a backend (Supabase)
├── components/   # Componentes UI privados de esta feature
├── hooks/        # Lógica de estado y reglas de negocio (Custom Hooks)
├── pages/        # Vistas completas que se inyectan en el Router
├── types/        # Tipos TypeScript, Interfaces y DTOs propios del dominio
├── utils/        # Funciones puras de ayuda específicas
└── index.ts      # Public API: Exporta SOLO lo que el resto de la app necesita usar
```

_Nota: Actualmente algunas features antiguas pueden no tener la carpeta `types` separada y dependen de `src/types` globales, pero el objetivo es migrar hacia la estructura ideal._

### 📂 Estructura Actual del Proyecto

Así es como se materializa esta arquitectura en nuestro código fuente hoy:

```
src/
├── app/                  # Capa de Aplicación (Orquestación)
│   ├── layout/           # Shell principal (AppLayout) que envuelve las rutas
│   ├── providers/        # Contextos globales (Auth, Theme, QueryClient)
│   └── router/           # Configuración de rutas (React Router) y Guards de seguridad
│
├── features/             # Módulos de dominio (El corazón de la app)
│   ├── auth/             # Feature: Autenticación y Gestión de Usuarios
│   │   ├── api/          # Llamadas a Supabase Auth y Profiles
│   │   ├── components/   # Formularios de Login, Registro y Tablas de usuarios
│   │   ├── hooks/        # Hooks como useAuth, useUserManagement
│   │   ├── pages/        # Páginas: LoginPage, RegisterPage, AccountPage
│   │   └── types/        # Tipos locales de usuario y auth
│   ├── tournaments/      # Feature: Gestión de Torneos y Brackets
│   │   ├── api/          # CRUD de torneos, participantes y partidos
│   │   ├── components/   # Vistas del Bracket, Modales de resultados, Settings
│   │   ├── hooks/        # Lógica compleja (useTournament, useBracket)
│   │   ├── pages/        # Dashboard, Detalle de Torneo, Vista Pública
│   │   ├── types/        # Tipos de dominio (Tournament, Match, Participant)
│   │   └── utils/        # Algoritmos de generación de brackets y validaciones
│   └── themes/           # Feature: Sistema de Temas Visuales
│       ├── config/       # Definiciones de temas (Valorant, FIFA, Default)
│       ├── hooks/        # Hook para inyectar variables CSS (useTheme)
│       └── types/        # Definiciones de la interfaz AppTheme
│
├── shared/               # Utilidades reutilizables (Shared Kernel)
│   ├── api/              # Cliente Supabase singleton y helpers de fetch
│   ├── components/       # UI Kit genérico (Botones, Inputs, Dialogs, Navbar)
│   ├── config/           # Variables de entorno (env.ts)
│   ├── constants/        # Constantes estáticas de la app
│   └── store/            # Stores globales de Zustand (authStore)
│
├── types/                # Definiciones de tipos globales (Database Schema)
├── App.tsx               # Componente raíz que monta Providers y Router
└── main.tsx              # Punto de entrada de React (ReactDOM.createRoot)
```

### Reglas de Oro 🥇

1.  **Feature Isolation**: Una feature no debe importar detalles internos de otra. La comunicación debe ser mínima y a través de interfaces públicas.
2.  **Shared es Sagrado**: `shared/` contiene código que podría usarse en _cualquier_ app (botones, cliente http). No debe contener lógica de negocio ("goles", "torneos").
3.  **Single Source of Truth**: Aunque cada feature tenga sus tipos, el esquema de la base de datos (`database.ts`) es la verdad absoluta para los datos persistidos.

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

### 📦 Crear una nueva Feature

Para mantener la arquitectura modular y escalable, sigue estos pasos al añadir una nueva funcionalidad (ej: `ranking`):

1.  **Crear Estructura de Carpetas**:
    Crea el directorio `src/features/ranking` con la siguiente estructura interna:

    ```
    src/features/ranking/
    ├── api/          # Servicios de Supabase (rankingApi.ts)
    ├── components/   # Componentes UI específicos (RankingTable.tsx)
    ├── hooks/        # Lógica de negocio y estado (useRanking.ts)
    ├── pages/        # Vistas completas (RankingPage.tsx)
    ├── types/        # Definiciones TypeScript locales
    └── index.ts      # Barril de exportaciones (opcional)
    ```

2.  **Implementar Lógica (API & Hooks)**:
    - Define tus tipos en `types/index.ts`.
    - Crea las funciones de fetch en `api/rankingApi.ts` usando el cliente singleton `@/shared/api/supabaseClient`.
    - Crea un hook `useRanking` en `hooks/` que consuma la API y gestione estados de carga/error.

3.  **Desarrollar UI (Components & Pages)**:
    - Crea componentes pequeños en `components/`.
    - Compón la vista final en `pages/RankingPage.tsx`.

4.  **Registrar la Ruta**:
    Abre `src/app/router/AppRouter.tsx` y añade la nueva ruta:

    ```tsx
    // Importación (Lazy loading recomendado)
    const RankingPage = lazy(() => import('@/features/ranking/pages/RankingPage'));

    // En el router
    <Route
      path="/ranking"
      element={
        <ProtectedRoute>
          <RankingPage />
        </ProtectedRoute>
      }
    />;
    ```

### 🎨 Agregar un Nuevo Tema

El sistema de temas es flexible y permite cambiar radicalmente la apariencia. Supongamos que creamos el tema `cyberpunk`.

1.  **Crear Configuración del Tema**:
    Crea el archivo `src/features/themes/config/cyberpunkTheme.ts`:

    ```typescript
    import type { AppTheme } from '../types/themeTypes';

    export const cyberpunkTheme: AppTheme = {
      id: 'cyberpunk',
      name: 'Cyberpunk 2077',
      description: 'Neon, glitches y futuro distópico.',
      previewColor: '#FCEE0A', // Color representativo para el selector
      previewGradient: 'linear-gradient(135deg, #000 0%, #FCEE0A 100%)',
      palette: {
        background: '#000000',
        surface: '#1a1a1a',
        accent: '#FCEE0A', // Amarillo neón
        // ... resto de la paleta
      },
      // ... tipografía y formas
    };
    ```

2.  **Registrar el Tema**:
    Edita `src/features/themes/config/themeRegistry.ts`:
    - Importa tu configuración.
    - Añade `'cyberpunk'` al tipo `ThemeId`.
    - Agrega el objeto `cyberpunkTheme` al array `AVAILABLE_THEMES`.

3.  **Definir Estilos CSS**:
    En `src/index.css`, crea el bloque para tu tema. Aquí es donde ocurre la magia de las variables CSS:

    ```css
    .theme-cyberpunk {
      /* Variables Base (Sobrescriben los defaults) */
      --color-background: #000000;
      --color-surface: #121212;
      --color-primary: #fcee0a; /* Amarillo Cyberpunk */
      --color-text-main: #ffffff;

      /* Fuentes personalizadas */
      --font-display: 'Orbitron', sans-serif;

      /* Estilos específicos para componentes */
      .btn-primary {
        clip-path: polygon(10% 0, 100% 0, 100% 90%, 90% 100%, 0 100%, 0 10%);
        text-transform: uppercase;
        font-weight: 900;
      }
    }
    ```

    _Nota: Asegúrate de importar cualquier fuente nueva al inicio de `index.css`._

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
