# SvelteKit SaaS Starter Kit

A comprehensive, production-ready SaaS starter kit built with SvelteKit 5, featuring complete authentication, AI integration, file uploads, and modern UI components. Launch your SaaS product quickly with all essential features pre-configured.

## 📊 Project Overview

- **179 source files** with ~5,800 lines of code
- **Page routes** + **API endpoints**
- **116 Svelte components** (27 UI component groups)
- **5 database tables** with migrations
- **Production-ready** with serverless architecture

## ✨ Features

### 🔐 Authentication & User Management
- **Better Auth** - Modern authentication system
- **Email/Password Authentication** - Built-in credential-based login with 8-128 character password requirements
- **Email Verification** - Required email verification via secure links before account activation
- **Rate Limiting** - 90-second cooldown between verification email sends to prevent abuse
- **Google OAuth** - Social login integration
- **Session Management** - Database-backed sessions with 5-minute cache for optimal performance
- **User Profile** - Profile management with image uploads to Cloudflare R2
- **Account Linking** - Connect multiple authentication providers to a single account
- **Password Reset** - Secure password recovery via email

### 🤖 AI Integration
- **Vercel AI SDK** with OpenAI integration
- Streaming chat responses with real-time updates
- Multi-step conversation support
- Integrated chat widget in dashboard
- Web search preview tool

### 🎨 Modern UI/UX
- **Tailwind CSS v4** - Latest utility-first styling
- **shadcn-svelte** components - Accessible, customizable
- **Radix UI** primitives - Unstyled, accessible components
- Dark/light theme support with smooth transitions
- Responsive design with mobile-first approach
- Loading states and optimistic UI updates

### 🗄️ Database & Storage
- **Neon PostgreSQL** - Serverless database
- **Drizzle ORM** - Type-safe database toolkit
- **Cloudflare R2** - Scalable file storage with zero egress fees
- Database migrations with Drizzle Kit
- Drag & drop file uploads with progress tracking

## 🚀 Tech Stack

### Core Framework
- **SvelteKit 5** + **Svelte 5** - Modern reactive framework
- **TypeScript** - Strict mode for type safety
- **Vite** - Lightning-fast build tool

### Styling & UI
- **Tailwind CSS v4** - Utility-first CSS framework
- **shadcn-svelte** - 27 accessible component groups (116 components)
- **Bits UI** - Unstyled, accessible UI primitives
- **Lucide Svelte** - Beautiful icon library
- **mode-watcher** - Dark/light theme support

### Backend & Database
- **Neon PostgreSQL** - Serverless database with branching
- **Drizzle ORM** - Type-safe SQL toolkit
- **Better Auth** - Modern authentication framework

### Third-Party Services
- **OpenAI** - AI chat integration via Vercel AI SDK
- **Cloudflare R2** - Object storage with zero egress fees
- **Resend** - Transactional email service
- **Google OAuth** - Social authentication

### Deployment
- **Vercel** (recommended) - Zero-config deployment
- **Serverless-ready** - Works with any Node.js host

## 📁 Project Structure

```
saas-starter-kit/
├── src/
│   ├── routes/                      # SvelteKit routes
│   │   ├── (legal)/                # Legal pages (route group)
│   │   │   ├── privacy-policy/    # Privacy policy
│   │   │   └── terms-of-service/  # Terms of service
│   │   ├── dashboard/              # Protected dashboard (requires auth)
│   │   │   ├── +page.svelte       # Dashboard overview with stats
│   │   │   ├── chat/              # AI chat interface
│   │   │   ├── upload/            # File upload with R2
│   │   │   └── settings/          # User settings
│   │   ├── pricing/               # Public pricing page
│   │   ├── sign-in/               # Email/password + Google OAuth login
│   │   ├── sign-up/               # Registration with validation
│   │   ├── forgot-password/       # Password reset request
│   │   ├── reset-password/        # Password reset with token
│   │   ├── verify-email/          # Email verification
│   │   └── api/                   # API endpoints
│   │       ├── auth/              # Better Auth API routes
│   │       ├── chat/              # AI chat streaming API
│   │       ├── upload-image/      # R2 upload API
│   ├── lib/
│   │   ├── components/            # 116 Svelte components
│   │   │   ├── ui/               # shadcn-svelte (27 component groups)
│   │   │   ├── homepage/         # HeroSection, Integrations, Footer
│   │   │   ├── dashboard/        # Sidebar, Navbar, Charts, Stats
│   │   │   ├── common/           # GetStartedButton, UserProfile
│   │   │   └── logos/            # Brand logos
│   │   ├── server/               # Server-side modules
│   │   │   ├── auth.ts          # Better Auth config (16,739 lines)
│   │   │   ├── upload-image.ts  # R2 file upload logic
│   │   │   └── db/              # Database schema & connection
│   │   │       ├── index.ts     # Neon connection
│   │   │       └── schema.ts    # Drizzle schema (7 tables)
│   │   ├── stores/               # Svelte stores
│   │   │   ├── auth.ts          # Auth state management
│   │   ├── types/                # TypeScript type definitions
│   │   └── utils/                # Helper functions
│   ├── hooks.server.ts           # Session management & route protection
│   └── app.css                   # Global Tailwind styles
├── drizzle/                      # Database migrations
│   └── migrations/               # SQL migration files
├── static/                       # Static assets
├── components.json               # shadcn-svelte config
├── svelte.config.js              # SvelteKit config (path aliases)
├── tailwind.config.ts            # Tailwind CSS v4 config
├── drizzle.config.ts             # Drizzle Kit config
└── .env                          # Environment variables
```

