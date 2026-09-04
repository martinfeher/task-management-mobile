# TodoList Mobile (Expo SDK 57)

Expo SDK 57 mobile client for the [todolistWeb](../todolistWeb) backend.

## Requirements

- Node.js 22.13+ (Expo SDK 57)
- npm
- Expo CLI (`npx expo`)
- Running [todolistWeb](../todolistWeb) server (Next.js API at port 3000)

## Setup

1. Install dependencies:

```bash
npm install
```

2. Configure the API URL in `.env`:

```env
EXPO_PUBLIC_API_URL=http://YOUR_LAN_IP:3000
```

- iOS Simulator can often use `http://localhost:3000`
- Android Emulator typically uses `http://10.0.2.2:3000`
- Physical devices need your machine's LAN IP (e.g. `http://192.168.0.2:3000`)

3. Start the web API (from `../todolistWeb`):

```bash
npm run dev
```

4. Start the mobile app (dev client required for native modules):

```bash
npm run start:dev
```

Or for a fresh native build:

```bash
npm run ios
npm run android
```

## Features

- **Tasks**: create, edit, complete/uncomplete, delete, pin, priority, labels, notes, reorder
- **Lists**: create, rename, delete, drag reorder
- **Labels**: create inline, assign to tasks
- **Calendar**: month view, 7-day agenda strip, add tasks on a day, reschedule, pull to refresh
- **Search**: full-text task search
- **Reminders**: local notifications when a due date is set (requires permission)

## Native builds

```bash
npm run ios
npm run android
```

## TestFlight / internal testing

1. Configure EAS in Expo dashboard (project ID is in `app.json`)
2. Build:

```bash
npx eas build --platform ios --profile preview
npx eas build --platform android --profile preview
```

3. Submit to TestFlight / internal track from the Expo dashboard or:

```bash
npx eas submit --platform ios
```

## Project structure

- `src/app/` — Expo Router screens
- `src/components/` — UI components
- `src/contexts/app-context.tsx` — global app state
- `src/lib/api.ts` — REST client for the web API

## License

Copyright (c) 2026 Martin Feher. All rights reserved.
