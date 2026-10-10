# NyumbaFinder account creation and recovery workflow

## Account creation (email and password)
1. The visitor opens **Account → Create account**, enters a name, email, and password (10–128 characters).
2. The API normalizes the email address, validates the fields, hashes the password with scrypt, and creates the user and profile in PostgreSQL.
3. The API starts the signed, HTTP-only session cookie and attempts to send a **Welcome to NyumbaFinder** email through Resend.
4. The visitor is redirected to the signed-in account dashboard. The dashboard states whether the welcome email was accepted by Resend. If email delivery is not configured or fails, account creation still succeeds and the dashboard says so.
5. If the email is already registered, the API directs the visitor to sign in or use password recovery.

## Sign in
- Email/password sign-in verifies the stored scrypt password hash and account status.
- Google sign-in validates Google's OAuth state and requires Google's profile to report a verified email.
- The header and account page read the same server-side session. The user can sign out from the account dashboard.

## Forgot password and reset
1. The visitor chooses **Forgot password?** and enters their email.
2. The API uses a generic response for an unknown email to reduce account enumeration. When the email exists, it creates a cryptographically random token, stores only its SHA-256 hash, and sends a reset link through Resend.
3. Reset links expire after **30 minutes** and are single-use. If email delivery fails, the API returns a clear temporary error and invalidates the unsent reset token rather than pretending the email was sent.
4. The visitor opens the link, chooses a new 10–128 character password, and submits it.
5. The API updates the password, marks the token used, invalidates other reset tokens for that user, and attempts to send a **password changed** security notification. The visitor can then sign in with the new password.

## Required production configuration
Set these in the NyumbaFinder Vercel project's Production environment:
- `RESEND_API_KEY`: a valid Resend API key.
- `RESEND_FROM_EMAIL`: a sender address/domain verified in Resend.
- `APP_URL`: preferably `https://www.nyumba-finder.com` (or the canonical production domain). If omitted, the request origin is used to construct links.
- `USER_SESSION_SECRET`: a stable random secret with at least 32 characters. Keep it unchanged across production deployments so existing sessions remain valid.

Google OAuth additionally requires `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`, with the authorized redirect URI `https://www.nyumba-finder.com/api/auth/google/callback` if that is the chosen canonical domain.

## Production verification checklist
- Register using a test email you control. Confirm dashboard session persists after refresh and the welcome email appears in Resend's email activity.
- Sign out, sign back in with the new credentials, and verify the header/account dashboard recognizes the same user.
- Request a reset. Confirm the reset email arrives, the link opens the reset form, and an expired or reused link is rejected.
- Set a new password, confirm the password-changed email, then sign in using the new password and verify the old password is rejected.
- Test with an unknown email; the page should not disclose whether the address has an account.
- Check Resend's activity for delivery/bounce status. An accepted API response is not proof that the recipient's inbox received the message.

## Delivery status and limitations
Emails are sent through Resend only when the required environment variables are set. A website build does not verify delivery. The application logs email send failures, and production acceptance must be confirmed with a real test inbox and Resend activity. The current email/password registration workflow sends a welcome notification; it does not require email verification before the new account can be used.
