# Changelog

All notable changes to this project will be documented in this file.

## [2.0.0] - 2026-02-04

### 🚀 Major Architectural Upgrade

#### Added

**Backend Infrastructure:**
- ✨ Vercel Serverless Functions for privileged operations
- ✨ Firebase Admin SDK integration for secure backend operations
- ✨ `/api/admin-actions` endpoint with three actions:
  - `resetPassword`: Admin-controlled password updates
  - `deleteUser`: Soft delete (disable account)
  - `restoreUser`: Restore disabled accounts
- ✨ JWT token verification for admin authentication
- ✨ CORS configuration for secure cross-origin requests

**Authentication System:**
- ✨ Username-only authentication (no visible email required)
- ✨ Automatic `@insaat.local` domain appending
- ✨ `isActive` field in user profiles for soft delete
- ✨ Automatic sign-out for disabled accounts
- ✨ Login rejection for inactive users

**Admin User Management:**
- ✨ Password reset modal with secure admin-only access
- ✨ Soft delete functionality with visual indicators
- ✨ Restore user capability for disabled accounts
- ✨ Dimmed UI for inactive users
- ✨ "Devre Dışı" (Disabled) badge for inactive accounts
- ✨ Real-time status updates after admin actions

**User Profile:**
- ✨ Simplified profile settings (removed email change section)
- ✨ Username remains the primary identifier
- ✨ Self-service password change retained

**Developer Experience:**
- ✨ `adminApi.ts` service for backend communication
- ✨ `.env.example` with comprehensive configuration guide
- ✨ `vercel.json` for deployment configuration
- ✨ Comprehensive `DEPLOYMENT_GUIDE.md`
- ✨ Type safety updates in `types/index.ts`

#### Changed

**Breaking Changes:**
- ⚠️ `AuthContext.login()` now accepts only `username` (not email)
- ⚠️ `AuthContext.register()` signature changed: removed `email` parameter
- ⚠️ `updateUserEmail()` removed from AuthContext
- ⚠️ `sendPasswordReset()` removed (replaced by backend admin API)

**Component Updates:**
- 🔄 `Login.tsx`: Username-only input, removed email field
- 🔄 `AddUserModal.tsx`: Automatic email generation from username
- 🔄 `UserManagement.tsx`: Complete overhaul with new admin actions
- 🔄 `ProfileSettings.tsx`: Removed email change tab
- 🔄 `AuthContext.tsx`: Refactored for username-based auth

**UI/UX Improvements:**
- 🎨 Visual indicators for disabled accounts (opacity + badge)
- 🎨 Password reset modal with clear warning messages
- 🎨 Improved error messages for disabled accounts
- 🎨 Icon updates (Key, Trash2, UserCheck for admin actions)
- 🎨 Info banner in AddUserModal explaining email generation

#### Fixed
- 🐛 Admin cannot delete their own account
- 🐛 Disabled users cannot have password reset or role changed
- 🐛 Proper token refresh handling for admin operations
- 🐛 CORS errors in production with proper origin configuration

#### Security
- 🔒 Backend API verifies admin role before every action
- 🔒 ID token validation with Firebase Admin SDK
- 🔒 Secure password transmission to backend (HTTPS only)
- 🔒 Service account key stored only in environment variables
- 🔒 Automatic session termination for disabled users

#### Dependencies
- ⬆️ Moved `firebase-admin` from devDependencies to dependencies
- ⬆️ Firebase Admin SDK used for privileged operations

#### Documentation
- 📝 Added `DEPLOYMENT_GUIDE.md` with comprehensive setup instructions
- 📝 Added `CHANGELOG.md` (this file)
- 📝 Updated `.env.example` with new backend variables
- 📝 Added inline code comments for backend API
- 📝 Migration guide for existing users with real emails

---

## [1.0.0] - Initial Release

### Features
- Firebase Authentication with email/password
- Firestore database for user profiles and notes
- User roles (admin, worker)
- Note creation with image upload
- Multi-image support for notes
- Comment system on notes
- Real-time notifications
- Dark mode support
- Responsive design
- User management (admin only)
- Profile settings with email/password update
- Custom fields for notes (Ada, Parsel)
- Note status workflow (Open, In Progress, Resolved, Rejected)

---

**Versioning Scheme:** [Semantic Versioning 2.0.0](https://semver.org/)

**Format:**
- **Added**: New features
- **Changed**: Changes in existing functionality
- **Deprecated**: Soon-to-be removed features
- **Removed**: Removed features
- **Fixed**: Bug fixes
- **Security**: Vulnerability fixes
