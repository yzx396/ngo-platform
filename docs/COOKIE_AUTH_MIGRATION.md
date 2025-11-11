# Migrate Authentication from localStorage to HTTP-only Cookies

## Problem

Blog pages in WeChat's built-in browser fail with Google OAuth error: "Access blocked: Lead Forward Platform's request does not comply with Google's policies" (error code `disallowed_useragent`).

**Root Cause**: `useAuth()` hook attempts localStorage access, which is blocked/restricted in WeChat's browser, triggering OAuth redirect.

## Solution

Migrate from localStorage-based JWT storage to secure HTTP-only cookies. Cookies are automatically sent with requests, work in WeChat, and are more secure against XSS attacks.

**Benefits**:
- ✅ Works in WeChat's built-in browser
- ✅ More secure (protected from XSS attacks via HttpOnly flag)
- ✅ Automatic cookie sending (no manual Authorization headers)
- ✅ Simpler frontend code (no localStorage management)
- ✅ Session persists across page refreshes and tabs

---

## Backend Changes

### 1. Update OAuth Callback Handler

**File**: `src/worker/index.ts` (lines ~1800-1850, search for "auth/google/callback")

**Changes**:
- After JWT creation, set HTTP-only cookie instead of returning token in JSON
- Cookie should include:
  - `HttpOnly`: Prevents JavaScript from accessing token (XSS protection)
  - `Secure`: Only sent over HTTPS
  - `SameSite=Lax`: CSRF protection
  - `Path=/`: Available to entire app
  - `Max-Age=604800`: 7-day expiration (matches JWT exp)

**Implementation**:
```typescript
// Set secure cookie
c.header('Set-Cookie', `auth_token=${jwt}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800`);

// Return user info (but NOT the token)
return c.json({
  user: {
    userId: user.id,
    email: user.email,
    name: user.name,
  }
});
```

### 2. Update Auth Middleware

**File**: `src/worker/auth/middleware.ts`

**Changes**:
- Extract JWT from `Cookie` header instead of `Authorization` header
- Parse cookie string to find `auth_token` value
- Keep same validation logic with `jose.jwtVerify()`

**Implementation**:
```typescript
export const requireAuth = async (c: Context, next: Next) => {
  try {
    const cookieHeader = c.req.header('Cookie') || '';
    const token = parseCookie(cookieHeader, 'auth_token');

    if (!token) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const verified = await jwtVerify(token, secret);
    c.set('userId', verified.payload.userId);
    await next();
  } catch {
    return c.json({ error: 'Unauthorized' }, 401);
  }
};

// Helper to parse cookie
function parseCookie(cookieHeader: string, name: string): string | null {
  const cookies = cookieHeader.split(';');
  for (const cookie of cookies) {
    const [key, value] = cookie.trim().split('=');
    if (key === name) return value;
  }
  return null;
}
```

### 3. Update Logout Endpoint

**File**: `src/worker/index.ts` (search for POST /auth/logout or create new)

**Changes**:
- Clear cookie by setting it with empty value and `Max-Age=0`

**Implementation**:
```typescript
app.post('/api/v1/auth/logout', (c) => {
  c.header('Set-Cookie', 'auth_token=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0');
  return c.json({ success: true });
});
```

### 4. Update `/auth/me` Endpoint

**Status**: No changes needed. Already uses `requireAuth` middleware, which will work with cookies.

---

## Frontend Changes

### 5. Remove localStorage Utility Functions

**File**: `src/react-app/services/apiClient.ts` (lines ~40-70)

**Remove these functions**:
- `getAuthToken()`
- `setAuthToken(token)`
- `removeAuthToken()`
- All `localStorage.getItem()`, `localStorage.setItem()`, `localStorage.removeItem()` calls

### 6. Update API Client

**File**: `src/react-app/services/apiClient.ts`

**Changes**:
1. Remove Authorization header injection code
2. Add `credentials: 'include'` to all fetch calls (ensures cookies are sent)
3. Keep error handling and response parsing

