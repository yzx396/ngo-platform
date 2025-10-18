# Mentor-Mentee Matching Feature Plan

## Overview
This document outlines the implementation plan for adding a mentor-mentee matching feature to the NGO platform. The feature allows mentors to create profiles with their expertise and availability, while mentees can browse and search mentors to initiate mentorship requests. Matching is user-driven rather than algorithm-based.

## 1. Database Setup (Cloudflare D1)

### Configuration
- Add D1 database binding to `wrangler.json`
- Generate Cloudflare types with `npm run cf-typegen`

### Database Schema

#### `users` table
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX idx_users_email ON users(email);
```

#### `mentor_profiles` table
```sql
CREATE TABLE mentor_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  nick_name TEXT NOT NULL UNIQUE,
  bio TEXT NOT NULL,
  -- Bit flags for mentoring levels:
  -- 1 = entry (2^0), 2 = senior (2^1), 4 = staff (2^2), 8 = management (2^3)
  mentoring_levels INTEGER NOT NULL DEFAULT 0,
  availability TEXT, -- Free text description (e.g., "Weekdays 9am-5pm EST", "Flexible, contact me")
  hourly_rate INTEGER,
  -- Bit flags for payment types:
  -- 1 = venmo (2^0), 2 = paypal (2^1), 4 = zelle (2^2), 8 = alipay (2^3), 16 = wechat (2^4), 32 = crypto (2^5)
  payment_types INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  allow_reviews BOOLEAN NOT NULL DEFAULT 1,
  allow_recording BOOLEAN NOT NULL DEFAULT 1,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_mentor_user_id ON mentor_profiles(user_id);
CREATE INDEX idx_mentor_levels ON mentor_profiles(mentoring_levels);
CREATE INDEX idx_mentor_payment ON mentor_profiles(payment_types);
CREATE INDEX idx_mentor_hourly_rate ON mentor_profiles(hourly_rate);
```

**Bit Flag Enums:**
```typescript
// TypeScript enum mapping
enum MentoringLevel {
  Entry = 1,       // 0001
  Senior = 2,      // 0010
  Staff = 4,       // 0100
  Management = 8   // 1000
}

enum PaymentType {
  Venmo = 1,       // 000001
  Paypal = 2,      // 000010
  Zelle = 4,       // 000100
  Alipay = 8,      // 001000
  Wechat = 16,     // 010000
  Crypto = 32      // 100000
}

