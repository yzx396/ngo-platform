# Feature Roadmap & TODO

Complete inventory of all platform features, organized by status with unique IDs for tracking and implementation prioritization.

---

## 📋 Status Legend

- ✅ **Implemented** - Feature is fully working in production
- 🟡 **Incomplete** - Feature partially built, needs completion
- 🎯 **Proposed** - Ready to build (recommended for demo)
- 🔮 **Future** - On the roadmap for later

---

## ✅ IMPLEMENTED FEATURES (F-001 to F-009)

### F-001: Google OAuth Authentication & JWT
**Status:** ✅ Implemented
**Priority:** Critical | **Effort:** - | **Impact:** High
**Description:**
- Google OAuth 2.0 login/logout flow
- JWT token-based stateless authentication
- Token stored in localStorage, auto-attached to API requests
- 7-day token expiration
- Protected routes requiring authentication

**Database Tables:** `users`, `user_roles`
**API Endpoints:** `/api/v1/auth/*` (login, callback, me, logout)
**Frontend Pages:** `/login`, `/oauth-callback`
**Dependencies:** None

---

### F-002: User Profile Management
**Status:** ✅ Implemented
**Priority:** Critical | **Effort:** - | **Impact:** High
**Description:**
- User profile creation on first login
- Edit user name and email
- CV upload/download/delete functionality (mandatory for mentorship requests)
- User role assignment (Admin/Member)
- View other user profiles

**Database Tables:** `users` (with cv_url, cv_filename, cv_size columns)
**API Endpoints:**
- `GET/PUT /api/v1/users/:id` - Get/update profile
- `POST/GET/DELETE /api/v1/users/:userId/cv` - CV management
- `POST /api/v1/roles` - Assign user role
- `GET /api/v1/users/:id/role` - Get user role

**Frontend Pages:** `/profile`, `/profile/edit`
**Components:** CV upload, Profile form
**Dependencies:** F-001 (Auth)

---

### F-003: Mentor-Mentee Matching System
**Status:** ✅ Implemented
**Priority:** Critical | **Effort:** - | **Impact:** Very High
**Description:**
- Create mentor profiles with hourly rate, bio, mentoring levels, payment methods, expertise domains/topics
- Advanced mentor search with 6+ filters (levels, payment, expertise, rate range, name, availability)
- Browse mentors with pagination
- LinkedIn profile integration (optional)
- Mentee sends match requests with CV attachment
- Match workflow: `pending` → `accepted` → `active` → `completed`
- Accept/reject/complete match requests
- Cancel pending matches

**Database Tables:** `mentor_profiles`, `matches`
**Bit Flags Used:**
- `MentoringLevel` (Entry, Senior, Staff, Management)
- `PaymentType` (Venmo, PayPal, Zelle, Alipay, WeChat, Crypto)
- `ExpertiseDomain` (TechnicalDevelopment, ProductAndProject, ManagementAndStrategy, CareerDevelopment)

**API Endpoints:**
- `POST/GET/PUT/DELETE /api/v1/mentors/profiles/*` - Profile CRUD
- `GET /api/v1/mentors/search` - Advanced search
- `POST/GET/PATCH/DELETE /api/v1/matches*` - Match management
- `GET /api/v1/matches/check/:mentorId` - Check existing match

**Frontend Pages:**
- `/mentors/browse` - Mentor search and browse
- `/mentors/:id` - Mentor detail view
- `/mentor/profile/setup` - Create/edit mentor profile
- `/matches` - Manage match requests

**Components:** Mentor cards, Search filters, Match dialog
**Dependencies:** F-001 (Auth), F-002 (Profile)

---

### F-004: Community Feed & Posts
**Status:** ✅ Implemented
**Priority:** High | **Effort:** - | **Impact:** High
**Description:**
- Create/edit/delete posts with types: announcement, discussion, general
- Like/unlike posts
- Threaded comments with nested replies (parent_comment_id support)
- Real-time like and comment counts
- Post pagination
- Filter posts by type
- Rich text editor support

**Database Tables:** `posts`, `post_likes`, `post_comments`
**API Endpoints:**
- `GET/POST/PUT/DELETE /api/v1/posts` - Post CRUD
- `POST/DELETE /api/v1/posts/:id/like` - Like management
- `GET/POST /api/v1/posts/:id/comments` - Comments (paginated)
- `DELETE /api/v1/comments/:id` - Delete comment

