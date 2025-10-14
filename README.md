# Productivity Apps Monorepo

A modern monorepo containing four productivity applications built with Next.js and Convex:

## 🎯 Applications

### 1. Todo App
A simple but effective todolist/tasks app with quick organization featuring:
- **Drag & Drop**: Move tasks between different days
- **Color-coded Tasks**: Assign colors to your tasks for better organization
- **Dark/Light Theme**: Toggle between themes
- **Responsive Design**: Works on all devices
- **Local-first**: Works offline with sync capabilities

### 2. Tracker App
A simple app for checking/tracking your consistency in a checkbox board featuring:
- **Customer Management**: Track paying customers with visual grid
- **Revenue Goals**: Set and monitor revenue milestones
- **Progress Tracking**: Visual progress bars and milestone indicators
- **Dark/Light Theme**: Consistent theming across all apps
- **Local-first**: Works offline with sync capabilities

### 3. Notes/Journal App
A very simple but neat note-taking app featuring:
- **Clean Interface**: Minimalist writing experience
- **Auto-save**: Notes are automatically saved as you type
- **Note History**: View and manage all your saved notes
- **Dark/Light Theme**: Consistent theming across all apps
- **Local-first**: Works offline with sync capabilities

### 4. IDE-Board (Sticky Notes) App
A simple canvas app with 'sticky notes' for storing and displaying ideas nicely on a page featuring:
- **Infinite Canvas**: Drag and place sticky notes anywhere
- **Visual Organization**: Arrange ideas spatially
- **Color-coded Notes**: Organize by categories or importance
- **Dark/Light Theme**: Consistent theming across all apps
- **Local-first**: Works offline with sync capabilities

## 🏗️ Monorepo Structure

```
/
├── apps/
│   ├── todo/          # Todo application
│   ├── tracker/       # Tracker application
│   ├── notes/         # Notes/Journal application
│   └── ide-board/     # IDE-Board (Sticky Notes) application
├── convex/            # Shared Convex backend
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
   # Start all apps
   pnpm dev:all
   
   # Or start individually
   pnpm dev:todo      # Todo app on http://localhost:3000
   pnpm dev:tracker   # Tracker app on http://localhost:3001
   pnpm dev:notes     # Notes app on http://localhost:3002
   pnpm dev:ide-board # IDE-Board app on http://localhost:3003
   ```

### Available Scripts

```bash
# Development
pnpm dev:todo        # Start todo app
pnpm dev:tracker     # Start tracker app
pnpm dev:notes       # Start notes app
pnpm dev:ide-board   # Start IDE-Board app
pnpm dev:all         # Start all apps

# Building
pnpm build:todo      # Build todo app
pnpm build:tracker   # Build tracker app
pnpm build:notes     # Build notes app
pnpm build:ide-board # Build IDE-Board app
pnpm build:all       # Build all apps

# Linting & Type Checking
pnpm lint            # Lint all apps
pnpm type-check      # Type check all apps
```

## 🚀 Production Deployment

This monorepo requires **5 separate deployments**:

### 1. Convex Production Deployment

Deploy the shared Convex backend:

```bash
# From the root directory
npx convex deploy --prod
```

This deploys the shared backend that all apps use for:
- User authentication
- Task management (todo app)
- Subscription tracking (tracker app)
- Notes management (notes app)
- Sticky notes management (IDE-Board app)
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

**Production URL**: https://tracker-fwylhsnxh-flpsnds-projects.vercel.app

### 4. Notes App Production Deployment

Deploy the notes application to Vercel:

```bash
cd apps/notes
vercel --prod
```

**Production URL**: [To be deployed]

### 5. IDE-Board App Production Deployment

Deploy the IDE-Board application to Vercel:

```bash
cd apps/ide-board
vercel --prod
```

**Production URL**: [To be deployed]

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

4. **Deploy Notes App:**
   ```bash
   cd apps/notes
   vercel --prod
   ```

5. **Deploy IDE-Board App:**
   ```bash
   cd apps/ide-board
   vercel --prod
   ```

### Development to Production Workflow

1. **Make changes** in any app
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
- **Notes App**: `flpsnds-projects/notes`
- **IDE-Board App**: `flpsnds-projects/ide-board`

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

### Notes App Features
- Clean, distraction-free writing interface
- Auto-save functionality
- Note history and management
- Dark and light theme support
- Local-first with cloud sync
- Simple and intuitive design

### IDE-Board App Features
- Infinite canvas for sticky notes
- Drag and drop note placement
- Color-coded sticky notes
- Visual idea organization
- Dark and light theme support
- Local-first with cloud sync

## 🎨 Design System

All four apps share a consistent design system:
- **Minimalistic UI** - Clean, distraction-free interface
- **No shadows** - Flat design aesthetic
- **Consistent theming** - Shared color palette
- **Typography** - Geist font family
- **Responsive** - Mobile-first design

## 🔐 Authentication

All apps use Better Auth with:
- Email/password authentication
- Session management
- Local-first data with cloud sync
- Secure user data handling

## 📊 Monitoring

- **Vercel Analytics** - App performance monitoring
- **Convex Dashboard** - Backend monitoring
- **Real-time sync status** - User feedback on data synchronization