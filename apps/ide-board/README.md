# IDE Board

An infinite canvas with draggable sticky notes for organizing ideas and thoughts.

## Features

- **Infinite Canvas**: Pan around an unlimited workspace by clicking and dragging the background
- **Draggable Notes**: Click and drag notes to reposition them anywhere on the canvas
- **Editable Content**: Double-click any note to edit its content
- **Color Coding**: Choose from 8 different colors for your notes
- **Local-First**: Works offline with localStorage, syncs to Convex when authenticated
- **Select Mode**: Select multiple notes for bulk operations
- **Minimalist Design**: Clean, distraction-free interface using the tweakcn mono theme

## Usage

1. **Adding Notes**: Click the "+" button in the bottom-right corner
2. **Editing Notes**: Double-click any note to edit its content
3. **Moving Notes**: Click and drag notes to reposition them
4. **Changing Colors**: Hover over a note to see color options
5. **Deleting Notes**: Hover over a note and click the trash icon, or use select mode
6. **Panning Canvas**: Click and drag the background to move around the canvas
7. **Select Mode**: Click "Select" to select multiple notes for bulk deletion

## Keyboard Shortcuts

- **Escape**: Cancel editing or close forms
- **Cmd/Ctrl + Enter**: Save note content when editing

## Technical Details

- Built with Next.js 15 and React 19
- Uses Framer Motion for smooth animations
- Convex for real-time sync (when authenticated)
- localStorage for offline functionality
- Tailwind CSS with tweakcn mono theme
- TypeScript for type safety

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

## Deployment

This app is configured for Vercel deployment with the shared Convex backend.
