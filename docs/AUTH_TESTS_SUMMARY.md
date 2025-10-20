# Authentication Tests Summary

This document summarizes the comprehensive test coverage for the Google OAuth 2.0 authentication system.

## Test Files

### 1. Backend Tests: `src/worker/__tests__/auth.test.ts`
**Purpose**: Verify JWT token creation, verification, and auth payload handling

#### JWT Token Tests (14 tests)
Tests the core JWT functionality using the `jose` library.

| Test | What it Verifies |
|------|------------------|
| `createToken - should create a valid JWT` | Token is created with proper format (3 parts) |
| `createToken - includes payload data` | Payload data is properly encoded in token |
| `createToken - sets expiration time` | Expiration timestamp is set correctly |
| `createToken - uses default 7-day expiration` | Default expiration is 168 hours (7 days) |
| `verifyToken - should verify valid token` | Valid tokens can be verified and decoded |
| `verifyToken - throws error for invalid token` | Rejects malformed tokens |
| `verifyToken - throws error for tampered token` | Rejects tokens with modified payload |
| `verifyToken - throws error for wrong secret` | Rejects tokens signed with different secret |
| `extractTokenFromHeader - extracts Bearer token` | Correctly extracts token from Authorization header |
| `extractTokenFromHeader - returns null for missing` | Handles missing header gracefully |
| `extractTokenFromHeader - returns null for empty` | Handles empty header gracefully |
| `extractTokenFromHeader - returns null without Bearer` | Requires Bearer prefix |
| `extractTokenFromHeader - returns null for malformed` | Validates header format |

#### Auth Payload Tests (2 tests)
Tests conversion of User objects to auth payloads.

| Test | What it Verifies |
|------|------------------|
| `createAuthPayload - creates payload from user` | Essential fields are included in payload |
| `createAuthPayload - excludes sensitive fields` | Sensitive fields like google_id are not exposed |

#### Token Expiration Tests (2 tests)
Tests expiration timestamp handling.

| Test | What it Verifies |
|------|------------------|
| `Token expiration - correct expiration timestamp` | Expiration time matches requested duration |
| `Token expiration - includes issued at timestamp` | JWT iat claim is set correctly |

#### OAuth User Profile Tests (2 tests)
Tests compatibility with Google OAuth user profile handling.

| Test | What it Verifies |
|------|------------------|
| `OAuth user - handles user with google_id` | Works correctly with Google-authenticated users |
| `OAuth user - handles user without google_id` | Maintains backwards compatibility |

**Total Backend Tests: 20**

---

### 2. Frontend Tests: `src/react-app/__tests__/auth.test.tsx`
**Purpose**: Verify AuthContext, useAuth hook, ProtectedRoute, and token management

#### AuthContext Initial State Tests (3 tests)
Tests the initial authentication state behavior.

| Test | What it Verifies |
|------|------------------|
| `Initial state - provides unauthenticated state` | Users start in unauthenticated state |
| `Initial state - shows loading during mount` | Loading state displays while fetching user |
| `Initial state - loads token from localStorage` | Token is loaded from localStorage on mount |

#### AuthContext login() Tests (2 tests)
Tests the login functionality.

| Test | What it Verifies |
|------|------------------|
| `login() - sets authentication state` | User becomes authenticated after login |
| `login() - stores token in localStorage` | JWT token persists in localStorage |

#### AuthContext logout() Tests (2 tests)
Tests the logout functionality.

| Test | What it Verifies |
|------|------------------|
| `logout() - clears authentication state` | User becomes unauthenticated after logout |
| `logout() - removes token from localStorage` | JWT token is removed from localStorage |

#### AuthContext getUser() Tests (3 tests)
Tests the user fetching functionality.

| Test | What it Verifies |
|------|------------------|
| `getUser() - fetches user from API` | User can be fetched with valid token |
| `getUser() - returns null without token` | Returns null when no token available |
| `getUser() - logouts on 401 response` | Automatically logs out on unauthorized response |

#### useAuth Hook Tests (1 test)
Tests the hook validation.

| Test | What it Verifies |
|------|------------------|
| `useAuth - throws error outside provider` | Hook requires AuthProvider wrapper |

#### ProtectedRoute Tests (3 tests)
Tests protected route functionality.

| Test | What it Verifies |
|------|------------------|
| `ProtectedRoute - shows loading state` | Loading indicator displays while checking auth |
| `ProtectedRoute - redirects when unauthenticated` | Unauthenticated users are redirected to login |
| `ProtectedRoute - renders content when authenticated` | Authenticated users can access protected content |

#### Token Persistence Tests (3 tests)
Tests token storage and retrieval.

