# Emojicam

A web-based video call and meeting platform enabling users to host and join video calls, schedule meetings, chat during calls, and manage profiles. Targeted for professionals, remote teams, and educational institutions.

## Tech Stack

- **Next.js** (React framework for SSR, routing, API routes)
- **TypeScript**
- **Tailwind CSS** (utility-first CSS)
- **ESLint, Prettier** (code quality)
- **Firebase** (auth, Firestore, storage, functions)
- **NextAuth.js** (authentication)
- **Formik + Zod** (form validation)
- **PeerJS/WebRTC** (video/audio calls)
- **Socket.IO** (real-time chat)

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

### 3. Format code with Prettier

```bash
npm run format
```

## Folder Structure

- `/components` – Reusable React components (UI, widgets, etc.)
- `/lib` – Utility libraries and API wrappers
- `/hooks` – Custom React hooks
- `/context` – React context providers
- `/types` – TypeScript type definitions
- `/styles` – Global and shared styles
- `/utils` – Utility/helper functions
- `/pages/api` – Next.js API routes (serverless functions)
- `/pages/meetings` – Meeting-related pages
- `/pages/auth` – Authentication pages

## Next Steps

- Set up Prettier
- Add initial folder structure
- Integrate authentication (NextAuth + Firebase)
- See `linear-import.csv` for full feature/task list
