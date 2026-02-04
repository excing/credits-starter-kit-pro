# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **production-ready SaaS starter kit** built with SvelteKit 5, featuring complete authentication, AI integration, file storage, and modern UI components. The project is designed to help developers launch SaaS applications quickly with all essential features pre-configured.

### Tech Stack

- **Framework**: SvelteKit 5 + Svelte 5
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS v4 + shadcn-svelte
- **Database**: Neon PostgreSQL + Drizzle ORM
- **Authentication**: Better Auth
- **AI**: Vercel AI SDK + OpenAI
- **Storage**: Cloudflare R2 (S3-compatible)
- **Email**: Resend
- **UI Components**: shadcn-svelte (27 component groups, 116 Svelte components)
- **Icons**: Lucide Svelte
- **Notifications**: Sonner (toast)

### Project Scale

- **179 source files** (Svelte + TypeScript)
- **~5,800 lines of code**
- **15 page routes** + **5 API endpoints**
- **5 database tables**

## Development Commands

```bash
# Start development server (runs on http://0.0.0.0:3000)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Type checking
npm run check

# Type checking in watch mode
npm run check:watch

# Database migrations (Drizzle)
npx drizzle-kit generate    # Generate migrations from schema
npx drizzle-kit migrate     # Run migrations
npx drizzle-kit push        # Push schema changes directly (dev only)
npx drizzle-kit studio      # Open Drizzle Studio GUI
```

## Architecture

### Path Aliases

Configured in `svelte.config.js`:
- `$components` → `src/lib/components`
- `$server` → `src/lib/server`
- `$lib` → `src/lib` (SvelteKit default)

### Authentication Flow

Authentication is handled by Better Auth:

**Configuration:** `src/lib/server/auth.ts` (16,739 lines of configuration)

**Features:**
- Email/password authentication (8-128 character passwords)
- Google OAuth social login
- Email verification (required before account activation)
- Password reset via email
- Session management with 5-minute cache TTL
- Rate limiting (100 requests/60s default, 1 email/90s for verification)
- Account linking (multiple providers per user)

**Email Service:** Resend API for transactional emails
- Verification emails with secure links
- Password reset emails
- Customizable email templates

**Session Flow:**
1. `hooks.server.ts` retrieves session from Better Auth
2. Session stored in `event.locals.session`
3. Protected routes redirect unauthenticated users to `/sign-in`
4. Auth routes redirect authenticated users to `/dashboard`

**Security Features:**
- Database-backed sessions with expiration
- Rate limiting with database storage (serverless-friendly)
- Email verification required
- Password requirements: 8-128 characters
- CORS protection with trusted origins

### Database Schema

Located in `src/lib/server/db/schema.ts`:

**Tables:**
1. **user** - User accounts (id, name, email, emailVerified, image, timestamps)
2. **session** - Session management (id, token, expiresAt, userId, ipAddress, userAgent)
3. **account** - OAuth provider accounts (accountId, providerId, tokens, scope)
4. **verification** - Email verification tokens (identifier, value, expiresAt)
5. **rate_limit** - Rate limiting storage (key, count, last_request)

**Migrations:**
- `0000_magical_typhoid_mary.sql` - Initial schema (user, session, account, verification)
- `0001_flimsy_roulette.sql` - Rate limit table

**Connection:** `src/lib/server/db/index.ts` uses Neon serverless driver with Drizzle ORM

### AI Chat Integration

**API Endpoint:** `src/routes/api/chat/+server.ts`

**Features:**
- Streaming chat responses using `streamText()`
- OpenAI integration (supports custom base URLs for proxies/Azure)
- Web search preview tool
- Multi-step conversation support
- Real-time message streaming

**Implementation:**
- Uses configurable model (default: `nvidia/kimi-k2-thinking`)
- Converts UI messages to core messages format
- Returns streaming response via `toUIMessageStreamResponse()`

