# Job Matcher - AI-Powered Job Matching Platform

> Intelligent multi-tenant job matching system with role-based access control, domain isolation, and advanced skill-based matching.

![Status](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)
![Next.js](https://img.shields.io/badge/Next.js-16-black)

## 📚 Table of Contents

- [Overview](#-overview)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Database Schema](#-database-schema)
- [Roles & Permissions](#-roles--permissions)
- [Matching Algorithm](#-matching-algorithm)
- [API Endpoints](#-api-endpoints)
- [Quick Start](#-quick-start)
- [Configuration](#-configuration)
- [Project Structure](#-project-structure)
- [Available Scripts](#-available-scripts)
- [Testing](#-testing)
- [Performance](#-performance)
- [Error Handling](#-error-handling)
- [Security](#-security)
- [Troubleshooting](#-troubleshooting)
- [Resources](#-resources)

## 🎯 Overview

Job Matcher is a comprehensive job matching platform that connects candidates with opportunities using intelligent skill-based matching. Built with enterprise-grade security, it supports multi-tenant architecture with complete domain isolation.

**Key Capabilities**:
- Smart skill-based matching with 0-100% compatibility scores
- Multi-tenant SaaS with complete domain isolation
- Four-tier role-based access control (RBAC)
- Real-time collaboration using TanStack Query
- Enterprise-grade authentication with Clerk

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 16, React, TypeScript |
| **Styling** | Tailwind CSS + shadcn/ui |
| **State** | TanStack Query (React Query) |
| **Backend** | Next.js API Routes |
| **Database** | PostgreSQL + Prisma ORM |
| **Auth** | Clerk (JWT) |
| **Deployment** | Vercel-ready (serverless) |

## 🏗️ Architecture

### System Design

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                         │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐               │
│  │  Dashboard │ │    Jobs    │ │  Profile   │ ...           │
│  └────────────┘ └────────────┘ └────────────┘               │
│         ↓             ↓              ↓                       │
│  ┌─────────────────────────────────────┐                    │
│  │    React Query (State Management)   │                    │
│  └─────────────────────────────────────┘                    │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTP/JSON
┌────────────────────▼──────────────────────────────────────┐
│                    API Layer                              │
│  ┌────────────┐ ┌──────────────┐ ┌────────────┐           │
│  │   Jobs     │ │ Applications │ │   Users    │ ...       │
│  └────────────┘ └──────────────┘ └────────────┘           │
│                        ↓                                  │
│  ┌──────────────────────────────────────┐                 │
│  │  Authorization & Validation:         │                 │
│  │  • Role-based checks                 │                 │
│  │  • Domain isolation                  │                 │
│  │  • Input validation                  │                 │
│  └──────────────────────────────────────┘                 │
└────────────────────┬──────────────────────────────────────┘
                     │
┌────────────────────▼──────────────────────────────────────┐
│                  Data Layer                               │
│  ┌──────────────────────────────────────┐                 │
│  │    PostgreSQL Database               │                 │
│  │  • Users, Domains, Jobs              │                 │
│  │  • Applications (with scores)        │                 │
│  └──────────────────────────────────────┘                 │
└───────────────────────────────────────────────────────────┘
```

### Authorization Flow

Each request validates:
1. **Authentication**: Is Clerk session valid?
2. **User Lookup**: Does user exist in database?
3. **Role Check**: Does role permit this operation?
4. **Domain Check**: Is resource within user's domain? (if applicable)

## 🗄️ Database Schema

### Domain (Organization)
```typescript
id: string                    // Unique identifier
name: string                  // Organization name
domainName: string           // Unique domain name
verified: boolean            // Verification status
users: User[]                // Team members
jobs: Job[]                  // Job postings
createdAt: DateTime
```

### User (Team Member)
```typescript
id: string                   // Clerk ID (primary key)
email: string               // Unique email
role: Role                  // SUPER_ADMIN | COMPANY_ADMIN | RECRUITER | CANDIDATE
domainId: string | null     // Organization (null for CANDIDATE/SUPER_ADMIN)
applications: Application[]
createdAt: DateTime
updatedAt: DateTime
```

### Job (Posting)
```typescript
id: string
title: string               // 5-200 characters
description: string         // 20-5000 characters
requiredSkills: string[]    // Required skill list
domainId: string           // Organization that posted
applications: Application[]
createdAt: DateTime
updatedAt: DateTime
```

### Application (Submission)
```typescript
id: string
jobId: string                    // Which job
userId: string                   // Which candidate (Clerk ID)
candidateSkills: string[]        // Skills at application time
matchingScore: number | null     // 0-100% compatibility
status: PENDING | REVIEWED | ACCEPTED | REJECTED
createdAt: DateTime
updatedAt: DateTime
// @@unique([jobId, userId]) - One app per candidate per job
```

## 👥 Roles & Permissions

### Permission Matrix

| Resource | Super Admin | Company Admin | Recruiter | Candidate |
|----------|-----------|---------------|-----------|-----------|
| **Jobs** |
| Read | ✅ All | ✅ Domain | ✅ Domain | ✅ All |
| Create | ✅ | ✅ | ✅ | ❌ |
| Update | ✅ | ✅ Domain | ✅ Domain | ❌ |
| Delete | ✅ | ✅ Domain | ✅ Domain | ❌ |
| **Applications** |
| Read | ✅ All | ✅ Domain | ✅ Domain | ✅ Own |
| Create | ❌ | ❌ | ❌ | ✅ |
| Update Status | ✅ | ✅ Domain | ✅ Domain | ❌ |
| Delete | ✅ | ✅ Domain | ✅ Domain | ✅ Own |
| **Users** |
| Read | ✅ All | ✅ Domain | ✅ Domain | ❌ |
| Update Role | ✅ | ❌ | ❌ | ❌ |

### Role Descriptions

- **🌍 Super Admin**: Manages all organizations, users, and system settings
- **🏢 Company Admin**: Manages their organization's domain and team
- **👔 Recruiter**: Creates jobs and reviews applications within their domain
- **👨‍💼 Candidate**: Browses jobs and submits applications

## 🧮 Matching Algorithm

### Score Calculation

The system calculates skill compatibility between candidates and jobs:

```typescript
matchingScore = (commonSkills / requiredSkills) * 100
```

**Example**:
```
Required Skills:  ["JavaScript", "React", "Python"]
Candidate Skills: ["JavaScript", "React", "Node.js"]
Common Skills:    ["JavaScript", "React"] = 2
Score:            (2 / 3) * 100 = 66.67%
```

**Features**:
- ✅ Case-insensitive matching
- ✅ Exact skill matching (no substrings)
- ✅ Auto-recalculates when profile updates
- ✅ Returns score + common/missing skills

## 📡 API Endpoints

### Jobs
```
GET    /api/jobs              - List jobs (role-filtered)
POST   /api/jobs              - Create job
GET    /api/jobs/[id]         - Get job details
PATCH  /api/jobs/[id]         - Update job
DELETE /api/jobs/[id]         - Delete job
```

### Applications
```
GET    /api/applications              - List applications (role-filtered)
POST   /api/applications              - Create application
GET    /api/applications/[id]         - Get application details
PATCH  /api/applications/[id]/status  - Update status
DELETE /api/applications/[id]         - Delete application
GET    /api/applications/[id]/score   - Recalculate score
```

### Users
```
GET    /api/users         - List users
GET    /api/users/me      - Get current user
GET    /api/users/[id]    - Get user details
PATCH  /api/users/[id]    - Update user
```

### Domains
```
GET    /api/domains       - List domains (Super Admin only)
POST   /api/domains       - Create domain (Super Admin only)
GET    /api/domains/[id]  - Get domain details
PATCH  /api/domains/[id]  - Update domain (Super Admin only)
DELETE /api/domains/[id]  - Delete domain (Super Admin only)
```

### Profile & Webhooks
```
PATCH  /api/profile              - Update candidate skills
POST   /api/webhooks/clerk       - Clerk user sync
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18.17+ (LTS recommended)
- npm, yarn, or pnpm
- PostgreSQL 14+ (or use Supabase)
- Clerk account (free tier available)

### Installation

1. **Clone repository**
   ```bash
   git clone https://github.com/yourusername/job-matcher-ai.git
   cd job-matcher-ai
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup environment**
   ```bash
   cp .env.example .env.local
   ```

4. **Configure `.env.local`**
   
   Fill in these required variables:
   - `DATABASE_URL` - PostgreSQL pooled connection
   - `DIRECT_URL` - PostgreSQL direct connection (for migrations)
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - From Clerk dashboard
   - `CLERK_SECRET_KEY` - From Clerk dashboard
   - `CLERK_WEBHOOK_SECRET` - From Clerk dashboard
   - `NEXT_PUBLIC_APP_URL` - Your app URL

5. **Setup database**
   ```bash
   npm run db:migrate
   npm run db:generate
   ```

6. **Start development**
   ```bash
   npm run dev
   ```
   
   Visit [http://localhost:3000](http://localhost:3000)

## 🔧 Configuration

### Clerk Setup

1. Create account at [clerk.com](https://clerk.com)
2. Create application
3. Add keys to `.env.local`
4. Configure URLs in Clerk dashboard:
   - Sign-in: `/sign-in`
   - Sign-up: `/sign-up`
   - Post-sign-in: `/dashboard`
   - Post-sign-up: `/dashboard`

### Database Options

**Local PostgreSQL**:
```bash
# macOS
brew install postgresql
brew services start postgresql

# Linux
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
```

**Supabase** (Recommended for cloud):
1. Create account at [supabase.com](https://supabase.com)
2. Create project
3. Copy connection string to `DATABASE_URL` and `DIRECT_URL`

## 📁 Project Structure

```
job-matcher-ai/
├── src/
│   ├── app/
│   │   ├── api/                    # API routes
│   │   │   ├── jobs/              # Job endpoints
│   │   │   ├── applications/      # Application endpoints
│   │   │   ├── domains/           # Domain endpoints
│   │   │   ├── users/             # User endpoints
│   │   │   ├── profile/           # Profile endpoints
│   │   │   └── webhooks/clerk     # Clerk webhooks
│   │   ├── dashboard/             # Dashboard page
│   │   ├── jobs/                  # Jobs listing page
│   │   ├── profile/               # Profile page
│   │   ├── layout.tsx             # Root layout
│   │   └── page.tsx               # Home page
│   ├── components/
│   │   ├── dashboard/             # Dashboard UI components
│   │   ├── ui/                    # shadcn/ui components
│   │   └── theme-provider.tsx
│   ├── hooks/                     # React Query hooks
│   ├── lib/
│   │   ├── auth.ts                # Auth utilities
│   │   ├── axios.ts               # HTTP client
│   │   ├── matching.ts            # Matching algorithm
│   │   ├── prisma.ts              # Prisma client
│   │   └── middleware/            # RBAC & domain isolation
│   └── types/                     # TypeScript definitions
├── prisma/
│   └── schema.prisma              # Database schema
├── .env.example                   # Environment template
├── next.config.ts                 # Next.js config
├── tsconfig.json                  # TypeScript config
└── package.json
```

## 🛠️ Available Scripts

```bash
# Development
npm run dev              # Start dev server on :3000

# Database
npm run db:migrate      # Run migrations
npm run db:generate     # Generate Prisma client
npm run db:studio       # Open Prisma Studio GUI

# Production
npm run build           # Build for production
npm start               # Start production server

# Code Quality
npm run lint           # Run ESLint
npm run type-check     # Check TypeScript
```

## 🧪 Testing

### Manual Workflow

1. Sign up as a user
2. Create domain (Super Admin)
3. Invite recruiter (Company Admin)
4. Create jobs (Recruiter)
5. Apply to jobs (Candidate)
6. Review applications (Recruiter)
7. Update profile (Candidate) - observe score changes

### Key Scenarios

- ✅ Cross-domain access is blocked
- ✅ Candidates see all jobs but only own applications
- ✅ Recruiters see domain jobs/applications only
- ✅ Matching scores recalculate on profile changes
- ✅ Status transitions validate correctly

### API Testing

```bash
# Get current user
curl http://localhost:3000/api/users/me

# Create job
curl -X POST http://localhost:3000/api/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Senior Developer",
    "description": "...",
    "requiredSkills": ["React", "TypeScript"]
  }'
```

## 📊 Performance

### Database
- Indexes on: `email`, `domainId`, `jobId`, `userId` (Clerk ID), `createdAt`
- Primary key: `id` (Clerk ID) on User model
- Pagination: max 100 per page
- Selective field selection (avoid N+1)

### Frontend
- React Query caching with automatic invalidation
- Code splitting and dynamic imports
- Image optimization
- Layout-based lazy loading

### Caching
- Automatic cache invalidation on mutations
- Revalidation on route changes
- Manual refresh via React Query tools

## 🚨 Error Handling

### HTTP Status Codes

| Status | Meaning |
|--------|---------|
| 400 | Bad request / validation error |
| 401 | Unauthorized / missing auth |
| 403 | Forbidden / no permission |
| 404 | Not found |
| 500 | Server error |

### Error Response
```json
{
  "error": {
    "code": "AUTHORIZATION_ERROR",
    "message": "Insufficient permissions",
    "timestamp": "2026-02-27T10:30:00Z"
  }
}
```

## 🔐 Security

- ✅ **Authentication**: Clerk handles auth, backend validates tokens
- ✅ **Authorization**: Every endpoint checks role + domain
- ✅ **Input Validation**: All inputs validated before database
- ✅ **SQL Injection**: Prisma ORM prevents SQL injection
- ✅ **Domain Isolation**: Users can only access their domain's data
- ✅ **Secrets**: Environment variables for sensitive data
- ✅ **Webhook Verification**: Clerk webhook signatures validated

## 🎓 Common Patterns

### React Query Hook
```typescript
const { data: jobs, isLoading, error } = useJobs();
```

### Creating Resource
```typescript
const { mutate: createJob } = useCreateJob();
createJob({ title, description, requiredSkills });
```

### Error Handling
```typescript
// Axios interceptor handles common errors:
// 401 → redirect to sign-in
// 403 → show "Permission Denied"
// 404 → show "Not Found"
```

## ❓ Troubleshooting

**Database Connection Issues**
- Verify `DATABASE_URL` and `DIRECT_URL` correct
- Check database is running
- Run `npx prisma db push`

**Clerk Authentication Issues**
- Verify all Clerk environment variables
- Check webhook is configured
- Verify webhook secret matches

**Build Errors**
- Clear Next.js cache: `rm -rf .next`
- Reinstall dependencies: `npm install`
- Regenerate Prisma: `npx prisma generate`

## 📚 Resources

- [Next.js Docs](https://nextjs.org/docs)
- [Prisma Docs](https://www.prisma.io/docs)
- [Clerk Docs](https://clerk.com/docs)
- [shadcn/ui](https://ui.shadcn.com)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [TanStack Query](https://tanstack.com/query/latest)

## 🤝 Contributing

Contributions welcome! Please follow existing code style and submit PRs to main.

---

**Built with ❤️ using Next.js + TypeScript + Tailwind CSS**
