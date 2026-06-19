# Authentication and Profile Workflow

## Purpose

Authentication ensures that only verified users can access the PakLaw AI dashboard, repositories, searches, and analysis pages.

The project uses Firebase Authentication for user login and signup. Firestore is used for storing basic user profile data such as name, email, role, and created timestamp.

## Main Files

| File | Purpose |
|---|---|
| `frontend/src/context/AuthContext.tsx` | Central authentication provider |
| `frontend/src/lib/firebase.ts` | Firebase app, auth, and Firestore initialization |
| `frontend/src/app/login/page.tsx` | Login page |
| `frontend/src/app/signup/page.tsx` | Signup page |
| `frontend/src/app/verify-email/page.tsx` | Email verification flow |
| `frontend/src/app/settings/page.tsx` | Profile name update |
| `frontend/src/app/change-email/page.tsx` | Email change flow |
| `frontend/src/app/change-password/page.tsx` | Password change flow |
| `frontend/src/components/Navbar.tsx` | Authenticated user dropdown and logout |

## Firebase Configuration

Firebase is initialized in `frontend/src/lib/firebase.ts`.

The project expects these environment variables:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

The Firebase app exports:

- `auth`
- `db`

`auth` is used for authentication and `db` is used for Firestore profile records.

## Signup Flow

The signup process is handled in `AuthContext.signup`.

Steps:

1. User enters name, email, and password.
2. Firebase creates the account using `createUserWithEmailAndPassword`.
3. The Firebase display name is updated using `updateProfile`.
4. A Firestore user document is created under `users/{uid}`.
5. The user is assigned the stored role value `user`.
6. Firebase sends an email verification link.
7. The user is signed out.
8. User must verify email before login.

The stored role is only kept for possible future use. The current frontend has no admin pages or admin behavior.

## Login Flow

The login process is handled in `AuthContext.login`.

Steps:

1. User enters email and password.
2. Firebase attempts login using `signInWithEmailAndPassword`.
3. If the account email is not verified, the user is immediately signed out.
4. Login fails with a message asking the user to verify email.
5. If verified, login succeeds and the user can access protected pages.

## Auth State Listener

`AuthContext` uses Firebase's `onAuthStateChanged`.

When Firebase auth state changes:

1. The raw Firebase user is stored as `firebaseUser`.
2. If there is no Firebase user, the app user becomes `null`.
3. If the Firebase user exists but email is not verified, the app user becomes `null`.
4. If the email is verified, the app builds an application user object.

The app user contains:

```ts
interface AppUser {
  uid: string;
  name: string;
  email: string;
  emailVerified: boolean;
}
```

## Building the App User

`buildAppUser` merges Firebase Auth data with Firestore profile data.

Priority for name:

1. Firebase display name
2. Firestore `name`
3. Fallback value `User`

This gives the UI a stable user name even if Firestore reads fail.

## Protected Page Behavior

Protected pages use:

```ts
const { isAuthenticated, isLoading } = useAuth();
```

If loading is complete and the user is not authenticated, the page redirects to `/login`.

This behavior is used by:

- Dashboard
- Search Laws
- My Repositories
- Consistency Audit
- Multi-File Analysis
- Analysis Report
- Settings pages

## Profile Name Update

Profile name update is handled through `updateDisplayName`.

Steps:

1. Check that Firebase user exists.
2. Update Firebase display name.
3. Update Firestore user document using merge.
4. Update local React state.

This makes the navbar display name update without requiring a full reload.

## Password Change Flow

Password change uses Firebase reauthentication.

Steps:

1. User enters current password and new password.
2. App creates a credential using current email and password.
3. Firebase reauthenticates the user.
4. Firebase updates the password.
5. Any failure is converted into a friendly error message.

Reauthentication is important because Firebase treats password change as a sensitive action.

## Email Change Flow

Email change also uses reauthentication.

Steps:

1. User enters current password and new email.
2. App reauthenticates the current user.
3. Firebase sends a verification link to the new email using `verifyBeforeUpdateEmail`.
4. The email changes only after the user verifies the new email.

This prevents unauthorized email changes.

## Logout Flow

Logout is handled in `AuthContext.logout`.

Steps:

1. Firebase signs out the current user.
2. React user state is cleared.
3. Navbar redirects user to `/login`.

## Error Handling

`friendlyError` maps Firebase error codes to readable messages.

Examples:

| Firebase Code | User Message |
|---|---|
| `auth/user-not-found` | No account found with that email. |
| `auth/wrong-password` | Incorrect password. |
| `auth/invalid-credential` | Invalid email or password. |
| `auth/email-already-in-use` | An account with this email already exists. |
| `auth/weak-password` | Password must be at least 6 characters. |
| `auth/requires-recent-login` | Please log out and log back in before making this change. |

## Security Notes

- Email verification is required before access.
- Sensitive account changes require reauthentication.
- Firebase handles password storage and authentication security.
- The frontend does not expose admin behavior.
- Environment variables are used for Firebase project configuration.

## Current Limitations

- Firestore role is stored but not currently used for authorization.
- The project has no admin pages.
- Repository files are not secured through backend storage yet because repository content is frontend metadata only.

## Summary

The authentication system provides verified-user access, profile management, email change, password change, and logout. It is suitable for the current frontend prototype and can later be extended with backend authorization rules when real repository file storage and AI processing are connected.