**Frontend:** `src/routes/dashboard/chat/+page.svelte`
- Chat interface with message history
- User messages (blue, right-aligned)
- AI responses (gray, left-aligned)
- Input field with send button
- Fixed bottom input area

### File Upload & Storage

**Module:** `src/lib/server/upload-image.ts`

**Features:**
- S3-compatible object storage (Cloudflare R2)
- Global CDN delivery
- Zero egress fees
- Drag-and-drop file upload
- File validation (type & size)
- Progress tracking
- Image gallery with metadata

**Upload Page:** `src/routes/dashboard/upload/+page.svelte`
- Drag-and-drop zone with visual feedback
- File type validation (images only)
- 5MB file size limit (client-side), 10MB (server-side)
- Progress bar during upload
- Uploaded files gallery with:
  - Image preview
  - File size and upload date
  - Copy URL button
  - Open in new tab button
  - Delete button

**API Endpoint:** `src/routes/api/upload-image/+server.ts`
- POST endpoint with authentication check
- MIME type validation
- File size validation (10MB limit)
- Unique filename generation with timestamp
- Returns public URL

**Note:** The public URL in `upload-image.ts:25` needs to be replaced with your actual R2 public domain

### Component Structure

**UI Component Library** (`src/lib/components/ui/`) - 27 component groups:
- **Form Components**: Input, Label, Button, Checkbox, Select, Textarea, Toggle, Slider
- **Layout Components**: Card, Separator, Tabs, Sheet (mobile drawer)
- **Feedback Components**: Badge, Progress, Skeleton, Sonner (toast notifications)
- **Overlay Components**: Dialog, Dropdown Menu, Tooltip
- **Data Display**: Table, Avatar
- **Advanced**: Resizable panes, Toggle groups

**Custom Components:**
- `src/lib/components/homepage/` - HeroSection, Integrations showcase, Footer
- `src/lib/components/dashboard/` - Sidebar, Navbar, SectionCards (stats), ChartInteractive (bar chart)
- `src/lib/components/common/` - GetStartedButton (auth-aware), UserProfile (dropdown menu)
- `src/lib/components/logos/` - SvelteKit, BetterAuth, Neon, Tailwind, shadcn-svelte

**Design Approach:**
- shadcn-svelte components (Bits UI primitives + Tailwind CSS)
- Tailwind CSS v4 with utility-first styling
- Dark/light theme support via mode-watcher
- Responsive design with mobile-first approach
- Accessible components with ARIA attributes

### Route Structure

#### Public Pages
- `/` - Landing page (hero, integrations, footer)
- `/(legal)/privacy-policy` - Privacy policy
- `/(legal)/terms-of-service` - Terms of service

#### Authentication Pages
- `/sign-in` - Email/password login + Google OAuth
- `/sign-up` - Email/password registration with validation
- `/forgot-password` - Password reset request
- `/reset-password` - Password reset with token validation
- `/verify-email` - Email verification with countdown timer

#### Protected Dashboard Pages (require authentication)
- `/dashboard` - Overview with stats cards and interactive chart
- `/dashboard/chat` - AI chat interface with streaming responses
- `/dashboard/upload` - File upload to Cloudflare R2 with drag-and-drop
- `/dashboard/settings` - Profile management

#### API Endpoints
- `/api/auth/[...all]` - Better Auth API routes (sign-in, sign-up, sign-out, etc.)
- `/api/chat` - Stream AI chat responses
- `/api/upload-image` - Upload image to Cloudflare R2

### State Management

**Svelte Stores:**

**Auth Store** (`src/lib/stores/auth.ts`):
- `currentUser` - Current authenticated user
- `authLoaded` - Whether auth state is initialized
- `authLoading` - Whether auth is being refreshed
- Functions: `setCurrentUser()`, `initAuthFromLayout()`, `patchCurrentUser()`, `clearAuthState()`, `refreshCurrentUser()`, `ensureCurrentUserLoaded()`

## Important Notes

### Environment Variables

