# Mentor-Mentee Matching Feature Plan

## Overview
This document outlines the implementation plan for adding a mentor-mentee matching feature to the NGO platform. The feature will allow users to register as mentors or mentees, create profiles with their skills and interests, and get matched based on compatibility algorithms.

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
```

#### `mentor_profiles` table
```sql
CREATE TABLE mentor_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  nick_name TEXT NOT NULL UNIQUE,
  bio TEXT NOT NULL,
  mentoring_levels TEXT, -- JSON array ["entry", "senior", "staff", "management"]
  availability TEXT,
  hourly_rate INTEGER,
  payment_types TEXT, -- JSON array ["venmo", "paypal", "zelle", "alipay", "wechat", "crypto"]
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  allow_reviews BOOLEAN NOT NULL,
  allow_recording BOOLEAN NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

#### `matches` table
```sql
CREATE TABLE matches (
  id TEXT PRIMARY KEY,
  mentor_id TEXT NOT NULL,
  mentee_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('pending', 'accepted', 'rejected', 'active', 'completed')),
  match_score REAL, -- 0-100 compatibility score
  initiated_by TEXT, -- 'system', 'mentor', 'mentee'
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (mentor_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (mentee_id) REFERENCES users(id) ON DELETE CASCADE
);
```

## 2. Backend API (TDD - Write Tests First)

### User & Profile Management

#### `POST /api/users`
- Create new user account
- Request: `{ email, name, role }`
- Response: `{ id, email, name, role, created_at }`

#### `GET /api/users/:id`
- Get user details
- Response: `{ id, email, name, role, profile?, created_at }`

#### `PUT /api/users/:id`
- Update user information
- Request: `{ name?, role? }`
- Response: `{ id, email, name, role, updated_at }`

#### `POST /api/profiles`
- Create mentor/mentee profile
- Request: `{ user_id, bio, expertise?, interests?, availability, location?, experience_level, goals?, skills: [skill_id] }`
- Response: `{ id, user_id, ...profile_data, created_at }`

#### `GET /api/profiles/:id`
- Get profile details with skills
- Response: `{ id, user_id, ...profile_data, skills: [...] }`

#### `PUT /api/profiles/:id`
- Update profile
- Request: Partial profile data
- Response: Updated profile

#### `GET /api/skills`
- List all available skills
- Query params: `?category=tech`
- Response: `{ skills: [...] }`

#### `POST /api/skills`
- Create new skill (admin)
- Request: `{ name, category }`
- Response: `{ id, name, category }`

### Matching System

#### `POST /api/matches/suggest`
- Get suggested matches for current user
- Request: `{ limit?, min_score? }`
- Response: `{ suggestions: [{ user, profile, match_score, reasons: [...] }] }`
- Algorithm considers:
  - Skill/interest overlap
  - Availability compatibility
  - Experience level alignment
  - Location preferences
  - Mutual goals

#### `GET /api/matches`
- List user's current matches
- Query params: `?status=active&role=mentor`
- Response: `{ matches: [{ id, user, profile, status, match_score, created_at }] }`

#### `POST /api/matches`
- Create new match (user-initiated)
- Request: `{ target_user_id }`
- Response: `{ id, mentor_id, mentee_id, status, created_at }`

#### `POST /api/matches/:id/respond`
- Accept or reject match
- Request: `{ action: 'accept' | 'reject' }`
- Response: `{ id, status, updated_at }`

#### `DELETE /api/matches/:id`
- Remove/end match
- Response: `{ success: true }`

### Search & Discovery

#### `GET /api/mentors/search`
- Search mentors by criteria
- Query params: `?skills=react,nodejs&location=remote&experience_level=expert`
- Response: `{ mentors: [{ user, profile, available_skills }] }`

#### `GET /api/mentees/search`
- Search mentees (for mentors to find)
- Query params: `?interests=web-dev&experience_level=beginner`
- Response: `{ mentees: [{ user, profile, interest_areas }] }`

### Matching Algorithm Details

**Scoring Factors (0-100 total):**
- Skill overlap: 40 points
  - Count matching skills between mentor expertise and mentee interests
  - Weight by proficiency levels
- Availability compatibility: 20 points
  - Overlapping time slots
  - Timezone alignment
- Experience gap: 15 points
  - Optimal mentor 1-2 levels above mentee
- Location preference: 10 points
  - Same location or both remote
- Goals alignment: 15 points
  - Text similarity between goals/bio

**Minimum viable score:** 60/100 for suggestions

## 3. Frontend Components (TDD)

### Core Pages

#### `ProfileSetup.tsx`
- Onboarding flow for new users
- Role selection (mentor/mentee/both)
- Multi-step form
- Skills selection with autocomplete
- Availability picker
- Form validation

#### `ProfileEdit.tsx`
- Edit existing profile
- Same form components as ProfileSetup
- Unsaved changes warning

#### `MatchesList.tsx`
- View current matches (tabs: Pending, Active, Completed)
- Filter by status
- Sort by match score/date
- Quick actions (message, end match)

