# Notes App

A minimalistic note-taking application built with Next.js 15, following the mono theme design system.

## Features

- **Create Notes**: Simple form with title and content fields
- **View Notes**: Chronological list of all saved notes (newest first)
- **Edit Notes**: Click edit button to modify existing notes
- **Delete Notes**: Remove notes with a single click
- **Local Storage First**: All data persists locally, no backend required
- **Dark/Light Mode**: Theme toggle matching the design system
- **Minimalistic Design**: Clean, distraction-free interface using mono theme

## Tech Stack

- Next.js 15
- TypeScript
- Tailwind CSS v4 with tweakcn mono theme
- Framer Motion for animations
- Lucide React for icons
- Local Storage for data persistence

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the development server:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

1. **Creating Notes**: Click "Create new note" to expand the form, enter a title and content, then click "Save Note"
2. **Viewing Notes**: All saved notes appear below the form in reverse chronological order
3. **Editing Notes**: Click the edit button on any note to modify it
4. **Deleting Notes**: Click the trash button to remove a note permanently

## Data Model

Notes are stored with the following structure:
```typescript
interface Note {
  id: string           // UUID
  title: string
  content: string
  createdAt: number   // timestamp
  updatedAt: number   // timestamp
}
```

All data is stored in localStorage with the key `"notes-local"`.