Required environment variables (see `.env`):

**Frontend:**
- `PUBLIC_APP_URL` - Frontend URL (e.g., http://localhost:3000)

**Database:**
- `DATABASE_URL` - Neon PostgreSQL connection string

**Authentication:**
- `BETTER_AUTH_SECRET` - Auth encryption secret
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` - Google OAuth credentials

**AI:**
- `OPENAI_API_KEY` - OpenAI API key
- `OPENAI_BASE_URL` - OpenAI API base URL (default: https://api.openai.com/v1)

**Email:**
- `RESEND_API_KEY` - Resend API key
- `RESEND_FROM_EMAIL` - Sender email address

**File Storage (Cloudflare R2):**
- `CLOUDFLARE_ACCOUNT_ID` - Cloudflare account ID
- `R2_UPLOAD_IMAGE_ACCESS_KEY_ID` - R2 access key ID
- `R2_UPLOAD_IMAGE_SECRET_ACCESS_KEY` - R2 secret access key
- `R2_UPLOAD_IMAGE_BUCKET_NAME` - R2 bucket name
- `R2_PUBLIC_URL` - R2 public URL (needs to be configured)

### Session Caching

Better Auth session caching is enabled with a 5-minute TTL to reduce database queries.

### Database Migrations

The Drizzle schema is at `src/lib/server/db/schema.ts`. After schema changes:
1. Generate migration: `npx drizzle-kit generate`
2. Review migration files in `drizzle/migrations/`
3. Apply migrations: `npx drizzle-kit migrate`

For rapid development, use `npx drizzle-kit push` to push schema changes directly without migrations.

## Key Workflows

### Authentication Workflow
1. User signs in/up via email or Google OAuth
2. Email verification required (90-second rate limit between sends)
3. Session created and cached for 5 minutes
4. Protected routes check `event.locals.session`
5. Unauthenticated users redirected to `/sign-in`

### File Upload Workflow
1. User drags/drops or selects image
2. Client-side validation (type, size)
3. File uploaded to `/api/upload-image`
4. Server validates and uploads to Cloudflare R2
5. Public URL returned to client
6. File added to gallery with metadata

### Chat Workflow
1. User types message in chat interface
2. Message sent to `/api/chat` endpoint
3. OpenAI processes message with streaming
4. Response streamed back to client in real-time
5. Messages displayed in conversation history

## Design Patterns

### Visual Design
- Clean, modern interface with neutral color palette
- Consistent spacing and typography
- Smooth transitions and animations
- Loading states for async operations
- Error handling with toast notifications
- Empty states with helpful messaging

### User Experience
- Responsive design (mobile, tablet, desktop)
- Dark/light theme toggle
- Optimistic UI updates
- Progress indicators for uploads
- Countdown timers for rate-limited actions
- Confirmation dialogs for destructive actions
- Accessible form validation

### Navigation
- Sidebar navigation on desktop (hidden on mobile)
- Mobile drawer menu via hamburger icon
- Breadcrumb-style navigation
- User profile dropdown menu
- Settings accessible from sidebar and profile menu

## Internationalization

**Language:** Chinese (Simplified)
- Sign-in/sign-up pages use Chinese text
- Error messages in Chinese
- Email templates in Chinese
- Form labels in Chinese

## Development Best Practices

### When Adding New Features
1. Create components in `src/lib/components/`
2. Add API routes in `src/routes/api/`
3. Update database schema in `src/lib/server/db/schema.ts`
4. Generate migrations with `npx drizzle-kit generate`
5. Apply migrations with `npx drizzle-kit push`

### When Modifying Authentication
- Configure providers in `src/lib/server/auth.ts`
- Update user profile fields in database schema
- Test email verification flow
- Verify rate limiting works correctly

### Security Considerations
- Never commit `.env` file
- Always validate user input
- Use parameterized queries (Drizzle handles this)
- Implement rate limiting for sensitive operations
- Sanitize file uploads