**Before**:
```typescript
const token = getAuthToken();
if (token) {
  headers.set('Authorization', `Bearer ${token}`);
}
```

**After**:
```typescript
const response = await fetch(url, {
  method,
  headers,
  body,
  credentials: 'include'  // Important: sends cookies with request
});
```

### 7. Update AuthContext

**File**: `src/react-app/context/AuthContext.tsx`

**Changes**:
1. Remove token state/management
2. Remove localStorage operations
3. Keep user state
4. On app load (`useEffect`), fetch user from `/auth/me` to restore session
5. On logout, call `/auth/logout` to clear server-side cookie

**New Flow**:
```typescript
const [user, setUser] = useState<User | null>(null);
const [isLoading, setIsLoading] = useState(true);

useEffect(() => {
  // Try to restore session from cookie
  const restoreSession = async () => {
    try {
      const response = await apiClient.get('/api/v1/auth/me');
      setUser(response.user);
    } catch {
      // No valid cookie or session expired
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  restoreSession();
}, []);

const logout = async () => {
  await apiClient.post('/api/v1/auth/logout');
  setUser(null);
};
```

### 8. Update OAuth Callback Page

**File**: `src/react-app/pages/OAuthCallbackPage.tsx`

**Changes**:
- Don't try to store token (it's in cookie now)
- Read user data from response
- Update AuthContext with user
- Redirect to intended page

**Implementation**:
```typescript
useEffect(() => {
  const handleCallback = async () => {
    const code = new URLSearchParams(location.search).get('code');

    try {
      const response = await apiClient.get(`/api/v1/auth/google/callback?code=${code}`);
      // User data is in response
      const { user } = response;

      // Update auth context with user
      setUser(user);

      // Redirect to intended page
      const redirectTo = sessionStorage.getItem('auth_redirect') || '/';
      navigate(redirectTo);
    } catch (error) {
      // Handle error
      navigate('/login?error=auth_failed');
    }
  };

  handleCallback();
}, []);
```

### 9. Update Login Logic

**Files**:
- `src/react-app/pages/LoginPage.tsx`
- `src/react-app/context/AuthContext.tsx`

**Changes**:
- Store redirect URL in `sessionStorage` (not `localStorage`)
- After callback, use stored redirect
- Remove any token-related logic

**Implementation**:
```typescript
const handleGoogleLogin = () => {
  sessionStorage.setItem('auth_redirect', location.pathname);
  window.location.href = loginUrl; // Redirect to Google
};
```

---

## Testing Plan

### Unit Tests

**File**: `src/worker/__tests__/auth.test.ts`

Test cases to add/update:
1. ✅ OAuth callback sets `auth_token` cookie with correct attributes
2. ✅ Logout endpoint clears cookie (Max-Age=0)
3. ✅ Auth middleware reads token from cookie
4. ✅ Auth middleware rejects when cookie missing
5. ✅ Auth middleware rejects when token expired

**File**: `src/react-app/__tests__/AuthContext.test.tsx`

Test cases:
1. ✅ Restores user session from `/auth/me` on mount
2. ✅ Sets user to null if `/auth/me` fails (no valid cookie)
3. ✅ Clears user on logout
4. ✅ No localStorage calls anywhere

**File**: `src/react-app/__tests__/apiClient.test.ts`

Test cases:
1. ✅ API requests include `credentials: 'include'`
2. ✅ No Authorization header is set
3. ✅ Error handling still works

### Manual Testing (Critical for WeChat)

**Test Environment**: Local development (`npm run dev`)

**Test Cases**:

1. **Login Flow in Regular Browser**
   - [ ] Click "Sign in with Google"
   - [ ] Complete OAuth flow
   - [ ] Redirected back to app
   - [ ] User is logged in
   - [ ] Check Network tab: Cookie set in response headers
   - [ ] Refresh page: User still logged in (session restored)