**Frontend Pages:**
- `/feed` - Main community feed
- `/posts/:id` - Post detail with comment thread

**Components:** Post form, Comment thread display, Rich text editor
**Dependencies:** F-001 (Auth)

---

### F-005: Blog System
**Status:** ✅ Implemented
**Priority:** High | **Effort:** - | **Impact:** High
**Description:**
- Create/edit/delete blog posts
- Admin can feature/unfeature blogs (gives 50 bonus points)
- Like/unlike blog posts
- Threaded comments with replies
- Pagination and browsing
- "My Blogs" management page for content creators
- Optional authentication requirement per blog
- Rich text editor for content

**Database Tables:** `blogs`, `blog_likes`, `blog_comments`
**API Endpoints:**
- `GET/POST/PUT/DELETE /api/v1/blogs` - Blog CRUD
- `POST/DELETE /api/v1/blogs/:id/like` - Like management
- `GET/POST /api/v1/blogs/:id/comments` - Comments
- `PATCH /api/v1/blogs/:id/feature` - Admin feature toggle
- `DELETE /api/v1/blog-comments/:id` - Delete comment

**Frontend Pages:**
- `/blogs` - Browse all blogs
- `/blogs/:id` - Blog detail view
- `/blogs/create` - Create new blog
- `/blogs/:id/edit` - Edit existing blog
- `/my-blogs` - Manage own blogs

**Components:** Blog form, Blog card, Comment thread
**Dependencies:** F-001 (Auth)

---