// Query examples:
// Find mentors with Senior level: WHERE mentoring_levels & 2 > 0
// Find mentors accepting Venmo: WHERE payment_types & 1 > 0
// Find mentors with Entry OR Senior: WHERE mentoring_levels & 3 > 0 (1 | 2 = 3)
```

#### `matches` table
```sql
CREATE TABLE matches (
  id TEXT PRIMARY KEY,
  mentor_id TEXT NOT NULL,
  mentee_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('pending', 'accepted', 'rejected', 'active', 'completed')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (mentor_id) REFERENCES mentor_profiles(user_id) ON DELETE CASCADE,
  FOREIGN KEY (mentee_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(mentor_id, mentee_id) -- Prevent duplicate match requests
);

CREATE INDEX idx_matches_mentor ON matches(mentor_id, status);
CREATE INDEX idx_matches_mentee ON matches(mentee_id, status);
```

## 2. shadcn/ui Component Library Setup

This project uses shadcn/ui for building accessible, customizable UI components. The registry `@shadcn` is already configured in `components.json`.

### Required Components

Install all necessary shadcn components at the start of frontend development:

```bash
# Core UI components
npx shadcn@latest add form button input textarea label
npx shadcn@latest add card badge avatar checkbox slider select
npx shadcn@latest add dialog tabs separator pagination skeleton
npx shadcn@latest add empty

# Additional dependencies for forms
npm install react-hook-form @hookform/resolvers zod sonner
```

### Component Architecture

shadcn components will be used throughout the application:
- **Form handling**: `Form` + React Hook Form + Zod for validation
- **Layout**: `Card`, `Separator` for structured content
- **Input**: `Input`, `Textarea`, `Checkbox`, `Slider`, `Select` for form fields
- **Feedback**: `Badge`, `Skeleton`, `Empty` for status and loading states
- **Navigation**: `Tabs`, `Pagination`, `Dialog` for content organization
- **Display**: `Avatar`, `Button`, `Label` for user interface elements

All custom components will be built on top of these shadcn primitives, ensuring consistent styling, accessibility (ARIA), and keyboard navigation out of the box.

## 3. Backend API (TDD - Write Tests First)

### User Management

#### `POST /api/v1/users`
- Create new user account
- Request: `{ email, name }`
- Response: `{ id, email, name, created_at }`

#### `GET /api/v1/users/:id`
- Get user details
- Response: `{ id, email, name, created_at }`

#### `PUT /api/v1/users/:id`
- Update user information
- Request: `{ name?, email? }`
- Response: `{ id, email, name, updated_at }`

### Mentor Profile Management

#### `POST /api/v1/mentors/profiles`
- Create mentor profile
- Request:
  ```json
  {
    "user_id": "uuid",
    "nick_name": "string",
    "bio": "string",
    "mentoring_levels": 3,  // Bit flags: 1=entry, 2=senior, 4=staff, 8=management
    "availability": "Weekdays 9am-5pm EST, flexible on weekends",
    "hourly_rate": 50,
    "payment_types": 5,  // Bit flags: 1=venmo, 2=paypal, 4=zelle, 8=alipay, 16=wechat, 32=crypto
    "allow_reviews": true,
    "allow_recording": true
  }
  ```
- Response: `{ id, user_id, nick_name, bio, ..., created_at }`

#### `GET /api/v1/mentors/profiles/:id`
- Get mentor profile by ID
- Response: `{ id, user_id, nick_name, bio, mentoring_levels, payment_types, ... }`

#### `PUT /api/v1/mentors/profiles/:id`
- Update mentor profile (only by profile owner)
- Request: Partial profile data
- Response: Updated profile with `updated_at`

#### `DELETE /api/v1/mentors/profiles/:id`
- Delete mentor profile (only by profile owner)
- Response: `{ success: true }`

### Search & Discovery

#### `GET /api/v1/mentors/search`
- Browse/search mentor profiles
- Query params:
  - `?mentoring_levels=3` - Bit flag filter (finds mentors with Entry OR Senior)
  - `?payment_types=1` - Bit flag filter (finds mentors accepting Venmo)
  - `?hourly_rate_max=100` - Maximum hourly rate
  - `?hourly_rate_min=0` - Minimum hourly rate
  - `?nick_name=john` - Search by nickname (partial match)
  - `?limit=20` - Results per page (default: 20)
  - `?offset=0` - Pagination offset
- Response:
  ```json
  {
    "mentors": [{
      "id": "uuid",
      "user_id": "uuid",
      "nick_name": "string",
      "bio": "string",
      "mentoring_levels": 3,
      "payment_types": 5,
      "hourly_rate": 50,
      "availability": "Weekdays 9am-5pm EST, flexible on weekends",
      "allow_reviews": true,
      "allow_recording": true
    }],
    "total": 100,
    "limit": 20,
    "offset": 0
  }
  ```
- Query logic uses bitwise AND:
  ```sql
  WHERE mentoring_levels & ? > 0
  AND payment_types & ? > 0
  AND hourly_rate <= ?
  ```

### Match Management (Mentee-Initiated)

#### `POST /api/v1/matches`
- Mentee requests mentorship (creates pending match)
- Request: `{ mentor_id: "uuid" }`
- Response: `{ id, mentor_id, mentee_id, status: "pending", created_at }`
- Validation:
  - Mentee cannot match with themselves
  - Cannot create duplicate matches (enforced by UNIQUE constraint)
  - Mentor profile must exist

#### `GET /api/v1/matches`
- List user's matches (as mentor or mentee)
- Query params:
  - `?status=pending` - Filter by status
  - `?role=mentor` - View matches where user is the mentor
  - `?role=mentee` - View matches where user is the mentee
- Response:
  ```json
  {
    "matches": [{
      "id": "uuid",
      "mentor_id": "uuid",
      "mentee_id": "uuid",
      "status": "pending",
      "mentor_profile": {...},
      "mentee_user": {...},
      "created_at": 1234567890,
      "updated_at": 1234567890
    }]
  }
  ```

#### `POST /api/v1/matches/:id/respond`
- Mentor accepts or rejects match request
- Request: `{ action: "accept" | "reject" }`
- Response: `{ id, status: "accepted", updated_at }`
- Authorization: Only the mentor can respond
- Status transitions:
  - `pending` → `accepted` or `rejected`
  - Once `accepted`, becomes `active`

#### `PATCH /api/v1/matches/:id/complete`
- Mark match as completed
- Request: `{}`
- Response: `{ id, status: "completed", updated_at }`
- Authorization: Either mentor or mentee can complete
- Status transition: `active` → `completed`

#### `DELETE /api/v1/matches/:id`
- Cancel/end match
- Response: `{ success: true }`
- Authorization: Either mentor or mentee can cancel
- Available in any status

## 4. Frontend Components (TDD)

### Core Pages

#### `MentorProfileSetup.tsx`
- Onboarding flow for mentors built with shadcn `Form` + React Hook Form + Zod
- Multi-step form with validation:
  1. **Basic Info**: nickname (`Input`), bio (`Textarea`)
  2. **Mentoring Levels**: checkbox group using `Checkbox` (converts to bit flags)
  3. **Payment & Rates**: hourly rate (`Input`), payment types (`Checkbox` group → bit flags)
  4. **Availability**: free text input using `Textarea`
  5. **Preferences**: allow reviews, allow recording (`Checkbox`)
- Form validation with Zod schema (required fields, nickname uniqueness)
- Progress indicator using custom stepper or `Separator`
- `Button` components for navigation (Next, Back, Submit)
- Save as draft functionality with toast notifications using `sonner`

#### `MentorProfileEdit.tsx`
- Edit existing mentor profile using shadcn `Form`
- Same form components as MentorProfileSetup (reusable form component)
- Unsaved changes warning using browser `beforeunload` or custom dialog
- Delete profile option with `AlertDialog` confirmation from shadcn
- Toast notifications for success/error states

#### `MentorBrowse.tsx`
- Main discovery page for mentees
- Grid/list view toggle using `Button` group
- Filter sidebar with shadcn components:
  - Mentoring levels: `Checkbox` group → combine into bit flag
  - Payment types: `Checkbox` group → combine into bit flag
  - Hourly rate range: `Slider` component (min/max)
  - Nickname search: `Input` with search icon
- Mentor cards (`Card` component) with preview info
- `Button` for "Request Mentorship" on each card
- `Pagination` component (20 per page)
- `Empty` component for no results state
- `Skeleton` loading states while fetching

#### `MentorDetails.tsx`
- Modal view using shadcn `Dialog` component
- Display all profile information in `Card` layout:
  - Nickname, bio
  - Mentoring levels (`Badge` components)
  - Hourly rate display
  - Payment types (icon badges)
  - Availability (formatted text display)
  - Reviews section (future enhancement)
- `Button` for "Request Mentorship" (disabled state if already matched)
- `DialogClose` for close/back navigation

#### `MatchesList.tsx`
- View user's matches with role-based views
- `Tabs` component for switching views and filtering
- **Mentee View**:
  - `Card` grid showing requested mentors
  - Status `Badge` components (pending, active, completed)
  - Tabs: Pending, Active, Completed
  - `Button` for cancel action with `AlertDialog` confirmation
- **Mentor View**:
  - `Card` list showing mentorship requests from mentees
  - Accept/Reject `Button` group for pending requests
  - Complete `Button` for active matches
- Sort by date using `Select` dropdown
- `Empty` component for each empty tab state
- `Skeleton` loading states

### Shared Components

#### `MentorCard.tsx`
- Built with shadcn `Card` component (`CardHeader`, `CardContent`, `CardFooter`)
- Display components:
  - `Avatar` with fallback initials
  - Nickname (heading), bio snippet (truncated text)
  - Mentoring level `Badge` components (first 2-3, styled variants)
  - Hourly rate `Badge` (outline variant)
  - Payment type icon badges (first 3)
- Action buttons:
  - "View Details" `Button` (variant: outline)
  - "Request Mentorship" `Button` (variant: default, context-dependent visibility)
- Hover effects and responsive layout

#### `MentoringLevelPicker.tsx`
- Built with shadcn `Checkbox` components within `FormField`
- Options: Entry, Senior, Staff, Management
- Each option is a `FormItem` with `Checkbox` + `Label`
- Converts selections to bit flags (1, 2, 4, 8) using bit manipulation helpers
- Visual indicators using Lucide icons or color-coded badges
- Required validation via Zod schema (at least one selected)
- Integrates with React Hook Form

#### `PaymentTypePicker.tsx`
- Built with shadcn `Checkbox` group within `FormField`
- Options: Venmo, Paypal, Zelle, Alipay, WeChat, Crypto
- Each option uses `Checkbox` + `Label` with payment icon
- Converts selections to bit flags (1, 2, 4, 8, 16, 32)
- Payment type icons from Lucide or custom SVG
- Optional field (no validation required)
- Integrates with React Hook Form

#### `AvailabilityInput.tsx`
- Built with shadcn `Textarea` component within `FormField`
- `Label` with descriptive text
- `FormDescription` with examples: "e.g., Weekdays 9am-5pm EST, Flexible on weekends"
- Optional character limit (200 characters) with counter display
- `FormMessage` for validation errors
- Used in profile setup/edit forms
- Integrates with React Hook Form

#### `AvailabilityDisplay.tsx`
- Simple text display component (no shadcn component needed)
- Renders availability string with preserved line breaks (`whitespace-pre-wrap`)
- Shows muted text "Not specified" if empty
- Used in MentorDetails and MentorCard views
- Styled with consistent typography

#### `StatusBadge.tsx`
- Built with shadcn `Badge` component using variants
- Color-coded status mapping:
  - Pending: `Badge` variant="warning" (yellow)
  - Accepted/Active: `Badge` variant="success" (green)
  - Rejected: `Badge` variant="destructive" (red)
  - Completed: `Badge` variant="secondary" (gray)
- Size variants: small (default) for cards, larger for detail views
- Includes status text and optional icon

### Navigation

#### Updates to `App.tsx`
- Add React Router
- Routes:
  - `/` - Home/Dashboard
  - `/mentors/browse` - Browse mentors (MentorBrowse)
  - `/mentors/:id` - Mentor details (MentorDetails)
  - `/mentor/profile/setup` - Create mentor profile (MentorProfileSetup)
  - `/mentor/profile/edit` - Edit mentor profile (MentorProfileEdit)
  - `/matches` - Matches list (MatchesList)
- Protected routes (require authentication)
- Navigation menu:
  - Browse Mentors (visible to all)
  - My Matches (visible to all)
  - My Mentor Profile (visible only to mentors)
- Active route highlighting

## 5. Type Definitions

### `src/types/user.ts`
```typescript
export interface User {
  id: string;
  email: string;
  name: string;
  created_at: number;
  updated_at: number;
}
```

### `src/types/mentor.ts`
```typescript
// Bit flag enums
export enum MentoringLevel {
  Entry = 1,       // 0001 (2^0)
  Senior = 2,      // 0010 (2^1)
  Staff = 4,       // 0100 (2^2)
  Management = 8   // 1000 (2^3)
}

export enum PaymentType {
  Venmo = 1,       // 000001 (2^0)
  Paypal = 2,      // 000010 (2^1)
  Zelle = 4,       // 000100 (2^2)
  Alipay = 8,      // 001000 (2^3)
  Wechat = 16,     // 010000 (2^4)
  Crypto = 32      // 100000 (2^5)
}

export interface MentorProfile {
  id: string;
  user_id: string;
  nick_name: string;
  bio: string;
  mentoring_levels: number; // Bit flags
  availability: string | null; // Free text description
  hourly_rate: number | null;
  payment_types: number; // Bit flags
  allow_reviews: boolean;
  allow_recording: boolean;
  created_at: number;
  updated_at: number;
}

// Helper functions for bit flag manipulation
export function hasLevel(levels: number, level: MentoringLevel): boolean {
  return (levels & level) !== 0;
}

export function addLevel(levels: number, level: MentoringLevel): number {
  return levels | level;
}

export function removeLevel(levels: number, level: MentoringLevel): number {
  return levels & ~level;
}

export function toggleLevel(levels: number, level: MentoringLevel): number {
  return levels ^ level;
}

export function getLevelNames(levels: number): string[] {
  const names: string[] = [];
  if (levels & MentoringLevel.Entry) names.push('Entry');
  if (levels & MentoringLevel.Senior) names.push('Senior');
  if (levels & MentoringLevel.Staff) names.push('Staff');
  if (levels & MentoringLevel.Management) names.push('Management');
  return names;
}

export function hasPaymentType(types: number, type: PaymentType): boolean {
  return (types & type) !== 0;
}

export function addPaymentType(types: number, type: PaymentType): number {
  return types | type;
}

export function removePaymentType(types: number, type: PaymentType): number {
  return types & ~type;
}

export function togglePaymentType(types: number, type: PaymentType): number {
  return types ^ type;
}

export function getPaymentTypeNames(types: number): string[] {
  const names: string[] = [];
  if (types & PaymentType.Venmo) names.push('Venmo');
  if (types & PaymentType.Paypal) names.push('Paypal');
  if (types & PaymentType.Zelle) names.push('Zelle');
  if (types & PaymentType.Alipay) names.push('Alipay');
  if (types & PaymentType.Wechat) names.push('WeChat');
  if (types & PaymentType.Crypto) names.push('Crypto');
  return names;
}

// Convert array of level names to bit flags
export function levelsFromNames(names: string[]): number {
  let levels = 0;
  for (const name of names) {
    switch (name.toLowerCase()) {
      case 'entry': levels |= MentoringLevel.Entry; break;
      case 'senior': levels |= MentoringLevel.Senior; break;
      case 'staff': levels |= MentoringLevel.Staff; break;
      case 'management': levels |= MentoringLevel.Management; break;
    }
  }
  return levels;
}

// Convert array of payment type names to bit flags
export function paymentTypesFromNames(names: string[]): number {
  let types = 0;
  for (const name of names) {
    switch (name.toLowerCase()) {
      case 'venmo': types |= PaymentType.Venmo; break;
      case 'paypal': types |= PaymentType.Paypal; break;
      case 'zelle': types |= PaymentType.Zelle; break;
      case 'alipay': types |= PaymentType.Alipay; break;
      case 'wechat': types |= PaymentType.Wechat; break;
      case 'crypto': types |= PaymentType.Crypto; break;
    }
  }
  return types;
}
```

### `src/types/match.ts`
```typescript
export interface Match {
  id: string;
  mentor_id: string;
  mentee_id: string;
  status: MatchStatus;
  created_at: number;
  updated_at: number;
}

export type MatchStatus = 'pending' | 'accepted' | 'rejected' | 'active' | 'completed';

// Extended match with profile/user data (for API responses)
export interface MatchWithDetails extends Match {
  mentor_profile: MentorProfile;
  mentee_user: User;
}
```

### `src/types/api.ts`
```typescript
// User API
export interface CreateUserRequest {
  email: string;
  name: string;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
}

// Mentor Profile API
export interface CreateMentorProfileRequest {
  user_id: string;
  nick_name: string;
  bio: string;
  mentoring_levels: number; // Bit flags
  availability?: string | null; // Free text description
  hourly_rate?: number | null;
  payment_types: number; // Bit flags
  allow_reviews?: boolean;
  allow_recording?: boolean;
}

export interface UpdateMentorProfileRequest {
  nick_name?: string;
  bio?: string;
  mentoring_levels?: number;
  availability?: string | null; // Free text description
  hourly_rate?: number | null;
  payment_types?: number;
  allow_reviews?: boolean;
  allow_recording?: boolean;
}

// Search API
export interface SearchMentorsRequest {
  mentoring_levels?: number; // Bit flags to filter
  payment_types?: number; // Bit flags to filter
  hourly_rate_max?: number;
  hourly_rate_min?: number;
  nick_name?: string;
  limit?: number;
  offset?: number;
}

export interface SearchMentorsResponse {
  mentors: MentorProfile[];
  total: number;
  limit: number;
  offset: number;
}

// Match API
export interface CreateMatchRequest {
  mentor_id: string;
}

export interface RespondToMatchRequest {
  action: 'accept' | 'reject';
}

export interface GetMatchesRequest {
  status?: MatchStatus;
  role?: 'mentor' | 'mentee';
}
```

## 6. Testing Strategy (TDD Approach)

### Backend Tests (`src/worker/__tests__/`)

#### Test Files
- `users.test.ts` - User CRUD operations
- `mentor-profiles.test.ts` - Mentor profile management (CRUD)
- `mentor-search.test.ts` - Search functionality with bit flag filters
- `matches.test.ts` - Match creation and management (mentee-initiated)
- `bit-flags.test.ts` - Bit flag helper functions

#### Test Coverage

**User Tests:**
- Create, read, update user (all endpoints under `/api/v1/users`)
- Email uniqueness validation
- Input validation (required fields)
- 404 for non-existent users

**Mentor Profile Tests:**
- Create mentor profile with bit flags
- Read profile by ID
- Update profile (partial updates)
- Delete profile
- Validation: nick_name uniqueness
- Validation: required fields (user_id, nick_name, bio)
- Validation: bit flags are non-negative integers
- Authorization: only profile owner can update/delete
- Foreign key constraint (user_id exists)

**Search Tests:**
- Search mentors with mentoring_levels filter (bit AND)
- Search mentors with payment_types filter (bit AND)
- Search mentors with hourly_rate_max/min
- Search by nick_name (partial match)
- Pagination (limit, offset)
- Empty results
- Multiple filters combined

**Match Tests:**
- Mentee creates match request (status: pending)
- Mentor accepts match (pending → accepted → active)
- Mentor rejects match (pending → rejected)
- Complete match (active → completed)
- Cancel/delete match
- Validation: cannot match with self
- Validation: cannot create duplicate matches (UNIQUE constraint)
- Validation: mentor profile must exist
- Authorization: only mentor can accept/reject
- Authorization: either party can complete/delete
- Get matches filtered by status and role

**Bit Flag Tests:**
- hasLevel, addLevel, removeLevel, toggleLevel
- hasPaymentType, addPaymentType, removePaymentType, togglePaymentType
- getLevelNames, getPaymentTypeNames
- levelsFromNames, paymentTypesFromNames
- Edge cases: 0, all flags set, invalid values

**Database:**
- Mock D1 database using Vitest mocks
- Test UNIQUE constraints
- Test foreign key cascades (DELETE user → DELETE mentor_profile)

### Frontend Tests (`src/react-app/__tests__/`)

#### Test Files
- `MentorProfileSetup.test.tsx` - Multi-step form
- `MentorProfileEdit.test.tsx` - Edit form with unsaved changes warning
- `MentorBrowse.test.tsx` - Browse page with filters
- `MentorDetails.test.tsx` - Profile detail view
- `MentorCard.test.tsx` - Profile card component
- `MatchesList.test.tsx` - Matches list with mentor/mentee views
- `MentoringLevelPicker.test.tsx` - Checkbox group with bit flags
- `PaymentTypePicker.test.tsx` - Checkbox group with bit flags
- `AvailabilityInput.test.tsx` - Free text availability input
- `AvailabilityDisplay.test.tsx` - Read-only availability display
- `StatusBadge.test.tsx` - Match status badge

#### Test Scenarios

**Form Components (shadcn Form + React Hook Form):**
- Form validation using Zod schemas (required fields, type checks)
- Multi-step navigation (next, back, submit buttons)
- Bit flag conversion (shadcn `Checkbox` selections → integer)
- Free text input (shadcn `Textarea` with character limit)
- Submit success/error handling with toast notifications
- Unsaved changes warning with `AlertDialog`
- Test form integration with `@testing-library/react` and `@testing-library/user-event`

**Browse & Search (shadcn UI components):**
- Filter changes trigger API call (debounced)
- `Checkbox` filters combine into bit flags correctly
- `Slider` component updates hourly rate range
- `Pagination` controls (next/prev, page numbers)
- `Empty` component display when no results
- `Skeleton` loading states during fetch

**Match Management (shadcn layouts):**
- Mentee view: `Card` grid showing requested mentors
- Mentor view: requests with Accept/Reject `Button` components
- Status filtering using `Tabs` component
- Accept/Reject/Complete/Cancel button actions
- Optimistic updates (immediate UI feedback)
- Error handling with toast notifications

**Bit Flag Components:**
- `Checkbox` check/uncheck updates bit flag value correctly
- Multiple selections combine correctly (bitwise OR operation)
- Visual state reflects bit flag value (checked state synced)
- Integration with React Hook Form `Controller`

**Accessibility (built into shadcn components):**
- ARIA labels on all interactive elements (buttons, checkboxes, inputs)
- Keyboard navigation (Tab, Enter, Space, Escape)
- Screen reader announcements (form errors, status changes)
- Focus management (dialog trapping, focus restoration)
- Form error announcements using `aria-live` regions

**API Mocking:**
- Mock API calls with MSW or Vitest mocks
- Test `Skeleton` loading states
- Test error states (400, 404, 500) with toast display

### Test Coverage Goals
- **100% coverage** for bit flag helper functions
- **100% coverage** for API handlers
- **>80% coverage** for UI components
- All critical paths tested (create profile, search, match request, accept/reject)

## 7. Implementation Order (Following TDD Red-Green-Refactor)

### Phase 0: Setup shadcn Components (Day 1)
1. Install all required shadcn components:
   ```bash
   npx shadcn@latest add form button input textarea label
   npx shadcn@latest add card badge avatar checkbox slider select
   npx shadcn@latest add dialog tabs separator pagination skeleton empty
   ```
2. Install form dependencies:
   ```bash
   npm install react-hook-form @hookform/resolvers zod sonner
   ```
3. Verify shadcn components render correctly (create test page)
4. Set up toast provider (`Toaster` from sonner) in `App.tsx`

### Phase 1: Database & Core APIs (Week 1)
1. **Write tests** for database schema validation
2. Set up D1 database in `wrangler.json`
3. Create migration files with bit flag tables
4. **Write tests** for bit flag helper functions
5. Implement bit flag helper functions (`src/types/mentor.ts`)
6. **Write tests** for user CRUD APIs
7. Implement user endpoints (`POST`, `GET`, `PUT /api/v1/users`)
8. **Write tests** for mentor profile APIs
9. Implement mentor profile endpoints (`POST`, `GET`, `PUT`, `DELETE /api/v1/mentors/profiles`)
10. Run tests, ensure all pass

### Phase 2: Search & Browse (Week 2)
1. **Write tests** for mentor search API with bit flag filters
2. Implement mentor search endpoint (`GET /api/v1/mentors/search`)
3. Test bit flag queries in D1 (bitwise AND operations)
4. **Write tests** for bit flag picker components (`MentoringLevelPicker`, `PaymentTypePicker`)
5. Build picker components using shadcn `Checkbox` + `FormField`
6. **Write tests** for `AvailabilityInput` component
7. Build `AvailabilityInput` using shadcn `Textarea`
8. **Write tests** for `MentorCard` component
9. Build `MentorCard` using shadcn `Card`, `Avatar`, `Badge`
10. **Write tests** for `MentorBrowse` page
11. Build `MentorBrowse` with shadcn filters, `Pagination`, `Skeleton`, `Empty`
12. **Write tests** for `MentorDetails` view
13. Build `MentorDetails` using shadcn `Dialog`
14. Run tests, ensure all pass

### Phase 3: Mentor Profiles & Match Management (Week 3)
1. **Write tests** for `MentorProfileSetup` component
2. Build `MentorProfileSetup` multi-step form with shadcn `Form` + React Hook Form
3. **Write tests** for `MentorProfileEdit` component
4. Build `MentorProfileEdit` with unsaved changes warning + `AlertDialog`
5. **Write tests** for match CRUD APIs
6. Implement match endpoints (`POST`, `GET /api/v1/matches`, `POST /api/v1/matches/:id/respond`, `PATCH /api/v1/matches/:id/complete`, `DELETE /api/v1/matches/:id`)
7. **Write tests** for `StatusBadge` component
8. Build `StatusBadge` using shadcn `Badge` variants
9. **Write tests** for `MatchesList` component
10. Build `MatchesList` with shadcn `Tabs`, `Card`, `Button`, `Empty`
11. **Write tests** for `AvailabilityDisplay` component
12. Build `AvailabilityDisplay` (simple text display)
13. Run tests, ensure all pass

### Phase 4: Integration, Polish & Deployment (Week 4)
1. Add React Router to `App.tsx`
2. Implement navigation menu
3. Set up protected routes
4. Integration testing across all features
5. Error handling improvements (toast notifications, error boundaries)
6. Loading states and skeleton screens
7. Empty states with helpful CTAs
8. Accessibility audit and fixes (ARIA, keyboard navigation)
9. Mobile responsive design (breakpoints, touch targets)
10. Performance optimization (code splitting, lazy loading)
11. Test in Cloudflare Workers local environment (`npm run dev`)
12. Deploy to Cloudflare (`npm run deploy`)
13. Documentation updates (README, API docs)

**Total Time Estimate: 4 weeks** (reduced from 5 weeks)

## 8. Additional Considerations

### Security & Validation
- Input validation on all endpoints (required fields, data types)
- SQL injection prevention (use parameterized queries with D1)
- Bit flag validation (must be non-negative integers, within valid range)
- Authorization checks:
  - Users can only modify their own profiles
  - Only mentors can accept/reject matches
  - Only the matched parties can complete/cancel matches
- Nick_name uniqueness validation (prevent conflicts)
- Rate limiting for search API (prevent abuse)
- CSRF protection (if using cookies for auth)

### Performance
- Database indexing (already in schema):
  - Index on `users.email`
  - Index on `mentor_profiles.user_id`
  - Index on `mentor_profiles.mentoring_levels` (for bit flag queries)
  - Index on `mentor_profiles.payment_types` (for bit flag queries)
  - Index on `mentor_profiles.hourly_rate` (for range queries)
  - Index on `matches.mentor_id` and `matches.mentee_id` with status
- Bit flag queries are extremely fast (integer bitwise operations)
- Pagination for search results (default: 20 per page)
- Debounce search inputs (300ms delay)
- Lazy load mentor details (fetch on demand)
- Code splitting for routes (React.lazy)

### User Experience
- Loading spinners for async operations (search, form submissions)
- Toast notifications for success/error (match created, profile updated)
- Unsaved changes warning (prompt before leaving edit form)
- Empty states with CTAs:
  - No search results: "Try adjusting your filters"
  - No matches yet: "Browse mentors to get started"
  - No mentor profile: "Create your mentor profile"
- Onboarding tooltips (explain bit flag pickers)
- Mobile-first responsive design (breakpoints: 640px, 768px, 1024px)
- Touch-friendly targets (min 44x44px)
- Optimistic updates for match actions

### Accessibility
- Semantic HTML (`<main>`, `<nav>`, `<section>`, `<article>`)
- ARIA labels on interactive elements (buttons, checkboxes, inputs)
- Keyboard navigation support:
  - Tab through form fields
  - Enter/Space to submit/check
  - Escape to close modals
- Focus management (trap focus in modals, restore after close)
- Screen reader announcements for:
  - Filter changes ("X mentors found")
  - Match status updates ("Match accepted")
  - Form errors
- Color contrast compliance (WCAG AA: 4.5:1 for normal text)
- Form error announcements (aria-live regions)
- Skip to main content link

### Monitoring & Analytics
- Track match success rates (accepted vs rejected)
- Monitor API response times (Cloudflare Analytics)
- Track user engagement:
  - Profile completeness (% of fields filled)
  - Active matches count
  - Search queries (popular filters)
  - Match request frequency
- Error logging (uncaught exceptions, API errors)
- User feedback collection (optional survey after match completion)

## 9. Estimated Scope

### Deliverables
- **Database:** 3 tables with migrations (`users`, `mentor_profiles`, `matches`)
- **Backend:** ~10 API endpoints with tests (users, mentor profiles, search, matches)
- **Frontend:** ~11 pages/components with tests
  - Pages: MentorProfileSetup, MentorProfileEdit, MentorBrowse, MentorDetails, MatchesList
  - Components: MentorCard, MentoringLevelPicker, PaymentTypePicker, AvailabilityInput, AvailabilityDisplay, StatusBadge
- **Tests:** ~16 test files (5 backend + 11 frontend)
- **Types:** 3 type definition files (`user.ts`, `mentor.ts`, `match.ts`, `api.ts`)

### Time Estimate
- **4 weeks** of development (following TDD)
- Reduced from original 5 weeks by removing automated matching system
- Assumes 1 developer working full-time

### Dependencies
- **Cloudflare D1** database (SQLite)
- **React Router DOM** (v7) for navigation
- **shadcn/ui** component library (already configured with `@shadcn` registry)
- **React Hook Form** for form state management
- **Zod** for schema validation
- **Sonner** for toast notifications
- **Lucide React** for icons (comes with shadcn)
- **Tailwind CSS** (v4) for styling (required by shadcn, already configured)

## 10. Future Enhancements

### Phase 2 Features (Post-MVP)
- **Messaging:** In-app messaging between matched mentors/mentees
- **Reviews & Ratings:** Allow mentees to review mentors after completed matches
- **Session Scheduling:** Calendar integration for booking mentorship sessions
- **Progress Tracking:** Set goals and track mentee progress over time
- **Mentor Availability Calendar:** Real-time availability updates
- **Notifications:** Email/push notifications for:
  - New match requests
  - Match accepted/rejected
  - Upcoming sessions
- **Profile Photos:** Image uploads for avatars (Cloudflare R2)
- **Match History:** View past completed mentorships
- **Certificates:** Generate certificates for completed mentorships
- **Admin Dashboard:** Platform management (approve profiles, moderate content)
- **Search Improvements:** Full-text search on bio, skills tags

### Technical Improvements
- **Real-time Updates:** WebSocket or Server-Sent Events for live notifications
- **AI Suggestions (Optional):** Recommend mentors based on browsing history
- **Advanced Filtering:** Combine bit flags with full-text search
- **Analytics Dashboard:** Visualize match success rates, user engagement
- **Multi-language Support:** i18n for international users
- **Dark Mode:** Theme switcher
- **Mobile App:** Native iOS/Android apps (React Native)

---

## Notes

This plan follows the TDD workflow specified in `CLAUDE.md`:
1. **Red:** Write failing tests first
2. **Green:** Implement minimal code to pass tests
3. **Refactor:** Improve code while keeping tests green

All features will be built with tests written BEFORE implementation, ensuring high quality and maintainability.

### Key Design Decisions

1. **shadcn/ui Component Library:**
   - **Accessibility-first**: All components built with ARIA labels, keyboard navigation, and screen reader support
   - **Customizable**: Components are copied into your project (not installed as dependencies), allowing full customization
   - **Type-safe**: Written in TypeScript with excellent type inference
   - **Modern stack**: Built on Radix UI primitives with Tailwind CSS styling
   - **Developer experience**: Integrates seamlessly with React Hook Form + Zod for robust form handling
   - **Consistency**: Provides design system primitives (Button, Card, Badge, etc.) ensuring visual consistency
   - **Performance**: Tree-shakeable, zero runtime cost for unused components
   - **Trade-off**: Requires Tailwind CSS, but this is already configured in the project

2. **Bit Flags Instead of JSON Arrays:**
   - Faster queries (integer bitwise operations vs JSON parsing)
   - Smaller storage footprint
   - Efficient indexing in SQLite
   - Trade-off: Less human-readable in database, but TypeScript helpers mitigate this

3. **Mentee-Initiated Matching:**
   - Simpler UX (no algorithm to explain)
   - User maintains full control over matching
   - Reduces complexity (no scoring, no suggestions)
   - Faster implementation (4 weeks vs 5 weeks)

4. **Unified User Table:**
   - Single `users` table for both mentors and mentees
   - Role determined by presence of `mentor_profile`
   - Allows users to be both mentor and mentee in future

5. **SQLite/D1 Compatibility:**
   - Uses INTEGER for bit flags (native SQLite type)
   - Uses TEXT for free text fields (availability description)
   - Bitwise operations supported in SQLite 3.x
   - Leverages Cloudflare D1's edge distribution

6. **Free Text Availability:**
   - Simple user experience (type naturally instead of complex calendar UI)
   - No parsing/validation complexity
   - Flexible format (users express availability their own way)
   - Reduces frontend complexity (no timezone handling, no calendar component)
   - Faster implementation