2. **Login Flow in WeChat Browser** (critical!)
   - [ ] Click "Sign in with Google"
   - [ ] Verify NO `disallowed_useragent` error
   - [ ] Complete OAuth flow successfully
   - [ ] Redirected back to app
   - [ ] User is logged in
   - [ ] Refresh page: User still logged in

3. **Blog Pages (Public)**
   - [ ] Access `/blogs` without logging in
   - [ ] Blog list loads successfully
   - [ ] Click on blog to view detail
   - [ ] Blog loads without OAuth error
   - [ ] Check Network: No Authorization header, but cookie is sent

4. **Members-Only Blog**
   - [ ] While logged out, access members-only blog
   - [ ] See preview (first 200 chars)
   - [ ] See "Sign in to read full article" message
   - [ ] Click sign in, complete OAuth
   - [ ] See full blog content

5. **Logout**
   - [ ] Click logout
   - [ ] User logged out, redirected to home
   - [ ] Check Network: Cookie cleared (`Max-Age=0`)
   - [ ] Refresh page: User is logged out
   - [ ] Try accessing protected page: Redirected to login

6. **Multiple Tabs**
   - [ ] Open app in 2 tabs
   - [ ] Log in from tab 1
   - [ ] Refresh tab 2: User is logged in (cookie shared)
   - [ ] Logout from tab 1
   - [ ] Refresh tab 2: User is logged out

---

## Files to Modify

| File | Type | Changes |
|------|------|---------|
| `src/worker/index.ts` | Backend | Set cookie in OAuth callback, clear in logout |
| `src/worker/auth/middleware.ts` | Backend | Read token from Cookie header |
| `src/react-app/services/apiClient.ts` | Frontend | Add credentials, remove localStorage |
| `src/react-app/context/AuthContext.tsx` | Frontend | Remove token state, add session restore |
| `src/react-app/pages/OAuthCallbackPage.tsx` | Frontend | Don't store token, redirect after callback |
| `src/react-app/pages/LoginPage.tsx` | Frontend | Store redirect in sessionStorage |
| `src/worker/__tests__/auth.test.ts` | Tests | Add cookie auth tests |
| `src/react-app/__tests__/AuthContext.test.tsx` | Tests | Remove localStorage tests |
| `src/react-app/__tests__/apiClient.test.ts` | Tests | Verify credentials and headers |

---

## Migration Checklist

- [ ] Backend: Update OAuth callback to set cookie
- [ ] Backend: Update auth middleware to read from cookie
- [ ] Backend: Add logout endpoint
- [ ] Frontend: Remove localStorage from apiClient
- [ ] Frontend: Add credentials to fetch calls
- [ ] Frontend: Update AuthContext
- [ ] Frontend: Update OAuthCallbackPage
- [ ] Frontend: Update LoginPage
- [ ] Tests: Add cookie auth tests
- [ ] Tests: Update existing tests
- [ ] Manual Testing: Test login in WeChat browser
- [ ] Manual Testing: Test public blogs in WeChat
- [ ] Verify: No localStorage references remain

---

## Deployment Notes

1. **Before deploying**: All tests must pass, manual testing in WeChat completed
2. **Monitor production**: Watch logs for auth errors after deployment
3. **Rollback plan**: If issues occur, can temporarily set both cookie and localStorage
4. **User impact**: Users will need to re-authenticate once (old localStorage tokens won't be valid)

---

## Alternative: Gradual Migration

If you want to avoid forcing re-authentication, we can:

1. Keep localStorage as fallback
2. Try cookie first, fall back to localStorage
3. Over time, localStorage becomes unused
4. Eventually remove localStorage code

This requires more code but smoother user experience.

---

## References

- [MDN: HTTP Cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies)
- [OWASP: Secure Coding - Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [WeChat Browser Limitations](https://developers.weixin.qq.com/doc/offiaccount/Overview/Callback_explained.html)