### F-006: Points & Gamification System
**Status:** ✅ Implemented
**Priority:** High | **Effort:** - | **Impact:** Very High
**Description:**
- Automatic point awards for user actions
- Sophisticated diminishing returns system (rolling 1-hour window prevents spam)
- Point actions logged for transparency
- Admin can manually adjust points
- Leaderboard with SQL window function ranking
- Point badges with color coding
- Silent failure mode (point errors don't break actions)

**Point Values:**
- Discussion post: 15 pts | General post: 10 pts | Blog post: 10 pts
- Comment: 5 pts | Like received: 2 pts | Comment received: 3 pts
- Blog featured: 50 bonus pts

**Diminishing Returns (per hour):**
- Posts: 3× full, 2× half (50%)
- Blogs: 2× full, 2× half (50%)
- Comments: 10× full, 10× reduced (40%)
- Likes received: 5× full, 10× half (50%)

**Database Tables:** `user_points`, `point_actions_log`
**API Endpoints:**
- `GET /api/v1/users/:id/points` - Get user points (public)
- `PATCH /api/v1/users/:id/points` - Adjust points (admin only)
- `GET /api/v1/leaderboard` - Get rankings (paginated)

**Frontend Pages:** `/leaderboard` - User rankings with badges
**Components:** Points badge, Leaderboard table
**Dependencies:** F-004 (Feed), F-005 (Blogs)

---

### F-007: Events System
**Status:** ✅ Implemented (Static Data Only)
**Priority:** Medium | **Effort:** - | **Impact:** Medium
**Description:**
- Display upcoming and past events
- Event data from Luma (currently hardcoded in TypeScript)
- Event cards with cover images
- Location, availability, hosts information
- External links to Luma event pages
- Responsive grid layout

**Data Source:** `/src/react-app/data/events.ts` (static, not database-backed)
**Frontend Pages:** `/events` - Browse events
**Components:** Event card grid
**Dependencies:** None

**Note:** Currently static - see F-025 (Event Management Backend) for dynamic events

---

### F-008: Admin Features & Feature Flags
**Status:** ✅ Implemented
**Priority:** High | **Effort:** - | **Impact:** High
**Description:**
- User management dashboard (list, view, assign roles)
- Feature flag system for dynamic feature toggles
- Blog featuring/unfeaturing with point awards
- Manual point adjustments
- Admin-only routes and API endpoints with authorization checks
- Seeded feature flags: mentor_search, match_requests, points_system, leaderboard, linkedin_profiles, public_registration, challenges, blogs

**Database Tables:** `feature_flags`
**API Endpoints:**
- `GET/POST /api/v1/admin/features` - Feature flag management
- `PATCH/DELETE /api/v1/admin/features/:id` - Toggle/delete flags
- `GET /api/v1/features/enabled` - Get enabled features (public)

**Frontend Pages:**
- `/admin/users` - User management
- `/admin/features` - Feature toggle management

**Components:** User table, Feature flag toggle
**Dependencies:** F-001 (Auth), F-002 (Roles)

---

### F-009: Internationalization (i18n)
**Status:** ✅ Implemented
**Priority:** Medium | **Effort:** - | **Impact:** High
**Description:**
- Multi-language support (English, Simplified Chinese)
- Language switcher component in navbar
- Browser locale detection (defaults to user's preference)
- Persistent language preference in localStorage
- Translations for all UI text
- Uses react-i18next framework

**Translation Keys:** Organized in `/src/react-app/locales/` by feature/page
**Supported Languages:** `en`, `zh`
**UI Components:** Language switcher dropdown
**Dependencies:** None

---

## 🟡 INCOMPLETE FEATURES (F-010 to F-012)

### F-010: Challenges System
**Status:** 🟡 Incomplete
**Priority:** High | **Effort:** - | **Impact:** High
**Description:**
- Feature flag exists (`challenges` - currently disabled)
- Mentioned in CLAUDE.md and sidebar navigation
- TODO comment in App.tsx for `/challenges` route
- No database schema, API endpoints, pages, or components implemented
- Ready to be built from scratch

**Planning Notes:** Recommended as primary demo feature - see F-020
**Dependencies:** F-006 (Points system)

---

### F-011: Homepage
**Status:** 🟡 Incomplete
**Priority:** Low | **Effort:** - | **Impact:** Medium
**Description:**
- Minimal basic welcome page exists
- Shows static content (community intro, features grid)
- No dynamic content or personalization
- Root path (/) redirects to `/feed` instead
- Not polished for first impression

**Current Pages:** `/` (HomePage.tsx)
**Dependencies:** None

**Note:** Consider replacing with F-023 (User Dashboard) for better first impression

---

### F-012: About Page
**Status:** 🟡 Incomplete
**Priority:** Low | **Effort:** - | **Impact:** Low
**Description:**
- Basic about page with static content
- Shows platform introduction
- Displays founder cards
- No dynamic content fetching
- Minimal styling/engagement

**Current Pages:** `/about` (AboutPage.tsx)
**Dependencies:** None

---

## 🎯 PROPOSED FEATURES (F-020 to F-024)

### F-020: Challenges System (PRIMARY DEMO RECOMMENDATION)
**Status:** 🎯 Proposed
**Priority:** High | **Effort:** 4-6 hours | **Impact:** Very High
**Demo Appeal:** ⭐⭐⭐⭐⭐
**Estimated Complexity:** Medium

**Description:**
Admin-created challenges that drive user engagement and point awards:
- Admin creates challenges (title, description, requirements, point reward, deadline)
- Users browse available challenges and join
- Users submit evidence (text/link/screenshot) when completed
- Admin reviews and approves/rejects submissions
- Points automatically awarded on approval
- Challenge completion badges displayed on user profile
- Leaderboard integration (track challenge completions)
- Challenge "seasons" (active/completed challenges)

**Why for Demo:**
- ✨ High visibility (already mentioned in sidebar and docs - users expect it)
- 🎮 Completes gamification story (points → leaderboard → challenges → badges)
- 🎯 Unique differentiator for NGO community building
- 📊 Very visual and interactive
- ♻️ Reuses existing patterns (posts/comments architecture)
- ⚡ Shows full-stack skills (database → API → React UI)

**Database Tables to Create:**
- `challenges` (id, title, description, created_by_user_id, point_reward, deadline, status)
- `challenge_submissions` (id, user_id, challenge_id, submission_text, status, submitted_at, reviewed_at)
- `challenge_completions` (id, user_id, challenge_id, completed_at)

**API Endpoints to Build:**
- `GET /api/v1/challenges` - List challenges (active/completed filter)
- `POST /api/v1/challenges` - Create challenge (admin only)
- `GET /api/v1/challenges/:id` - Get challenge detail
- `PUT /api/v1/challenges/:id` - Update challenge (admin only)
- `DELETE /api/v1/challenges/:id` - Delete challenge (admin only)
- `POST /api/v1/challenges/:id/join` - User joins challenge
- `POST /api/v1/challenges/:id/submit` - Submit completion evidence
- `GET /api/v1/challenges/:id/submissions` - List submissions (admin only)
- `POST /api/v1/submissions/:id/approve` - Admin approves (awards points)
- `POST /api/v1/submissions/:id/reject` - Admin rejects

**Frontend Pages/Components to Build:**
- `/challenges` - Browse active challenges
- `/challenges/:id` - Challenge detail and submission form
- `/challenges/:id/admin` - Admin submission review (admin only)
- Challenge card component
- Submission form component
- Challenge badge component (display on profiles)

**Dependencies:** F-006 (Points system), F-008 (Admin features)
**Testing Approach:** TDD with both worker tests (API) and react tests (UI)

**Demo Script:**
1. Show challenges list (admin creates one live)
2. User browses challenges, joins one
3. User submits completion evidence
4. Switch to admin view, review submission, approve
5. Points automatically awarded, visible on user profile
6. Show challenge badge on profile
7. Show leaderboard updated with challenge stat

---

### F-021: Notification System
**Status:** 🎯 Proposed
**Priority:** High | **Effort:** 3-5 hours | **Impact:** High
**Demo Appeal:** ⭐⭐⭐⭐
**Estimated Complexity:** Medium

**Description:**
In-app notification system to keep users informed without leaving the platform:
- Notify on: match accepted/rejected, new comment on your post/blog, new like, admin featured your blog, challenge approved
- In-app notification bell icon with unread badge count
- Dropdown notification panel (newest first)
- Mark individual notifications as read/unread
- Notification history page with filters
- Optional email notifications via Cloudflare Email Workers

**Why for Demo:**
- 🔔 Immediate user value (no more missed updates)
- ⏰ Real-time feel (shows modern web platform)
- 🎯 Cross-cutting (enhances all existing features)
- 💎 Visual polish (bell icon + animations)
- 📱 Mobile-friendly pattern

**Database Tables to Create:**
- `notifications` (id, user_id, type, reference_id, reference_type, read_at, created_at)

**API Endpoints to Build:**
- `GET /api/v1/users/:userId/notifications` - List notifications (paginated)
- `PATCH /api/v1/notifications/:id/read` - Mark as read
- `DELETE /api/v1/notifications/:id` - Dismiss notification

**Frontend Components to Build:**
- Notification bell icon (navbar)
- Notification dropdown panel
- Notification item component
- Notification history page

**Dependencies:** F-003 (Matches), F-004 (Feed), F-005 (Blogs), F-020 (Challenges)

---

### F-022: Global Search
**Status:** 🎯 Proposed
**Priority:** High | **Effort:** 4-5 hours | **Impact:** High
**Demo Appeal:** ⭐⭐⭐⭐
**Estimated Complexity:** Medium-High

**Description:**
Unified search across all platform content:
- Search mentors, posts, blogs, users with single query
- Filter by content type
- Type-ahead suggestions (as user types)
- Highlight matching text in results
- Recent searches history
- Search analytics dashboard (admin: see popular searches)
- Ranked results by relevance

**Why for Demo:**
- 🔍 Discovery superpower (find anything instantly)
- ⚡ Shows technical skills (full-text search, ranking algorithms)
- 📱 Mobile-friendly (search-first interface)
- 🎯 Practical feature (users immediately benefit)
- 📊 Analytics value for product decisions

**Database Indexes to Add:**
- Full-text search index on posts, blogs, mentor_profiles, users

**API Endpoints to Build:**
- `GET /api/v1/search` - Global search with type filter
- `GET /api/v1/search/suggestions` - Type-ahead suggestions
- `GET /api/v1/admin/search-analytics` - Admin analytics (admin only)

**Frontend Components to Build:**
- Search bar component (navbar)
- Search results page
- Result type indicator
- Search analytics dashboard

**Dependencies:** F-003 (Mentors), F-004 (Posts), F-005 (Blogs)

---

### F-023: User Dashboard (Personalized Home)
**Status:** 🎯 Proposed
**Priority:** Medium | **Effort:** 5-7 hours | **Impact:** Very High
**Demo Appeal:** ⭐⭐⭐⭐⭐
**Estimated Complexity:** Medium

**Description:**
Personalized home page replacing basic homepage (Netflix/LinkedIn style):
- Widget: Active mentorships and pending match requests
- Widget: Your points, rank, recent point awards
- Widget: Recent activity feed (your posts, comments, likes)
- Widget: Recommended mentors based on your profile
- Widget: Upcoming events you're interested in
- Widget: Quick actions (create post, find mentor, join challenge)
- Widget: Activity graph (posts/comments over time)
- Widget: Recent blogs you might like
- Customizable widget layout (drag-to-reorder)

**Why for Demo:**
- 🎨 Modern platform feel (shows product design sophistication)
- 📊 Data visualization (activity charts, stats)
- 🎯 Shows breadth (all features aggregated in one view)
- 👑 Executive-friendly (shows health of platform at a glance)
- 💫 Strong first impression

**Database Queries to Optimize:**
- Active mentorships count
- Recent activity aggregation
- Recommendation query (mentor search)
- Event matching

**Frontend Pages/Components to Build:**
- `/dashboard` - Main dashboard page (replace `/`)
- Dashboard widget components (reusable)
- Activity graph component (Chart.js or Recharts)
- Recommended mentors section

**Dependencies:** F-002 (User profile), F-003 (Matches), F-006 (Points), F-004 (Posts), F-005 (Blogs)

---

### F-024: Direct Messaging (1-on-1 Chat)
**Status:** 🎯 Proposed
**Priority:** High | **Effort:** 6-8 hours | **Impact:** Very High
**Demo Appeal:** ⭐⭐⭐⭐⭐
**Estimated Complexity:** High

**Description:**
Private messaging between matched users (or any two users):
- Send/receive messages in real-time (or polling)
- Message threads (conversation view)
- Unread message indicators
- Message notifications (integrates with F-021)
- Typing indicators (optional advanced feature)
- Read receipts (optional advanced feature)
- Message history searchable
- Delete/edit messages (optional)

**Why for Demo:**
- 💬 High user demand (mentors/mentees need to communicate)
- ⚡ Real-time magic (WebSocket feel or smart polling)
- 🔒 Privacy (keeps conversations on-platform)
- 📈 Engagement metric (active conversations = healthy platform)
- 💎 Premium feature feel

**Technical Challenge:**
- Requires real-time technology (Cloudflare Durable Objects or polling strategy)
- Database design for efficient message retrieval
- Scalability considerations

**Database Tables to Create:**
- `conversations` (id, participant1_id, participant2_id, created_at, updated_at)
- `messages` (id, conversation_id, sender_id, content, created_at, read_at)

**API Endpoints to Build:**
- `GET /api/v1/conversations` - List user's conversations
- `GET /api/v1/conversations/:id` - Get conversation with messages (paginated)
- `POST /api/v1/conversations` - Create/open conversation
- `POST /api/v1/messages` - Send message
- `PATCH /api/v1/messages/:id` - Edit message (optional)
- `DELETE /api/v1/messages/:id` - Delete message (optional)
- WebSocket endpoint (optional) for real-time

**Frontend Pages/Components to Build:**
- `/messages` - Conversations list
- `/messages/:conversationId` - Chat view
- Message bubble component
- Unread indicators
- Typing indicator (optional)

**Dependencies:** F-001 (Auth), F-003 (Matches)
**Real-time Strategy:** Start with polling (simpler), upgrade to Durable Objects if time permits

---

## 🔮 FUTURE FEATURES (F-030+)

### F-030: User Following & Connections
**Status:** 🔮 Future
**Priority:** Medium | **Effort:** 3-4 hours | **Impact:** Medium
**Description:**
- Follow/unfollow users
- View follower/following lists
- Feed personalization based on followed users
- Network statistics on profiles

---

### F-031: File Attachments on Posts
**Status:** 🔮 Future
**Priority:** Medium | **Effort:** 2-3 hours | **Impact:** Medium
**Description:**
- Upload images/files with posts
- Image gallery in posts
- File preview and download
- Storage in Cloudflare R2 (or similar)

---

### F-032: Analytics Dashboard
**Status:** 🔮 Future
**Priority:** Low | **Effort:** 6-8 hours | **Impact:** Medium
**Description:**
- User growth metrics
- Engagement metrics (posts, comments, likes)
- Match success rate
- Most popular mentors
- Platform health dashboard (admin only)

---

### F-033: User Badges & Achievements
**Status:** 🔮 Future
**Priority:** Low | **Effort:** 4-5 hours | **Impact:** Medium
**Description:**
- Unlock badges for milestones (first post, 10 comments, etc.)
- Badge display on user profile
- Badge leaderboard
- Badge progression system

---

### F-034: Mentor Reviews & Ratings
**Status:** 🔮 Future
**Priority:** High | **Effort:** 3-4 hours | **Impact:** Very High
**Description:**
- Leave reviews after mentorship completion
- 5-star rating system
- Average rating display on mentor profile
- Review visibility (mentors, mentees, both)
- Flag inappropriate reviews (admin review)

---

### F-035: Event Management Backend
**Status:** 🔮 Future
**Priority:** Medium | **Effort:** 4-5 hours | **Impact:** Medium
**Description:**
- Admin can create/edit/delete events (replace static data)
- Event RSVP system
- Event reminders/notifications
- Event attendee list
- Integration with calendar

---

### F-036: Content Moderation
**Status:** 🔮 Future
**Priority:** Medium | **Effort:** 4-6 hours | **Impact:** High
**Description:**
- Flag/report inappropriate posts, comments, blogs
- Admin moderation dashboard
- Auto-hide flagged content pending review
- User warnings system
- Ban/suspend user capability

---

---

## 🗂️ Quick Reference Table

| ID | Feature | Status | Effort | Demo Appeal | Dependencies |
|---|---|---|---|---|---|
| F-001 | Google OAuth + JWT | ✅ | - | - | None |
| F-002 | User Profiles + CV | ✅ | - | - | F-001 |
| F-003 | Mentor Matching | ✅ | - | - | F-001, F-002 |
| F-004 | Community Feed | ✅ | - | - | F-001 |
| F-005 | Blog System | ✅ | - | - | F-001 |
| F-006 | Points & Gamification | ✅ | - | - | F-004, F-005 |
| F-007 | Events (Static) | ✅ | - | - | None |
| F-008 | Admin & Feature Flags | ✅ | - | - | F-001, F-002 |
| F-009 | Internationalization | ✅ | - | - | None |
| F-010 | Challenges | 🟡 | - | - | F-006 |
| F-011 | Homepage | 🟡 | - | - | None |
| F-012 | About Page | 🟡 | - | - | None |
| F-020 | Challenges (Ready) | 🎯 | 4-6h | ⭐⭐⭐⭐⭐ | F-006, F-008 |
| F-021 | Notifications | 🎯 | 3-5h | ⭐⭐⭐⭐ | F-003, F-004, F-005 |
| F-022 | Global Search | 🎯 | 4-5h | ⭐⭐⭐⭐ | F-003, F-004, F-005 |
| F-023 | User Dashboard | 🎯 | 5-7h | ⭐⭐⭐⭐⭐ | F-002, F-003, F-006 |
| F-024 | Direct Messaging | 🎯 | 6-8h | ⭐⭐⭐⭐⭐ | F-001, F-003 |
| F-030 | User Following | 🔮 | 3-4h | - | - |
| F-031 | File Attachments | 🔮 | 2-3h | - | - |
| F-032 | Analytics Dashboard | 🔮 | 6-8h | - | - |
| F-033 | Badges & Achievements | 🔮 | 4-5h | - | - |
| F-034 | Mentor Reviews | 🔮 | 3-4h | - | - |
| F-035 | Dynamic Events | 🔮 | 4-5h | - | - |
| F-036 | Content Moderation | 🔮 | 4-6h | - | - |

---

## 🎯 Recommended Next Steps

### For Tomorrow's Demo (Pick One):
1. **F-020: Challenges System** ⭐ PRIMARY RECOMMENDATION
   - High visibility (already mentioned in codebase)
   - Completes gamification story
   - 4-6 hours achievable
   - Very visual and engaging

2. **F-023: User Dashboard** ⭐ ALTERNATIVE
   - Strong first impression
   - Shows breadth of features
   - 5-7 hours achievable

3. **F-021: Notifications** ⭐ QUICK WIN
   - Improves UX immediately
   - Only 3-5 hours
   - Cross-cutting benefit

---

**Last Updated:** 2025-11-14
**Created By:** Claude Code Feature Analysis
