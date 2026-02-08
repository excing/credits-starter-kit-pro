# SvelteKit SaaS Starter Kit

Production-ready SaaS starter kit with authentication, credits system, AI chat, file storage, and admin panel. Built with SvelteKit 5, TypeScript, Tailwind CSS v4, and shadcn-svelte.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | SvelteKit 5 + Svelte 5 |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 + shadcn-svelte |
| Database | Neon PostgreSQL + Drizzle ORM |
| Auth | Better Auth |
| AI | Vercel AI SDK + OpenAI |
| Storage | Cloudflare R2 (S3-compatible) |
| Email | Resend |

## Features

**Authentication** - Email/password, Google OAuth, email verification, password reset, session management with 5-min cache, rate limiting, account linking.

**Credits System** - Credit packages with expiration, redemption codes, transaction history, debt tracking, balance calculation from active packages, usage-based AI billing.

**AI Chat** - Streaming responses via Vercel AI SDK, configurable model, credits deduction per conversation, reasoning extraction.

**File Upload** - Drag-and-drop to Cloudflare R2, image validation, progress tracking, gallery with metadata.

**Admin Panel** - Package management (CRUD), redemption code generation, debt management, admin stats overview.

**Dashboard** - Stats cards, interactive charts, credits overview, responsive sidebar navigation.

**UI** - 27 shadcn-svelte component groups, dark/light theme, responsive mobile-first design, toast notifications, skeleton loading.

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL (Neon recommended)

### Setup

```bash
git clone <repository-url>
cd credits-starter-kit
npm install
```

Create `.env` from the template:

```env
# App
PUBLIC_APP_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql://user:pass@host.neon.tech/db?sslmode=require

# Auth
BETTER_AUTH_SECRET=your-secret-key

# Google OAuth (optional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# AI
OPENAI_API_KEY=your-key
OPENAI_BASE_URL=https://api.openai.com/v1

# Email
RESEND_API_KEY=re_xxx
RESEND_FROM_EMAIL=noreply@yourdomain.com

# Cloudflare R2
CLOUDFLARE_ACCOUNT_ID=
R2_UPLOAD_IMAGE_ACCESS_KEY_ID=
R2_UPLOAD_IMAGE_SECRET_ACCESS_KEY=
R2_UPLOAD_IMAGE_BUCKET_NAME=
R2_PUBLIC_URL=

# Admin Credentials
ADMIN_EMAILS=xxx@your-domain.com
```

Initialize the database and start:

```bash
npx drizzle-kit push
npm run dev
```

App runs at http://localhost:3000.

## Project Structure

```
src/
├── routes/
│   ├── +page.svelte                    # Landing page
│   ├── sign-in/                        # Login (email + Google OAuth)
│   ├── sign-up/                        # Registration
│   ├── forgot-password/                # Password reset request
│   ├── reset-password/                 # Password reset with token
│   ├── verify-email/                   # Email verification
│   ├── pricing/                        # Pricing page
│   ├── (legal)/                        # Privacy policy, terms of service
│   ├── dashboard/
│   │   ├── +page.svelte                # Overview with stats & charts
│   │   ├── chat/                       # AI chat interface
│   │   ├── credits/                    # Credits management
│   │   ├── upload/                     # File upload & gallery
│   │   ├── settings/                   # Profile settings
│   │   └── admin/                      # Admin-only section
│   │       ├── packages/               # Credit package CRUD
│   │       ├── codes/                  # Redemption code management
│   │       └── debts/                  # Debt management
│   └── api/
│       ├── auth/[...all]/              # Better Auth endpoints
│       ├── chat/                       # AI streaming endpoint
│       ├── upload-image/               # R2 upload endpoint
│       ├── user/credits/               # User credits APIs (8 endpoints)
│       └── admin/credits/              # Admin credits APIs (10 endpoints)
├── lib/
│   ├── components/
│   │   ├── ui/                         # shadcn-svelte components
│   │   ├── homepage/                   # Landing page components
│   │   ├── dashboard/                  # Dashboard components
│   │   └── common/                     # Shared components
│   ├── server/
│   │   ├── auth.ts                     # Better Auth configuration
│   │   ├── upload-image.ts             # R2 upload logic
│   │   ├── credits/                    # Credits business logic
│   │   └── db/
│   │       ├── index.ts                # Neon connection
│   │       └── schema.ts              # Drizzle schema (11 tables)
│   ├── stores/                         # Svelte stores (auth state)
│   └── utils/                          # Helpers
├── hooks.server.ts                     # Session & route protection
└── app.css                             # Global styles
```

