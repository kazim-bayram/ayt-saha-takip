# 🏗️ SiteNotes - Construction Field Note App

A professional field note documentation app for construction sites, built with React, TypeScript, Firebase, and Tesseract.js OCR.

![SiteNotes Banner](https://via.placeholder.com/800x400/1a2332/FF6B00?text=SiteNotes+-+Field+Documentation)

> **🎉 NEW in v2.0.0:** Backend API integration, username-only authentication, and enhanced admin security!  
> **[📖 View Upgrade Guide](./UPGRADE_SUMMARY.md)** | **[🚀 Quick Start](./QUICK_START.md)** | **[📦 Deployment Guide](./DEPLOYMENT_GUIDE.md)**

## ✨ Features

### For Field Workers
- 📸 **Photo Documentation** - Capture or upload site images
- 🔍 **Auto OCR** - Automatically extract text from images using Tesseract.js
- 📝 **Easy Note Taking** - Document issues with title, project name, and description
- 📱 **Mobile-First Design** - Touch-friendly interface for on-site use
- 🔒 **Private Notes** - Workers can only view their own notes

### For Managers (Admin)
- 📊 **Dashboard View** - See all notes from all workers
- 🔎 **Advanced Filters** - Filter by worker, project, or date range
- 📋 **Full Details** - View complete note information with images
- 👥 **Team Oversight** - Monitor field documentation activity
- 🔐 **User Management** - Add users, reset passwords, disable accounts (v2.0+)
- 🔑 **Admin Password Reset** - Force update any user's password (v2.0+)
- 🗑️ **Soft Delete Users** - Disable accounts without losing data (v2.0+)

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: TailwindCSS (custom industrial theme)
- **Backend**: Firebase (Auth, Firestore, Storage) + Vercel Serverless Functions (v2.0+)
- **Admin SDK**: Firebase Admin SDK for privileged operations (v2.0+)
- **OCR**: Tesseract.js (client-side, offline-capable)
- **Icons**: Lucide React

## 🚀 Getting Started

> **⚡ IMPORTANT:** For v2.0 with backend features, follow **[QUICK_START.md](./QUICK_START.md)** instead!

### Prerequisites

- Node.js 18+ and npm
- A Firebase project
- Vercel account (for backend API, v2.0+)

### 1. Clone & Install

```bash
cd KeepClone
npm install
```

### 2. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project (or use existing)
3. Enable the following services:
   - **Authentication** → Email/Password sign-in
   - **Firestore Database** → Create in production mode
   - **Storage** → Create default bucket

4. Get your Firebase config:
   - Project Settings → General → Your apps → Add web app
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
In Firebase Console → Firestore → Rules, paste the contents of `firestore.rules`:

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isAdmin() {
      return isAuthenticated() && 
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    match /users/{userId} {
      allow read: if isOwner(userId) || isAdmin();
      allow create: if isOwner(userId);
      allow update: if isOwner(userId) || isAdmin();
    }
    
    match /notes/{noteId} {
      allow read: if isOwner(resource.data.userId) || isAdmin();
      allow create: if isAuthenticated() && 
                       request.resource.data.userId == request.auth.uid;
      allow update: if isOwner(resource.data.userId);
      allow delete: if isOwner(resource.data.userId) || isAdmin();
    }
  }
}
```

#### Storage Rules
In Firebase Console → Storage → Rules, paste the contents of `storage.rules`:

```javascript
rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {
    match /notes/{userId}/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
                      request.auth.uid == userId &&
                      request.resource.size < 10 * 1024 * 1024 &&
                      request.resource.contentType.matches('image/.*');
    }
  }
}
```

### 5. Run the App

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

## 👑 Setting Up an Admin User

### Method 1: Firebase Console (Recommended)

1. Register a user through the app
2. Go to Firebase Console → Firestore Database
3. Navigate to `users` collection
4. Find the user document by their email/UID
5. Click on the document → Edit field
6. Change `role` from `"worker"` to `"admin"`
7. Save

### Method 2: Using the Seed Script

1. Download your service account key:
   - Firebase Console → Project Settings → Service Accounts
   - Generate New Private Key
   - Save as `scripts/serviceAccountKey.json`

2. Get the user's UID:
   - Firebase Console → Authentication → Users
   - Copy the User UID

3. Run the script:
```bash
npx ts-node scripts/seedAdmin.ts <USER_UID>
```

## 📁 Project Structure

```
KeepClone/
├── public/
│   └── hardhat.svg          # App icon
├── scripts/
│   └── seedAdmin.ts         # Admin setup script
├── src/
│   ├── components/
│   │   ├── AddNoteModal.tsx     # Create/edit note form
│   │   ├── Dashboard.tsx        # Main dashboard view
│   │   ├── LoadingSpinner.tsx   # Loading states
│   │   ├── Login.tsx            # Auth screen
│   │   ├── NoteCard.tsx         # Note display card
│   │   └── NoteDetailModal.tsx  # Full note view
│   ├── contexts/
│   │   └── AuthContext.tsx      # Auth state management
│   ├── firebase/
│   │   └── config.ts            # Firebase initialization
│   ├── hooks/
│   │   ├── useNotes.ts          # Notes CRUD operations
│   │   └── useOCR.ts            # Tesseract.js OCR
│   ├── types/
│   │   └── index.ts             # TypeScript interfaces
│   ├── App.tsx
│   ├── index.css
│   └── main.tsx
├── firestore.rules              # Firestore security rules
├── storage.rules                # Storage security rules
├── tailwind.config.js
├── package.json
└── README.md
```

## 🎨 Design System

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

## 🔐 Security Rules Explained

### Workers
- ✅ Create their own notes
- ✅ Read their own notes
- ✅ Update their own notes
- ✅ Delete their own notes
- ❌ Cannot read other workers' notes

### Admins
- ✅ Read all notes
- ✅ Delete any note
- ✅ Change user roles
- ❌ Cannot create notes (use worker account)

## 📱 Mobile Experience

The app is designed mobile-first with:
- Large touch targets (min 44px)
- Responsive masonry grid
- Swipe-friendly modals
- Camera integration for quick photos
- 16px minimum font size (prevents iOS zoom)

## 🔧 Development

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

## 📄 License

MIT License - Feel free to use this for your construction projects!

---

Built with 🧱 for construction teams everywhere.
