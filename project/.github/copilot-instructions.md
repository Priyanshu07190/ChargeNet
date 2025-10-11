# Copilot Instructions for ChargeNet Codebase

## Big Picture Architecture
- **Frontend:** React + TypeScript (see `src/`). Main entry: `main.tsx`, root component: `App.tsx`.
- **Pages:** Located in `src/pages/` (e.g., `Booking.tsx`, `ChargerMap.tsx`). Each page handles a major user flow.
- **Components:** Reusable UI in `src/components/` (e.g., `UrgentBooking.tsx`, `VoiceAssistant.tsx`).
- **Contexts:** Global state via React Context in `src/contexts/` (e.g., `AuthContext.tsx`, `ChargerContext.tsx`).
- **Data:** Static data in `src/data/` (e.g., `vehicles.ts`).
- **MongoDB Atlas Integration:** Database connection to MongoDB Atlas cluster. Connection string: `mongodb+srv://amrendrabahubali9500:NilTHOaXCOlBpnb7@chargenet.djic8n6.mongodb.net/?retryWrites=true&w=majority&appName=Chargenet`
- **Styling:** Tailwind CSS (`index.css`, `postcss.config.js`, `tailwind.config.js`). Custom animations in `src/styles/animations.css`.

## Developer Workflows
- **Build:** Use Vite (`vite.config.ts`). Run `npm install` then `npm run dev` to start the local server.
- **Type Checking:** TypeScript config in `tsconfig*.json`.
- **Linting:** ESLint config in `eslint.config.js`.
- **Database:** MongoDB Atlas cluster. Use MongoDB connection string for database operations.
- **No test suite detected.** If adding tests, follow React/TypeScript conventions and place in `src/__tests__/`.

## Project-Specific Patterns
- **Booking Flow:** Multi-step UI in `Booking.tsx` (date/time, compatibility, payment, confirmation). Voice assistant (`VoiceAssistant.tsx`) and token-based urgent booking (`UrgentBooking.tsx`) are key features.
- **State Management:** Use React Context for auth and charger data. Avoid prop drilling.
- **Animations:** Use custom classes from `animations.css` (e.g., `.voice-wave`, `.mood-ring`, `.token-celebration`).
- **Data Models:** MongoDB collections for users, chargers, bookings. Follow schema patterns from existing components.
- **Pricing/Rewards:** Pricing logic in `PricingEngine.tsx`, rewards in `RewardsExchange.tsx`.

## Integration Points
- **MongoDB Atlas:** All backend data (users, chargers, bookings) managed in MongoDB. Connection: `mongodb+srv://amrendrabahubali9500:NilTHOaXCOlBpnb7@chargenet.djic8n6.mongodb.net/?retryWrites=true&w=majority&appName=Chargenet`
- **Voice Assistant:** UI and logic in `VoiceAssistant.tsx` and `Booking.tsx` (uses browser SpeechSynthesis).
- **Token System:** Urgent bookings require tokens; logic in `UrgentBooking.tsx` and MongoDB collections.

## Conventions & Examples
- **Component Naming:** PascalCase for components, camelCase for props and variables.
- **Styling:** Prefer Tailwind utility classes. Use custom animation classes for advanced effects.
- **Navigation:** Use React Router (`navigate()` calls) for page transitions.
- **Data Flow:** Fetch data via MongoDB client, store in context, pass to components as needed.

## Key Files & Directories
- `src/pages/Booking.tsx` — Booking flow, voice assistant, payment logic
- `src/components/UrgentBooking.tsx` — Token-based urgent booking
- `src/lib/` — Database client setup (MongoDB connection)
- `src/styles/animations.css` — Custom UI animations

---
**For new features:**
- Follow existing page/component/context structure
- Use Tailwind and custom animation classes for UI
- Integrate with MongoDB Atlas via connection string
- Reference existing data models for MongoDB schema

If any section is unclear or missing, please provide feedback for further refinement.
