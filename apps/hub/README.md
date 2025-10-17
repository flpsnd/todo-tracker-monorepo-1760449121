# Hub App

The main landing page for the Caalm suite of productivity apps.

## Features

- Clean, minimal design matching the Caalm design system
- Dark/light theme toggle
- Responsive layout
- Links to all Caalm apps

## Development

```bash
# From the root directory
pnpm dev:hub

# Or from this directory
pnpm dev
```

The app will be available at http://localhost:3000

## Production

The hub app is designed to be deployed to the root domain (caalm.app) while other apps are deployed to subdomains:

- caalm.app - Hub landing page
- tasks.caalm.app - Todo app
- tracker.caalm.app - Tracker app
- notes.caalm.app - Notes app
- ide-board.caalm.app - IDE-Board app
