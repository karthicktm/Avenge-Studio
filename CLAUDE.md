# Content Cat

AI-powered image and video generation platform with a visual node-based workflow builder for creating stunning visuals and cinematic content.

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/                # REST API endpoints
│   │   ├── auth/           # Authentication (login, logout, session)
│   │   ├── characters/     # Character CRUD
│   │   ├── files/          # File operations
│   │   ├── generate-image/ # Image generation via FAL.ai
│   │   ├── generate-video/ # Video generation via FAL.ai
│   │   ├── images/         # Image management
│   │   ├── products/       # Product management
│   │   ├── upload/         # File upload handler
│   │   ├── video-edit/     # Video editing operations
│   │   ├── videos/         # Video management
│   │   └── workflows/      # Workflow CRUD & execution
│   ├── create-character/   # Character creation page
│   ├── image/              # Image generation UI
│   ├── video/              # Video generation UI
│   ├── workflow/           # Visual workflow builder
│   └── layout.tsx          # Root layout
├── components/             # React components
│   ├── workflow/           # Workflow editor components
│   │   ├── nodes/          # Node type components
│   │   ├── edges/          # Edge/connection components
│   │   └── properties/     # Property panel components
│   ├── video/              # Video-related components
│   └── image/              # Image-related components
├── lib/                    # Utilities & services
│   ├── api/                # API client utilities
│   ├── fal/                # FAL.ai integration
│   ├── services/           # Business logic layer
│   ├── utils/              # General utilities
│   └── video-editor/       # Video editing utilities
├── hooks/                  # Custom React hooks
└── types/                  # TypeScript definitions
prisma/                     # Database schema & migrations
scripts/                    # Install & setup scripts
.github/workflows/          # CI/CD workflows
```

## Tech Stack

- **Framework**: Next.js 16 (App Router), React 19, TypeScript 5
- **Database**: PostgreSQL with Prisma 7 ORM
- **AI Services**: FAL.ai (@fal-ai/client) for image/video generation
- **Workflow**: @xyflow/react for visual node editor, @dagrejs/dagre for layout
- **Canvas/3D**: Konva, react-konva, Three.js (@react-three/fiber)
- **Styling**: Tailwind CSS 4
- **Caching**: Redis (ioredis)
- **Validation**: Zod 4

## Organization Rules

- API routes → `src/app/api/`, one route per resource
- Components → `src/components/`, grouped by feature
- Utilities → `src/lib/`, grouped by functionality
- Hooks → `src/hooks/`, one hook per file
- Types → `src/types/` or co-located

## Code Quality - Zero Tolerance

After editing ANY file, run:

```bash
pnpm lint && pnpm typecheck
```

Fix ALL errors/warnings before continuing.

For dev server changes:
```bash
pnpm dev
```

Read server output and fix ALL warnings/errors.

## Releases

### Creating a Release

```bash
git tag v1.0.0
git push origin v1.0.0
```

This triggers `.github/workflows/release.yml` which:
- Creates a GitHub release with install instructions
- Attaches `scripts/install.sh` with SHA256 checksum
- Auto-generates release notes from commits

### Install Script

Users install with:
```bash
curl -fsSL https://raw.githubusercontent.com/KenKaiii/content-cat/main/scripts/install.sh | bash
```

The script (`scripts/install.sh`) handles:
- OS detection (macOS, WSL, Linux)
- Package manager detection (brew, apt, dnf, pacman)
- Dependencies: Node.js 20+, pnpm, PostgreSQL, Redis, Docker
- Database setup and Prisma migrations
- Secure `.env` generation
- Global `content-cat` CLI command

### Running the App

After install, just run:
```bash
content-cat
```

This automatically:
- Starts Docker if not running (macOS)
- Starts PostgreSQL and Redis containers
- Launches the dev server at http://localhost:3000

### Docker Deployment

**Local Development (DB only):**
```bash
docker compose up -d postgres redis
```

**Local Production (full stack):**
```bash
docker compose --profile production up -d
```

**Railway Platform:**
```bash
# See RAILWAY.md for complete deployment guide
# Requires: PostgreSQL plugin, Redis plugin, environment variables
```

Files:
- `Dockerfile` - Multi-stage production build with migrations
- `docker-compose.yml` - PostgreSQL, Redis, app services
- `scripts/start.sh` - Production startup script (runs migrations)
- `railway.toml` - Railway platform configuration
- `.dockerignore` - Build optimization
