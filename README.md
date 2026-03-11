# AYT Muhendislik - Saha Takip Sistemi

A professional field documentation and tracking system for AYT Muhendislik, built with React, TypeScript, Firebase, and Tesseract.js OCR.

> **v2.0.0:** Backend API integration, username-only authentication, and enhanced admin security!
> **[Deployment Guide](./DEPLOYMENT_GUIDE.md)**

## Features

### For Field Workers
- Photo Documentation - Capture or upload site images
- Auto OCR - Automatically extract text from images using Tesseract.js
- Easy Note Taking - Document issues with title, project name, and description
- Mobile-First Design - Touch-friendly interface for on-site use
- Private Notes - Workers can only view their own notes

### For Managers (Admin)
- Dashboard View - See all notes from all workers
- Advanced Filters - Filter by worker, project, or date range
- Full Details - View complete note information with images
- Team Oversight - Monitor field documentation activity
- User Management - Add users, reset passwords, disable accounts
- Admin Password Reset - Force update any user's password
- Soft Delete Users - Disable accounts without losing data

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: TailwindCSS (custom industrial theme)
- **Backend**: Firebase (Auth, Firestore, Storage) + Vercel Serverless Functions
- **Admin SDK**: Firebase Admin SDK for privileged operations
- **OCR**: Tesseract.js (client-side, offline-capable)
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- A Firebase project
- Vercel account (for backend API)

### 1. Clone & Install

```bash
cd AytKeep
npm install
```

### 2. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project (or use existing)
3. Enable the following services:
   - **Authentication** > Email/Password sign-in
   - **Firestore Database** > Create in production mode
   - **Storage** > Create default bucket

4. Get your Firebase config:
   - Project Settings > General > Your apps > Add web app
   - Copy the config values

### 3. Environment Configuration

Create a `.env` file in the project root:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### 4. Deploy Security Rules

#### Firestore Rules
In Firebase Console > Firestore > Rules, paste the contents of `firestore.rules`.

#### Storage Rules
In Firebase Console > Storage > Rules, paste the contents of `storage.rules`.

### 5. Seed the Initial Admin User

1. Download your service account key:
   - Firebase Console > Project Settings > Service Accounts
   - Generate New Private Key
   - Save as `scripts/serviceAccountKey.json`

2. Run the seed script:
```bash
npx ts-node scripts/seedAdmin.ts
```

3. Log in with:
   - **Username**: `admin`
   - **Password**: `AytAdmin2026!`

The login screen expects a username only. The app automatically appends `@ayt.local` to form the Firebase Auth email.

### 6. Run the App

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

## Project Structure

```
AytKeep/
├── api/
│   └── admin-actions.js       # Vercel serverless admin API
├── scripts/
│   └── seedAdmin.ts           # Admin seed script
├── src/
│   ├── components/
│   │   ├── AddNoteModal.tsx
│   │   ├── AddUserModal.tsx
│   │   ├── Dashboard.tsx
│   │   ├── LoadingSpinner.tsx
│   │   ├── Login.tsx
│   │   ├── NoteCard.tsx
│   │   ├── NoteDetailModal.tsx
│   │   ├── ProfileSettings.tsx
│   │   ├── UserManagement.tsx
│   │   └── UserProfileMenu.tsx
│   ├── contexts/
│   │   ├── AuthContext.tsx
│   │   └── ThemeContext.tsx
│   ├── firebase/
│   │   └── config.ts
│   ├── hooks/
│   │   ├── useNotes.ts
│   │   └── useOCR.ts
│   ├── pages/
│   │   └── TablePage.tsx
│   ├── services/
│   │   └── adminApi.ts
│   ├── types/
│   │   └── index.ts
│   ├── App.tsx
│   ├── index.css
│   └── main.tsx
├── firestore.rules
├── storage.rules
├── vercel.json
├── package.json
└── README.md
```

## Authentication System

The app uses a **username-only** login system:
- Users enter only their username on the login screen
- The app automatically appends `@ayt.local` to create the Firebase Auth email
- This keeps the internal email invisible to end users

## Design System

### Color Palette

| Color | Hex | Usage |
|-------|-----|-------|
| Slate 950 | `#0d1117` | Background |
| Slate 850 | `#1a2332` | Cards, headers |
| Safety Orange | `#FF6B00` | Primary actions, accents |
| Safety Yellow | `#FFB800` | Warnings, decorative |
| Steel 500 | `#627d98` | Secondary elements |
| Concrete 400 | `#adb5bd` | Text, borders |

### Typography

- **Primary Font**: Inter (UI elements)
- **Monospace**: JetBrains Mono (code, data)

## Security Rules

### Workers
- Create, read, update, and delete their own notes
- Cannot read other workers' notes

### Admins
- Read all notes
- Delete any note
- Change user roles
- Manage user accounts (reset password, disable, restore)

## Development

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint
npm run lint
```

## License

MIT License