#### `MatchSuggestions.tsx`
- Browse AI-suggested matches
- Card-based layout with swipe actions
- Match score badge
- "Connect" / "Skip" buttons
- Reason display (why this match)

#### `SearchPage.tsx`
- Advanced search with filters
- Skills multi-select
- Location autocomplete
- Experience level slider
- Availability filter
- Results grid/list view

#### `MatchDetails.tsx`
- Detailed view of single match
- Full profile information
- Match score breakdown
- Communication history
- Actions (accept, reject, message)

### Shared Components

#### `ProfileCard.tsx`
- Compact user profile display
- Avatar, name, role badge
- Top 3 skills
- Match score (if applicable)
- Quick action buttons

#### `SkillSelector.tsx`
- Multi-select autocomplete
- Category grouping
- Proficiency level selector
- Add custom skills
- Max skills limit (e.g., 10)

#### `AvailabilityPicker.tsx`
- Weekly calendar grid
- Time slot selection
- Timezone selector
- Recurring patterns
- Visual representation

#### `MatchScoreBadge.tsx`
- Color-coded badge (green: >80, yellow: 60-80, gray: <60)
- Tooltip with score breakdown
- Animated number

### Navigation

#### Updates to `App.tsx`
- Add React Router
- Routes:
  - `/` - Home/Dashboard
  - `/profile/setup` - Profile creation
  - `/profile/edit` - Edit profile
  - `/matches` - Matches list
  - `/matches/:id` - Match details
  - `/suggestions` - Match suggestions
  - `/search` - Search page
- Protected routes (require authentication)
- Navigation menu with active states

## 4. Type Definitions

### `src/types/user.ts`
```typescript
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'mentor' | 'mentee' | 'both';
  created_at: number;
  updated_at: number;
}

export interface Profile {
  id: string;
  user_id: string;
  bio?: string;
  expertise?: string[]; // for mentors
  interests?: string[]; // for mentees
  availability: AvailabilitySlots;
  location?: string;
  experience_level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  goals?: string;
  created_at: number;
  updated_at: number;
}

export interface AvailabilitySlots {
  timezone: string;
  slots: {
    [day: string]: { start: string; end: string }[]; // e.g., { monday: [{start: "09:00", end: "17:00"}] }
  };
}
```

### `src/types/match.ts`
```typescript
export interface Match {
  id: string;
  mentor_id: string;
  mentee_id: string;
  status: MatchStatus;
  match_score?: number;
  initiated_by: 'system' | 'mentor' | 'mentee';
  created_at: number;
  updated_at: number;
}

export type MatchStatus = 'pending' | 'accepted' | 'rejected' | 'active' | 'completed';

export interface MatchSuggestion {
  user: User;
  profile: Profile;
  match_score: number;
  reasons: MatchReason[];
}

export interface MatchReason {
  factor: string;
  description: string;
  score: number;
}
```

### `src/types/skill.ts`
```typescript
export interface Skill {
  id: string;
  name: string;
  category: string;
  created_at: number;
}

export interface ProfileSkill {
  id: string;
  profile_id: string;
  skill_id: string;
  proficiency_level?: number; // 1-5
  skill?: Skill; // Joined data
  created_at: number;
}
```

### `src/types/api.ts`
```typescript
// API Request/Response types
export interface CreateUserRequest {
  email: string;
  name: string;
  role: 'mentor' | 'mentee' | 'both';
}

export interface CreateProfileRequest {
  user_id: string;
  bio?: string;
  expertise?: string[];
  interests?: string[];
  availability: AvailabilitySlots;
  location?: string;
  experience_level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  goals?: string;
  skills: string[]; // skill IDs
}

export interface SearchMentorsRequest {
  skills?: string[];
  location?: string;
  experience_level?: string;
  availability?: AvailabilitySlots;
}

// ... more API types
```

## 5. Testing Strategy (TDD Approach)

### Backend Tests (`src/worker/__tests__/`)

#### Test Files
- `users.test.ts` - User CRUD operations
- `profiles.test.ts` - Profile management
- `skills.test.ts` - Skills API
- `matches.test.ts` - Match creation and management
- `matching-algorithm.test.ts` - Algorithm logic
- `search.test.ts` - Search functionality

#### Test Coverage
- Success cases for all endpoints
- Validation errors (400)
- Not found errors (404)
- Authorization checks
- Database constraints
- Edge cases (empty results, duplicates)
- Mock D1 database using Vitest mocks

### Frontend Tests (`src/react-app/__tests__/`)

#### Test Files
- `ProfileSetup.test.tsx`
- `ProfileEdit.test.tsx`
- `MatchesList.test.tsx`
- `MatchSuggestions.test.tsx`
- `SearchPage.test.tsx`
- `MatchDetails.test.tsx`
- `ProfileCard.test.tsx`
- `SkillSelector.test.tsx`
- `AvailabilityPicker.test.tsx`
- `MatchScoreBadge.test.tsx`

