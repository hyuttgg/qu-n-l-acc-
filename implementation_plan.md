# Implementation Plan - Add Change Email or Password Feature

This plan outlines the steps required to implement the ability for users to update their email address (Gmail) or password from the settings page.

## Proposed Changes

We will modify both the backend and frontend components.

---

### Backend

We will add validation schemas, add routes for updating email and password, and implement the logic in both the MongoDB models and the in-memory `mockStore` fallback.

#### [MODIFY] [validator.js](file:///d:/Users/khanh/Desktop/qu%E1%BA%A3n%20l%C3%BD%20acc%20python/backend/middleware/validator.js)
- Add and export `updateEmailSchema` (requires current password and new email).
- Add and export `updatePasswordSchema` (requires current password, new password).

#### [MODIFY] [auth.js](file:///d:/Users/khanh/Desktop/qu%E1%BA%A3n%20l%C3%BD%20acc%20python/backend/routes/auth.js)
- Implement `PUT /api/auth/update-email`:
  - Protect via `protect` middleware.
  - Validate with `validate(updateEmailSchema)`.
  - Compare current password against the user's hashed password (support MongoDB via `matchPassword` and `mockStore` fallback).
  - Check if the new email already exists.
  - Update user email and return the updated user object.
- Implement `PUT /api/auth/update-password`:
  - Protect via `protect` middleware.
  - Validate with `validate(updatePasswordSchema)`.
  - Compare current password against the user's hashed password.
  - Hash and save the new password (rely on `pre('save')` schema hook or update directly for mock).

---

### Frontend

We will extend the fetch client to support `PUT` requests, add a helper to update user state in the store context, and design the forms on the Settings page.

#### [MODIFY] [api.ts](file:///d:/Users/khanh/Desktop/qu%E1%BA%A3n%20l%C3%BD%20acc%20python/frontend/src/utils/api.ts)
- Add a `put` method to the `api` wrapper to handle sending PUT requests.

#### [MODIFY] [index.tsx](file:///d:/Users/khanh/Desktop/qu%E1%BA%A3n%20l%C3%BD%20acc%20python/frontend/src/store/index.tsx)
- Expose `updateUser` function (takes `User` details and calls `setUser`) to the context so pages can easily update local user state upon successful modifications.

#### [MODIFY] [SettingsPage.tsx](file:///d:/Users/khanh/Desktop/qu%E1%BA%A3n%20l%C3%BD%20acc%20python/frontend/src/pages/SettingsPage.tsx)
- Refactor the "User Profile Information" section.
- Add forms for:
  - **Change Email Address**:
    - Fields: New Email, Current Password.
    - Submit: Invokes `PUT /api/auth/update-email` and updates user state.
  - **Change Password**:
    - Fields: Current Password, New Password, Confirm New Password.
    - Submit: Invokes `PUT /api/auth/update-password`.
- Add success/error message alerts to give real-time feedback.
- Ensure the forms match the dark ocean UI design guidelines (glowing inputs, consistent spacing, loading states).

---

## Verification Plan

### Automated Tests
- No automated tests currently exist for user profiles, but we can verify the routes via post-deployment validation or manual testing.

### Manual Verification
- Log in to the application.
- Navigate to the Settings page.
- Test updating the email with correct/incorrect passwords.
- Test updating the password with incorrect/correct current passwords.
- Verify that changes persist across page refresh.