| Test | What it Verifies |
|------|------------------|
| `Token persistence - persists across remounts` | Token survives component unmounting |
| `Token persistence - does not persist invalid` | Invalid tokens are cleared |

#### API Client Token Attachment Tests (1 test)
Tests API client integration.

| Test | What it Verifies |
|------|------------------|
| `API client - attaches JWT to requests` | Token is stored and retrievable |

**Total Frontend Tests: 18**

---

## Running the Tests

### Run All Tests
```bash
npm run test
```

### Run Tests in Watch Mode
```bash
npm run test:watch
```

### Run Only Backend Auth Tests
```bash
npm run test:watch -- --project=worker src/worker/__tests__/auth.test.ts
```

### Run Only Frontend Auth Tests
```bash
npm run test:watch -- --project=react src/react-app/__tests__/auth.test.tsx
```

### Run with Coverage Report
```bash
npm run test:coverage
```

---

## Test Coverage

### Backend Authentication Coverage
- ✅ JWT token creation with various expiration times
- ✅ JWT verification with valid and invalid tokens
- ✅ Token tampering detection
- ✅ Secret key validation
- ✅ Header parsing and extraction
- ✅ Auth payload creation and sanitization
- ✅ User profile handling (with and without google_id)

### Frontend Authentication Coverage
- ✅ AuthContext initialization and state management
- ✅ Login flow with token storage
- ✅ Logout flow with token cleanup
- ✅ User fetching from API
- ✅ Protected route access control
- ✅ Error handling (401 responses)
- ✅ Token persistence across sessions
- ✅ Loading states
- ✅ Hook usage validation

---

## Key Testing Patterns

### 1. Mock Fetch Calls
Frontend tests mock `fetch` to simulate API responses:
```typescript
global.fetch = vi.fn(() =>
  Promise.resolve(new Response(JSON.stringify(mockUser)))
);
```

### 2. Component Rendering with Context
Tests render components inside AuthProvider:
```typescript
render(
  <BrowserRouter>
    <AuthProvider>
      <TestComponent />
    </AuthProvider>
  </BrowserRouter>
);
```

### 3. State Testing with useAuth Hook
Tests verify state changes through the hook:
```typescript
const { login, logout, isAuthenticated } = useAuth();
authUtils.login('token', mockUser);
await waitFor(() => {
  expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');
});
```

### 4. localStorage Management
Tests verify token persistence:
```typescript
localStorage.setItem('auth_token', 'test-token');
expect(localStorage.getItem('auth_token')).toBe('test-token');
```

### 5. Async Wait Operations
Tests properly wait for async operations:
```typescript
await waitFor(() => {
  expect(screen.getByTestId('component')).toBeInTheDocument();
});
```

---

## Test Dependencies

### Backend Tests
- `vitest` - Test runner
- `jose` - JWT library (tested functionality)

### Frontend Tests
- `vitest` - Test runner
- `@testing-library/react` - React component testing
- `react-router-dom` - Routing (used in test components)

---

## Security Tests Covered

✅ **Token Validation**
- Verifies tokens are properly signed
- Detects tampered tokens
- Validates token secrets

✅ **Auth State Management**
- Ensures only authenticated users access protected content
- Properly clears auth state on logout
- Handles 401 errors correctly

✅ **Token Storage**
- Tests secure localStorage usage
- Verifies token cleanup on logout
- Tests invalid token removal

✅ **Payload Security**
- Ensures sensitive fields (google_id) aren't exposed in JWT
- Validates proper field inclusion in auth payload

---

## Future Test Enhancements

Consider adding tests for:

1. **OAuth Flow Integration Tests**
   - Test Google code exchange flow end-to-end
   - Mock Google API responses
   - Test error handling for OAuth failures

2. **API Route Protection**
   - Test middleware enforcement on protected routes
   - Test 401 responses for missing/invalid tokens
   - Test 403 responses for insufficient permissions

3. **Performance Tests**
   - Token creation/verification speed
   - Auth check latency
   - Token parsing efficiency

4. **Edge Cases**
   - Expired tokens in localStorage
   - Corrupted tokens
   - Network timeouts during user fetch
   - Race conditions in concurrent requests

5. **Integration Tests**
   - Full login flow with real Hono app
   - OAuth callback handling
   - User creation and linking
   - Database integration

---

## Notes

- All tests use **TDD principles**: they verify behavior contracts rather than implementation details
- Tests are **isolated**: Each test can run independently without side effects
- Tests use **mocking**: External dependencies (fetch, localStorage) are mocked
- Tests follow **naming conventions**: Test names clearly describe what is being tested

---

## Total Test Count

- **Backend Tests**: 20 tests
- **Frontend Tests**: 18 tests
- **Total**: 38 authentication tests