## Database Schema

11 tables organized into two groups:

**Auth tables** (managed by Better Auth):
`user`, `session`, `account`, `verification`, `rate_limit`

**Credits tables**:
`credit_package`, `user_credit_package`, `credit_transaction`, `redemption_code`, `redemption_history`, `credit_debt`

## Development Commands

```bash
npm run dev              # Dev server at http://localhost:3000
npm run build            # Production build
npm run preview          # Preview production build
npm run check            # TypeScript type checking

npx drizzle-kit generate # Generate migrations from schema
npx drizzle-kit push     # Push schema to database (dev)
npx drizzle-kit migrate  # Run migrations (production)
npx drizzle-kit studio   # Database GUI
```

## Path Aliases

```
$lib        → src/lib
$components → src/lib/components
$server     → src/lib/server
```

## API Endpoints

### Auth
| Method | Path | Description |
|--------|------|-------------|
| * | `/api/auth/[...all]` | Better Auth handler |

### Chat
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/chat` | Stream AI responses (credits deducted) |

### Upload
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/upload-image` | Upload image to R2 |

### User Credits
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/user/credits` | Current balance |
| GET | `/api/user/credits/overview` | Aggregated credits data |
| GET | `/api/user/credits/dashboard-stats` | Lightweight stats |
| GET | `/api/user/credits/stats` | Usage statistics |
| GET | `/api/user/credits/history` | Transaction history (paginated) |
| GET | `/api/user/credits/packages` | Active packages |
| GET | `/api/user/credits/debts` | Outstanding debts |
| POST | `/api/user/credits/redeem` | Redeem a code |

### Admin Credits
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/credits/stats` | Admin statistics |
| GET | `/api/admin/credits/overview` | Admin overview |
| GET/POST | `/api/admin/credits/packages` | List / create packages |
| PUT/DELETE | `/api/admin/credits/packages/[id]` | Update / delete package |
| POST | `/api/admin/credits/generate-code` | Generate redemption codes |
| GET | `/api/admin/credits/codes` | List codes (paginated) |
| GET | `/api/admin/credits/codes/[id]` | Code details |
| GET | `/api/admin/credits/codes/overview` | Codes summary |
| GET | `/api/admin/credits/codes/history` | Redemption history |
| GET | `/api/admin/credits/debts` | List debts (paginated) |
| POST | `/api/admin/credits/debts/[id]/settle` | Settle a debt |

## Configuration Notes

- **R2 public URL**: Update `src/lib/server/upload-image.ts:25` with your R2 domain.
- **Google OAuth redirect**: Set to `{PUBLIC_APP_URL}/api/auth/callback/google`.
- **AI model**: Default is `nvidia/kimi-k2-thinking`, configurable in `src/routes/api/chat/+server.ts`.
- **UI language**: Chinese (Simplified). To change, update text in route components and `src/lib/server/auth.ts` email templates.
- **Admin access**: Controlled via `isAdmin()` utility that checks user email.

## Deployment

Works with any Node.js hosting. SvelteKit `adapter-auto` detects the platform automatically.

**Vercel** (recommended):
1. Connect repo to Vercel
2. Add environment variables
3. Deploy

**Manual**:
```bash
npm run build
node build
```

For other platforms, install the appropriate [SvelteKit adapter](https://svelte.dev/docs/kit/adapters).

## License

MIT