#### Test Scenarios
- Form validation and submission
- User interactions (clicks, inputs)
- Error handling and display
- Loading states
- Empty states
- Accessibility (ARIA, keyboard navigation)
- Mock API calls with MSW or Vitest mocks

### Test Coverage Goals
- **100% coverage** for matching algorithm
- **100% coverage** for API handlers
- **>80% coverage** for UI components
- All critical paths tested

## 6. Implementation Order (Following TDD Red-Green-Refactor)

### Phase 1: Database & Basic Profiles (Week 1)
1. **Write tests** for database schema validation
2. Set up D1 database in `wrangler.json`
3. Create migration files
4. **Write tests** for user CRUD APIs
5. Implement user endpoints
6. **Write tests** for profile APIs
7. Implement profile endpoints
8. **Write tests** for skills APIs
9. Implement skills endpoints
10. **Write tests** for profile UI components
11. Build ProfileSetup and ProfileEdit pages
12. Build SkillSelector component

### Phase 2: Matching Algorithm (Week 2)
1. **Write tests** for matching algorithm
   - Test skill overlap calculation
   - Test availability matching
   - Test experience gap scoring
   - Test location matching
   - Test goals alignment
2. Implement matching algorithm core logic
3. **Write tests** for match suggestion API
4. Implement `/api/matches/suggest` endpoint
5. **Write tests** for MatchSuggestions UI
6. Build MatchSuggestions page
7. Build MatchScoreBadge component

### Phase 3: Match Management (Week 3)
1. **Write tests** for match CRUD APIs
2. Implement match creation/response/deletion endpoints
3. **Write tests** for MatchesList UI
4. Build MatchesList page
5. **Write tests** for MatchDetails UI
6. Build MatchDetails page
7. Build ProfileCard component

### Phase 4: Search & Discovery (Week 4)
1. **Write tests** for search functionality
2. Implement search endpoints (mentors/mentees)
3. **Write tests** for SearchPage UI
4. Build SearchPage with filters
5. Build AvailabilityPicker component
6. Integration testing across all features

### Phase 5: Polish & Refinement (Week 5)
1. Error handling improvements
2. Loading states and skeletons
3. Empty states with helpful messages
4. Accessibility audit and fixes
5. Mobile responsive design
6. Performance optimization
7. Documentation updates

## 7. Additional Considerations

### Security & Validation
- Input validation on all endpoints
- SQL injection prevention (use parameterized queries)
- Rate limiting for match suggestions (prevent abuse)
- CSRF protection
- User can only modify their own profiles

### Performance
- Database indexing:
  - Index on `users.email`
  - Index on `profiles.user_id`
  - Index on `matches.mentor_id` and `matches.mentee_id`
  - Index on `profile_skills.profile_id` and `profile_skills.skill_id`
- Caching for skills list (rarely changes)
- Pagination for search results (limit: 20 per page)
- Debounce search inputs

### User Experience
- Loading spinners for async operations
- Toast notifications for success/error
- Unsaved changes warning
- Empty states with CTAs
- Onboarding tooltips
- Mobile-first responsive design
- Dark mode support (future)

### Accessibility
- Semantic HTML (main, nav, section, article)
- ARIA labels on interactive elements
- Keyboard navigation support
- Focus management (modals, forms)
- Screen reader announcements for dynamic content
- Color contrast compliance (WCAG AA)
- Form error announcements

### Monitoring & Analytics
- Track match success rates
- Monitor API response times
- Log algorithm performance
- Track user engagement (profile completeness, active matches)

## 8. Estimated Scope

### Deliverables
- **Database:** 5 tables with migrations
- **Backend:** ~15 API endpoints with tests
- **Frontend:** ~10 pages/components with tests
- **Tests:** ~20 test files
- **Types:** ~4 type definition files

### Time Estimate
- **5 weeks** of development (following TDD)
- 1 week per phase
- Assumes 1 developer working full-time

### Dependencies
- Cloudflare D1 database
- React Router for navigation
- Date/time library (e.g., date-fns) for availability
- CSS framework (optional: Tailwind CSS)

## 9. Future Enhancements

### Phase 2 Features (Post-MVP)
- In-app messaging between matches
- Video call integration
- Session scheduling and calendar sync
- Progress tracking and goals
- Reviews and ratings
- Mentor availability calendar
- Email notifications for matches
- AI-powered conversation starters
- Match history and analytics
- Certificate generation for completed mentorships
- Community features (groups, events)
- Admin dashboard for platform management

### Technical Improvements
- WebSocket for real-time updates
- Image uploads for avatars
- Advanced search with Elasticsearch
- Machine learning for improved matching
- A/B testing framework for algorithm tuning

---

## Notes

This plan follows the TDD workflow specified in `CLAUDE.md`:
1. **Red:** Write failing tests first
2. **Green:** Implement minimal code to pass tests
3. **Refactor:** Improve code while keeping tests green

All features will be built with tests written BEFORE implementation, ensuring high quality and maintainability.
