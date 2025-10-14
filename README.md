# Todo & Tracker Monorepo

A modern monorepo containing two productivity applications built with Next.js and Convex:

## 🎯 Applications

### Todo App
A drag-and-drop todo application featuring:
- **Drag & Drop**: Move tasks between different days
- **Color-coded Tasks**: Assign colors to your tasks for better organization
- **Dark/Light Theme**: Toggle between themes
- **Responsive Design**: Works on all devices
- **Local-first**: Works offline with sync capabilities

### Tracker App
A subscription and revenue tracking application featuring:
- **Customer Management**: Track paying customers with visual grid
- **Revenue Goals**: Set and monitor revenue milestones
- **Progress Tracking**: Visual progress bars and milestone indicators
- **Dark/Light Theme**: Consistent theming with todo app
- **Local-first**: Works offline with sync capabilities

## 🏗️ Monorepo Structure

```
/
├── apps/
│   ├── todo/          # Todo application
│   └── tracker/       # Tracker application
├── convex/            # Shared Convex backend
├── components/        # Shared UI components
└── package.json       # Root workspace configuration
```

## 🛠️ Tech Stack

### Frontend
- **Next.js 15** - React framework
- **React 19** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Framer Motion** - Animations
- **Radix UI** - Component primitives

### Backend
- **Convex** - Real-time database and backend
- **Better Auth** - Authentication system
- **Resend** - Email service

### Development
- **pnpm** - Package manager
- **Monorepo** - Workspace management
- **Vercel** - Deployment platform

## 🚀 Development Workflow

### Prerequisites
- Node.js >= 18.0.0
- pnpm >= 8.0.0
- Convex account
- Vercel account

### Getting Started

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd v0-to-do-app-with-drag
   pnpm install
   ```

2. **Set up Convex:**
   ```bash
   npx convex dev
   ```

3. **Start development servers:**
   ```bash
   # Start both apps
   pnpm dev:all
   
   # Or start individually
   pnpm dev:todo      # Todo app on http://localhost:3000
   pnpm dev:tracker   # Tracker app on http://localhost:3001
   ```

### Available Scripts

```bash
# Development
pnpm dev:todo        # Start todo app
pnpm dev:tracker     # Start tracker app
pnpm dev:all         # Start both apps

# Building
pnpm build:todo      # Build todo app
pnpm build:tracker   # Build tracker app
pnpm build:all       # Build both apps

# Linting & Type Checking
pnpm lint            # Lint all apps
pnpm type-check      # Type check all apps
```

## 🚀 Production Deployment

This monorepo requires **3 separate deployments**:

### 1. Convex Production Deployment

Deploy the shared Convex backend:

```bash
# From the root directory
npx convex deploy --prod
```

This deploys the shared backend that both apps use for:
- User authentication
- Task management (todo app)
- Subscription tracking (tracker app)
- Real-time synchronization

### 2. Todo App Production Deployment

Deploy the todo application to Vercel:

```bash
cd apps/todo
vercel --prod
```

**Production URL**: https://todo-mouumbde6-flpsnds-projects.vercel.app

### 3. Tracker App Production Deployment

Deploy the tracker application to Vercel:

```bash
cd apps/tracker
vercel --prod
```

**Production URL**: https://tracker-ag18m5j6y-flpsnds-projects.vercel.app

## 🔄 Deployment Flow

### Complete Production Deployment

1. **Deploy Convex Backend:**
   ```bash
   npx convex deploy --prod
   ```

2. **Deploy Todo App:**
   ```bash
   cd apps/todo
   vercel --prod
   ```

3. **Deploy Tracker App:**
   ```bash
   cd apps/tracker
   vercel --prod
   ```

### Development to Production Workflow

1. **Make changes** in either app
2. **Test locally** with `pnpm dev:all`
3. **Deploy Convex** if backend changes were made
4. **Deploy affected app(s)** to Vercel
5. **Verify** production deployments

## 🔧 Configuration

### Environment Variables

Both apps share the same Convex backend and require:

- `CONVEX_DEPLOYMENT` - Convex deployment URL
- `BETTER_AUTH_SECRET` - Authentication secret
- `RESEND_API_KEY` - Email service key

### Vercel Configuration

Each app has its own Vercel project:
- **Todo App**: `flpsnds-projects/todo`
- **Tracker App**: `flpsnds-projects/tracker`

## 📱 Features

### Todo App Features
- Create tasks with titles and descriptions
- Drag tasks between different days (today, tomorrow, etc.)
- Color-coded task cards
- Dark and light theme support
- Local-first with cloud sync
- Bulk task operations
- Restore deleted tasks

### Tracker App Features
- Visual customer slot grid (1000 slots)
- Revenue tracking with milestones
- Progress visualization
- Dark and light theme support
- Local-first with cloud sync
- Milestone indicators (200, 300, 400 customers)

## 🎨 Design System

Both apps share a consistent design system:
- **Minimalistic UI** - Clean, distraction-free interface
- **No shadows** - Flat design aesthetic
- **Consistent theming** - Shared color palette
- **Typography** - Geist font family
- **Responsive** - Mobile-first design

## 🔐 Authentication

Both apps use Better Auth with:
- Email/password authentication
- Session management
- Local-first data with cloud sync
- Secure user data handling

## 📊 Monitoring

- **Vercel Analytics** - App performance monitoring
- **Convex Dashboard** - Backend monitoring
- **Real-time sync status** - User feedback on data synchronization