## 🛠️ Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL database (Neon recommended)
- Cloudflare R2 bucket for file storage
- OpenAI API key for AI features
- Google OAuth credentials (optional)
- Resend API key for email notifications

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd svelte-starter-kit
```

2. **Install dependencies**
```bash
npm install
```

3. **Environment Setup**
Create a `.env` file based on `.env.example`:
```env
# Frontend URL
PUBLIC_APP_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql://username:password@host.neon.tech/database?sslmode=require

# Authentication
BETTER_AUTH_SECRET=your-secret-key-here

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# OpenAI
OPENAI_API_KEY=your-openai-api-key

# Resend (Email)
RESEND_API_KEY=re_123456789
RESEND_FROM_EMAIL=noreply@example.com

# Cloudflare R2 Storage
CLOUDFLARE_ACCOUNT_ID=your-cloudflare-account-id
R2_UPLOAD_IMAGE_ACCESS_KEY_ID=your-r2-access-key-id
R2_UPLOAD_IMAGE_SECRET_ACCESS_KEY=your-r2-secret-access-key
R2_UPLOAD_IMAGE_BUCKET_NAME=your-r2-bucket-name
```

4. **Database Setup**
```bash
# Generate and run migrations
npx drizzle-kit generate
npx drizzle-kit push

# Optional: Open Drizzle Studio to view your database
npx drizzle-kit studio
```

5. **Cloudflare R2 Setup**
- Create a Cloudflare account and set up R2 storage
- Create a bucket for file uploads
- Generate API tokens with R2 permissions
- Configure CORS settings for your domain
- Update the public URL in `src/lib/server/upload-image.ts:25`

6. **Google OAuth Setup**
- Go to the [Google Cloud Console](https://console.cloud.google.com/)
- Create a new project or select an existing one
- Navigate to "APIs & Services" > "OAuth consent screen"
- Configure the consent screen (User Type: External for testing)
- Navigate to "Credentials" > "Create Credentials" > "OAuth client ID"
- Application type: "Web application"
- Authorized JavaScript origins: `http://localhost:3000` (and your production URL)
- Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google` (and your production URL)
- Copy the Client ID and Client Secret to your `.env` file

7. **Resend Setup**
- Create an account at [Resend](https://resend.com)
- Create an API Key in the dashboard
- Verify your domain (recommended for production)
- Copy the API Key to `RESEND_API_KEY` in your `.env`
- Set `RESEND_FROM_EMAIL` to your verified sender email

8. **Start Development Server**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see your application.

## 🎯 Key Features Explained

### 🔐 Authentication System
**Powered by Better Auth with comprehensive security**

- **Multiple Auth Methods**:
  - Email/password with 8-128 character requirements
  - Google OAuth social login
  - Account linking (connect multiple providers)

- **Email Verification**:
  - Required before account activation
  - Secure verification links via Resend
  - 90-second rate limit between sends
  - Countdown timer UI

- **Password Management**:
  - Secure password reset via email
  - Token-based reset flow
  - Password strength validation

- **Session Management**:
  - Database-backed sessions with expiration
  - 5-minute cache TTL for performance
  - IP address and user agent tracking
  - Automatic session refresh

- **Security Features**:
  - Rate limiting (100 req/60s default)
  - CORS protection with trusted origins
  - Webhook signature verification
  - Serverless-friendly architecture

**Flow**: `hooks.server.ts` → `event.locals.session` → Protected routes check auth → Redirect if needed

### 🤖 AI Chat Integration
**Powered by Vercel AI SDK + OpenAI**

- **Features**:
  - Streaming responses with real-time typing effect
  - Multi-step conversation support
  - Web search preview tool
  - Conversation history
  - Configurable models (default: `nvidia/kimi-k2-thinking`)

- **Implementation**:
  - API endpoint: `src/routes/api/chat/+server.ts`
  - Uses `streamText()` for streaming responses
  - Supports custom OpenAI base URLs (proxies, Azure)
  - Message format conversion (UI ↔ Core)

- **UI Features**:
  - Clean chat interface
  - User messages (blue, right-aligned)
  - AI responses (gray, left-aligned)
  - Fixed bottom input area
  - Auto-scroll to latest message

**Flow**: User types → POST `/api/chat` → OpenAI processes → Stream response → Display in real-time

---

### 📤 File Upload & Storage System
**Powered by Cloudflare R2 (S3-compatible)**

- **Storage Features**:
  - Global CDN delivery
  - Zero egress fees
  - S3-compatible API
  - Scalable object storage

- **Upload Features**:
  - Drag & drop interface with visual feedback
  - File type validation (images only)
  - Size limits: 5MB (client), 10MB (server)
  - Real-time progress tracking
  - Unique filename generation with timestamps

- **Image Gallery**:
  - Thumbnail previews
  - File metadata (size, upload date)
  - Copy URL button
  - Open in new tab
  - Delete functionality

- **API Endpoint** (`src/routes/api/upload-image/+server.ts`):
  - Authentication check
  - MIME type validation
  - File size validation
  - Returns public URL

**Flow**: Drag/drop file → Validate → Upload to R2 → Return URL → Display in gallery

---

### 📊 Dashboard & Analytics
**Interactive dashboard with real-time data**

- **Overview Page**:
  - Stats cards with key metrics
  - Interactive bar chart (Chart.js)
  - Responsive layout
  - Loading states

- **Navigation**:
  - Sidebar navigation (desktop)
  - Mobile drawer menu
  - User profile dropdown
  - Settings access

- **Protected Features**:
  - AI chat interface
  - File upload system
  - Profile settings
  

---

### 🎨 UI Component Library
**27 component groups with 116 Svelte components**

**Form Components**: Input, Label, Button, Checkbox, Select, Textarea, Toggle, Slider
**Layout Components**: Card, Separator, Tabs, Sheet (mobile drawer)
**Feedback Components**: Badge, Progress, Skeleton, Sonner (toast notifications)
**Overlay Components**: Dialog, Dropdown Menu, Tooltip
**Data Display**: Table, Avatar
**Advanced**: Resizable panes, Toggle groups

**Design System**:
- shadcn-svelte (Bits UI + Tailwind CSS)
- Dark/light theme support
- Responsive design (mobile-first)
- Accessible components (ARIA attributes)
- Consistent spacing and typography

## 🔧 Development Commands

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

## 🎨 Customization

### Adding New Features
1. Create components in `src/lib/components/`
2. Add API routes in `src/routes/api/`
3. Update database schema following these steps:
   - **Generate Schema Template**: Run `npx @better-auth/cli generate` to explore available Better Auth schemas that you might need
   - **Add Schema Definition**: Add your new table schema to `src/lib/server/db/schema.ts`
   - **Update Drizzle Adapter**: Import and register the new schema in the `drizzleAdapter` configuration in `src/lib/server/auth.ts`
   - **Generate Migration**: Run `npx drizzle-kit generate` to create SQL migration files
   - **Push to Database**: Run `npx drizzle-kit push` to apply changes to your Neon database
   - **Verify**: Optionally run `npx drizzle-kit studio` to inspect your database schema

### Styling
- Modify `src/app.css` for global styles
- Use Tailwind classes for component styling
- Customize theme colors and configuration
- shadcn-svelte components configured via `components.json`

### Authentication
- Configure providers in `src/lib/server/auth.ts`
- Add new OAuth providers as needed
- Customize user profile fields in database schema

### Path Aliases
Configured in `svelte.config.js`:
- `$components` → `src/lib/components`
- `$server` → `src/lib/server`
- `$lib` → `src/lib` (SvelteKit default)

## 🔄 Key Workflows

### Authentication Workflow
1. User signs in/up via email or Google OAuth
2. Email verification required (90-second rate limit)
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

---

## 📚 Learn More

### Framework & Core
- [SvelteKit Documentation](https://svelte.dev/docs/kit) - Full-stack framework
- [Svelte 5 Documentation](https://svelte.dev/docs/svelte) - Reactive UI framework
- [TypeScript Documentation](https://www.typescriptlang.org/docs/) - Type safety

### Authentication & Email
- [Better Auth Documentation](https://better-auth.com) - Authentication framework
- [Resend Documentation](https://resend.com/docs) - Email service

### Database & Storage
- [Drizzle ORM Documentation](https://orm.drizzle.team) - Type-safe ORM
- [Neon Documentation](https://neon.tech/docs) - Serverless PostgreSQL
- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/) - Object storage

### UI & Styling
- [Tailwind CSS v4 Documentation](https://tailwindcss.com/docs) - Utility-first CSS
- [shadcn-svelte Documentation](https://www.shadcn-svelte.com/) - Component library
- [Bits UI Documentation](https://www.bits-ui.com/) - Accessible primitives

### AI Integration
- [Vercel AI SDK Documentation](https://sdk.vercel.ai/docs) - AI integration toolkit
- [OpenAI API Documentation](https://platform.openai.com/docs) - AI models

## 🚀 Deployment

### Vercel (Recommended)
1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on every push
4. SvelteKit adapter-auto will automatically configure for Vercel

### Manual Deployment
```bash
npm run build
npm run preview
```

> Note: You may need to install a specific [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.

## ⚠️ Important Notes

### Environment Variables
- All required environment variables are listed in `.env.example`
- Use different databases for sandbox and production environments
- Update the R2 public URL in `src/lib/server/upload-image.ts:25` with your actual domain
- Never commit `.env` file to version control

### Database Schema
**5 tables with migrations:**
1. `user` - User accounts
2. `session` - Session management
3. `account` - OAuth provider accounts
4. `verification` - Email verification tokens
5. `rate_limit` - Rate limiting storage

**After schema changes:**
1. Run `npx drizzle-kit generate` to create migrations
2. Review migration files in `drizzle/migrations/`
3. Run `npx drizzle-kit push` to apply changes

### Security Best Practices
- Never commit `.env` file
- Always validate user input
- Use parameterized queries (Drizzle handles this)
- Verify webhook signatures
- Implement rate limiting for sensitive operations
- Sanitize file uploads
- Keep dependencies updated

### Internationalization
**Current Language:** Chinese (Simplified)
- Sign-in/sign-up pages use Chinese text
- Error messages in Chinese
- Email templates in Chinese
- Form labels in Chinese

To change language, update text in:
- `src/routes/sign-in/+page.svelte`
- `src/routes/sign-up/+page.svelte`
- `src/lib/server/auth.ts` (email templates)
- Component files as needed

## 🎯 Use Cases

This starter kit is perfect for building:

- **SaaS Products** - Software services with authentication and dashboards
- **AI-Powered Apps** - Applications with chat or AI features
- **Content Platforms** - Platforms requiring user authentication and file uploads
- **Membership Sites** - Sites with tiered access and gated content
- **B2B Tools** - Business tools with team management and admin workflows
- **API Services** - Services requiring authentication and usage tracking

## 🚧 Roadmap

Potential future enhancements:

- [ ] Team/organization support
- [ ] Role-based access control (RBAC)
- [ ] Email templates customization UI
- [ ] Analytics dashboard
- [ ] Webhook management UI
- [ ] Multi-language support (i18n)
- [ ] Mobile app (React Native/Capacitor)
- [ ] API rate limiting per user
- [ ] Admin panel

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Development Guidelines
1. Follow the existing code style
2. Write meaningful commit messages
3. Test your changes thoroughly
4. Update documentation as needed
5. Ensure TypeScript types are correct

## 💬 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/saas-starter-kit/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/saas-starter-kit/discussions)
- **Documentation**: See [CLAUDE.md](./CLAUDE.md) for technical details

## 🙏 Acknowledgments

Built with these amazing technologies:
- [SvelteKit](https://kit.svelte.dev/) - The framework
- [Better Auth](https://better-auth.com) - Authentication
- [Neon](https://neon.tech) - Database
- [Cloudflare R2](https://www.cloudflare.com/products/r2/) - Storage
- [shadcn-svelte](https://www.shadcn-svelte.com/) - UI components
- [Tailwind CSS](https://tailwindcss.com/) - Styling

---

**Built with ❤️ using SvelteKit and modern web technologies.**

Ready to launch your SaaS? Star this repo and get started! ⭐
