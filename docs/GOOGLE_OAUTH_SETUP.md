# Google OAuth 2.0 Setup Guide

This guide walks you through setting up Google OAuth credentials for the Lead Forward Platform.

## Prerequisites

- A Google account
- Access to [Google Cloud Console](https://console.cloud.google.com/)

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click on the project dropdown at the top
3. Click "NEW PROJECT"
4. Enter project name: `lead-forward-platform`
5. Click "CREATE"
6. Wait for the project to be created (this may take a minute)

## Step 2: Enable the Google+ API

1. In Google Cloud Console, go to **APIs & Services** → **Library**
2. Search for "Google+ API"
3. Click on "Google+ API"
4. Click the **ENABLE** button
5. Wait for it to enable

## Step 3: Create OAuth 2.0 Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **+ CREATE CREDENTIALS** → **OAuth client ID**
3. You may be prompted to configure an OAuth consent screen first:
   - Click **CONFIGURE CONSENT SCREEN**
   - Choose **External** user type
   - Click **CREATE**

### Configure OAuth Consent Screen

1. **App information:**
   - App name: `Lead Forward Platform`
   - User support email: (your email address)

2. **App logo:** (optional, skip for now)

3. **Authorized domains:**
   - Add your domain if deployed (e.g., `leadforward.example.com`)
   - For local development, you can skip this

4. **Developer contact information:**
   - Add your email address

5. Scroll down and click **SAVE AND CONTINUE**

6. **Scopes:** Click **SAVE AND CONTINUE** (default scopes are fine)

7. **Test users:** Click **SAVE AND CONTINUE** (or add your email if you want to test before publishing)

8. Review and click **SAVE AND CONTINUE**

### Create OAuth Client ID

Back on the Credentials page:

1. Click **+ CREATE CREDENTIALS** → **OAuth client ID**
2. Select **Web application**
3. Enter name: `Lead Forward Web Client`
4. Under **Authorized JavaScript origins**, add:
   - `http://localhost:5173` (local development)
   - `http://localhost:3000` (alternative port)
   - Your production domain (e.g., `https://leadforward.example.com`)

5. Under **Authorized redirect URIs**, add:
   - `http://localhost:5173/auth/google/callback` (local development)
   - `http://localhost:3000/auth/google/callback` (alternative port)
   - Your production callback URL (e.g., `https://leadforward.example.com/auth/google/callback`)

6. Click **CREATE**

7. A modal will show your credentials. You'll need:
   - **Client ID**
   - **Client Secret**

⚠️ **IMPORTANT**: Keep your Client Secret private! Never commit it to version control.

## Step 4: Configure Environment Variables

### Local Development

Create a `.env.local` file in the project root (next to `wrangler.json`):

```env
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
JWT_SECRET=your_random_secret_key_here
```

**To generate a random JWT_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Production (Cloudflare)

Set secrets in Wrangler:

```bash
wrangler secret put GOOGLE_CLIENT_ID
# Paste your Client ID and press Enter

wrangler secret put GOOGLE_CLIENT_SECRET
# Paste your Client Secret and press Enter

wrangler secret put JWT_SECRET
# Paste your JWT secret and press Enter
```

## Step 5: Update wrangler.json

The `wrangler.json` file should already have environment variables configured. Ensure these sections exist:

```json
{
  "env": {
    "local": {
      "vars": {
        "GOOGLE_CLIENT_ID": "your_client_id",
        "GOOGLE_CLIENT_SECRET": "your_client_secret",
        "JWT_SECRET": "your_jwt_secret"
      }
    }
  }
}
```

For production, secrets are managed separately via `wrangler secret put`.

## Step 6: Verify Setup

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Navigate to `http://localhost:5173`

3. Click the "Sign In with Google" button

4. You should be redirected to Google's login page

5. After login, you should be redirected back to the app

## Troubleshooting

### "Redirect URI mismatch" Error

**Problem**: Google says the redirect URI doesn't match.

**Solution**:
1. Go to Google Cloud Console → Credentials
2. Click on your OAuth client ID
3. Check that your redirect URI exactly matches the one in your code
4. Common issues:
   - Missing trailing slash or extra slash
   - `http` vs `https` mismatch
   - Port number mismatch

### "Invalid Client ID" Error

**Problem**: The Client ID is not recognized.

**Solution**:
1. Verify the Client ID in your code matches Google Cloud Console
2. Check for extra spaces or typos
3. Ensure you copied from the correct project

### CORS Issues

**Problem**: Browser console shows CORS errors when exchanging tokens.

**Solution**:
1. Ensure your domain is in "Authorized JavaScript origins"
2. The token exchange happens on the backend, not the browser, so CORS shouldn't be an issue
3. Check that your backend is correctly configured

### "unauthenticated_user" Message

**Problem**: You see this message instead of user profile.

**Solution**:
1. This appears when the app doesn't recognize you as logged in
2. Check that JWT token is being stored correctly
3. Verify the JWT secret matches between local and production

## Next Steps

After setup:
1. Run `npm run dev` to start development
2. Test the Google OAuth flow locally
3. When ready for production, deploy with `npm run deploy`

## Resources

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Google Cloud Console](https://console.cloud.google.com/)
- [Google OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)
