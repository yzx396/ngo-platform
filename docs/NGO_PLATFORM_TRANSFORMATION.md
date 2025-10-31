# NGO Platform Transformation Plan

**Goal**: Transform the current mentor-mentee matching platform into a comprehensive NGO community platform with multiple services.

**Approach**: Phased rollout using **vertical slicing** - each slice is a complete, end-to-end, independently deployable feature.

**Moderation Strategy**: Hybrid approach - some content auto-publishes (posts/blogs), other content requires admin approval (challenge submissions for point awards).

**Vertical Slicing Philosophy**: Each slice cuts through all layers (database → backend → frontend → tests) and delivers real user value that can be deployed immediately.

---

## Phase 0: Foundation & Platform Restructure

### Slice 0.1: User Roles System ✅ Deployable

**Value**: Admins can assign roles; users can see their role; role-based access control is enabled.

- [x] **Database**: Create migration for `user_roles` table
  - Columns: `id`, `user_id`, `role` (enum: admin, member), `created_at`
  - Add index on `user_id`
  - Run migration locally and verify schema
- [x] **Types**: Create `src/types/role.ts`
  - Define `UserRole` enum (Admin, Member)
  - Define `UserRoleRecord` interface
  - Update `src/types/user.ts` to include role
- [x] **Backend**: Implement role management API
  - `POST /api/v1/roles` - Assign role (admin only)
  - `GET /api/v1/users/:id/role` - Get user role
  - Add role-based middleware for admin-only routes
  - Write tests for role APIs
- [x] **Frontend**: Display user role
  - Show role badge in user profile/navbar
  - Add role indicator in admin areas
  - Update i18n translations for role labels
- [x] **Testing**: End-to-end test
  - Admin assigns role to user
  - User sees role in UI
  - Role-based access control works
- [x] **Deploy**: Role system is live and functional ✅

### Slice 0.2: Points System ✅ Deployable

**Value**: Users can see their points; points can be awarded; points display in UI.

- [x] **Database**: Create migration for `user_points` table
  - Columns: `id`, `user_id`, `points`, `rank`, `updated_at`
  - Add index on `user_id`
  - Run migration locally and verify schema
- [x] **Types**: Create `src/types/points.ts`
  - Define `UserPoints` interface
  - Define point calculation helpers
  - Update `src/types/user.ts` to include points
- [x] **Backend**: Implement points API
  - `GET /api/v1/users/:id/points` - Get user points
  - `PATCH /api/v1/users/:id/points` - Update points (internal use)
  - Write tests for points APIs
- [x] **Frontend**: Display points in UI
  - Create `UserPointsBadge` component
  - Show points in navbar for authenticated users
  - Add points display to user profile
  - Update i18n translations for points labels
- [x] **Testing**: End-to-end test
  - Points can be awarded via API
  - Points display correctly in UI
  - Points update in real-time
- [x] **Deploy**: Points system is live ✅

### Slice 0.3: New Navigation Layout ✅ Deployable

**Value**: Users see new sidebar navigation; platform has modern community layout.

- [x] **Frontend**: Create new layout components
  - Create `src/react-app/components/Sidebar.tsx`
    - Feed section (always visible, placeholder links)
    - Member Area section (authenticated only, placeholder links)
    - Links section (always visible, placeholder links)
  - Create `src/react-app/components/Layout.tsx`
    - Two-column layout: sidebar + main content
    - Responsive design (collapse sidebar on mobile)
  - Write tests for Sidebar and Layout components
- [x] **Frontend**: Integrate new layout
  - Update `src/react-app/App.tsx` to use Layout component
  - Update HomePage to show community welcome message
  - Remove mentor-specific cards from homepage temporarily
  - Update Navbar with new branding
- [x] **i18n**: Add translations
  - Update `zh-CN/translation.json` with navigation labels
  - Update `en/translation.json` with navigation labels
  - Test language switching
- [x] **Testing**: End-to-end test
  - Navigation renders correctly
  - Sidebar collapses on mobile
  - Authenticated vs public view works
- [x] **Deploy**: New navigation is live ✅

### Slice 0.4: Documentation Update ✅ Deployable

**Value**: Team has up-to-date documentation for new architecture.

- [x] Update `CLAUDE.md` with Phase 0 architecture changes
- [x] Update `README.md` with new platform description
- [x] Create `docs/ARCHITECTURE.md` documenting vertical slice approach
- [x] Document role and points system
- [x] **Deploy**: Documentation is current ✅

---

## Phase 1: Feed & Posts System

### Slice 1.1: View Posts Feed ✅ Deployable

**Value**: Users can see a feed of community posts (even if seeded by admins initially).

- [x] **Database**: Create migration for `posts` table
  - Columns: `id`, `user_id`, `content`, `post_type`, `likes_count`, `comments_count`, `created_at`, `updated_at`
  - Add index on `created_at` for sorting
  - Run migration locally and verify schema
- [x] **Types**: Create `src/types/post.ts`
  - Define `Post` interface
  - Define `PostType` enum (announcement, discussion, general)
  - Update `src/types/api.ts` with `GetPostsResponse`
- [x] **Backend**: Implement read-only posts API
  - `GET /api/v1/posts` - List posts (public, paginated)
  - `GET /api/v1/posts/:id` - Get single post (public)
  - Write tests for GET endpoints
- [x] **Frontend**: Create post viewing components
  - Create `PostCard` component (read-only, no like/comment buttons yet)
  - Create `FeedPage` with post list and pagination
  - Create `postService.ts` with fetch methods
  - Write tests for components
- [x] **Frontend**: Update routing
  - Update `App.tsx` to set `/` to FeedPage
  - Update Sidebar "Feed" link to navigate to `/`
- [x] **i18n**: Add translations for feed page
  - Update `zh-CN/translation.json` and `en/translation.json`
- [x] **Testing**: End-to-end test
  - Seed database with sample posts
  - Users can view feed
  - Pagination works
- [x] **Deploy**: Feed page is live ✅

### Slice 1.2: Create Posts ✅ Deployable

**Value**: Authenticated users can create and publish posts.

- [x] **Types**: Add creation types to `src/types/api.ts`
  - Define `CreatePostRequest`, `UpdatePostRequest`
- [x] **Backend**: Implement post creation API
  - `POST /api/v1/posts` - Create post (authenticated, auto-publish)
  - `PUT /api/v1/posts/:id` - Update post (author only)
  - `DELETE /api/v1/posts/:id` - Delete post (author or admin)
  - Write tests for create/update/delete endpoints (52 API endpoint tests added)
- [x] **Frontend**: Create post creation UI
  - Create `CreatePostForm` component (textarea + submit)
  - Add "Create Post" button to FeedPage (authenticated users only)
  - Add create/edit/delete methods to `postService.ts`
  - Update `PostCard` to show edit/delete buttons for author
  - Write tests for form and actions
- [x] **i18n**: Add translations for post creation
  - Add labels for form, buttons, success/error messages
- [x] **Testing**: End-to-end test
  - User creates post → Post appears in feed
  - User edits own post
  - User deletes own post
  - Admin can delete any post
- [x] **Deploy**: Post creation is live ✅

### Slice 1.3: Like Posts ✅ Deployable

**Value**: Users can like/unlike posts; like counts are visible.

- [ ] **Database**: Create migration for `post_likes` table
  - Columns: `id`, `post_id`, `user_id`, `created_at`
  - Unique constraint on (post_id, user_id)
  - Run migration locally and verify schema
- [ ] **Types**: Update `src/types/post.ts`
  - Define `PostLike` interface
- [ ] **Backend**: Implement like API
  - `POST /api/v1/posts/:id/like` - Like post (authenticated)
  - `DELETE /api/v1/posts/:id/like` - Unlike post (authenticated)
  - Update `likes_count` in posts table
  - Write tests for like/unlike endpoints
- [ ] **Frontend**: Add like functionality
  - Update `PostCard` to show like button and count
  - Implement optimistic UI updates
  - Add like/unlike methods to `postService.ts`
  - Write tests for like interactions
- [ ] **Testing**: End-to-end test
  - User likes post → Count increments
  - User unlikes post → Count decrements
  - Like state persists across page refreshes
- [ ] **Deploy**: Post likes work ✅

### Slice 1.4: Comment on Posts ✅ Deployable

**Value**: Users can comment on posts; comments are visible to everyone.

- [ ] **Database**: Create migration for `post_comments` table
  - Columns: `id`, `post_id`, `user_id`, `content`, `parent_comment_id`, `created_at`, `updated_at`
  - Add indexes on `post_id` and `parent_comment_id`
  - Run migration locally and verify schema
- [ ] **Types**: Update `src/types/post.ts`
  - Define `PostComment` interface
- [ ] **Backend**: Implement comments API
  - `POST /api/v1/posts/:id/comments` - Add comment (authenticated)
  - `GET /api/v1/posts/:id/comments` - Get comments (public)
  - `DELETE /api/v1/comments/:id` - Delete comment (author or admin)
  - Update `comments_count` in posts table
  - Write tests for comment endpoints
- [ ] **Frontend**: Add comment UI
  - Create `PostComments` component with comment list
  - Create `CommentForm` for adding comments
  - Update `PostCard` to show comment count and expand button
  - Support nested replies (optional for v1)
  - Write tests for comment components
- [ ] **Testing**: End-to-end test
  - User adds comment → Comment appears
  - Comment count updates
  - User deletes own comment
  - Admin can delete any comment
- [ ] **Deploy**: Post comments work ✅

### Slice 1.5: Post Types & Admin Announcements ✅ Deployable

**Value**: Admins can create special announcement posts; posts can be filtered by type.

- [ ] **Backend**: Add post type filtering
  - Update `GET /api/v1/posts` to support `?type=` query param
  - Restrict `post_type=announcement` to admins only
  - Write tests for type filtering and permissions
- [ ] **Frontend**: Add post type features
  - Update `CreatePostForm` with type selector (admins only)
  - Add announcement badge to `PostCard`
  - Add filter dropdown to `FeedPage` (All, Announcements, Discussions)
  - Write tests for filtering
- [ ] **i18n**: Add translations for post types
- [ ] **Testing**: End-to-end test
  - Admin creates announcement
  - Announcement shows special badge
  - Filter by post type works
  - Non-admins cannot create announcements
- [ ] **Deploy**: Post types and announcements work ✅

---

## Phase 2: Challenges System

### Slice 2.1: View Challenges ✅ Deployable

**Value**: Users can browse active community challenges (even if no submissions yet).

- [ ] **Database**: Create migration for `challenges` table
  - Columns: `id`, `title`, `description`, `points_reward`, `start_date`, `end_date`, `created_by`, `status`, `created_at`, `updated_at`
  - Add index on `status` and `end_date`
  - Run migration locally and verify schema
- [ ] **Types**: Create `src/types/challenge.ts`
  - Define `Challenge` interface
  - Define `ChallengeStatus` enum (draft, active, completed, cancelled)
  - Update `src/types/api.ts` with challenge response types
- [ ] **Backend**: Implement read-only challenges API
  - `GET /api/v1/challenges` - List active challenges (public)
  - `GET /api/v1/challenges/:id` - Get challenge details (public)
  - Write tests for GET endpoints
- [ ] **Frontend**: Create challenge viewing UI
  - Create `ChallengeCard` component (read-only, with "Participate" call-to-action)
  - Create `ChallengesPage` with challenge list
  - Create `challengeService.ts` with fetch methods
  - Write tests for components
- [ ] **Frontend**: Add to navigation
  - Add "Challenges" link to Sidebar under Feed section
  - Update routing in `App.tsx`
- [ ] **i18n**: Add translations for challenges
- [ ] **Testing**: End-to-end test
  - Seed database with sample challenges
  - Users can browse challenges
  - Challenge details display correctly
- [ ] **Deploy**: Challenges page is live ✅

### Slice 2.2: Admin Create & Manage Challenges ✅ Deployable

**Value**: Admins can create, edit, and manage challenges.

- [ ] **Backend**: Implement challenge management API
  - `POST /api/v1/challenges` - Create challenge (admin only)
  - `PUT /api/v1/challenges/:id` - Update challenge (admin only)
  - `DELETE /api/v1/challenges/:id` - Delete challenge (admin only)
  - Write tests for CRUD endpoints with permission checks
- [ ] **Frontend**: Create admin challenge management UI
  - Create `CreateChallengeForm` component
  - Create `ManageChallengesPage` (admin only)
  - Add create/edit/delete methods to `challengeService.ts`
  - Write tests for admin actions
- [ ] **Frontend**: Update navigation
  - Add "Manage Challenges" to Sidebar (admin only)
- [ ] **i18n**: Add translations for challenge management
- [ ] **Testing**: End-to-end test
  - Admin creates challenge → Appears in public list
  - Admin edits challenge → Changes reflect
  - Admin deletes challenge → Removed from list
  - Non-admins cannot access management page
- [ ] **Deploy**: Challenge management works ✅

### Slice 2.3: Submit to Challenges ✅ Deployable

**Value**: Members can submit evidence for challenge completion.

- [ ] **Database**: Create migration for `challenge_submissions` table
  - Columns: `id`, `challenge_id`, `user_id`, `evidence`, `status`, `reviewed_by`, `reviewed_at`, `created_at`, `updated_at`
  - Add indexes on `challenge_id`, `user_id`, and `status`
  - Run migration locally and verify schema
- [ ] **Types**: Update `src/types/challenge.ts`
  - Define `ChallengeSubmission` interface
  - Define `SubmissionStatus` enum (pending, approved, rejected)
- [ ] **Backend**: Implement submission API
  - `POST /api/v1/challenges/:id/submit` - Submit evidence (authenticated)
  - `GET /api/v1/users/:userId/submissions` - Get user's submissions
  - Write tests for submission endpoints
- [ ] **Frontend**: Create submission UI
  - Create `ChallengeSubmissionForm` component
  - Update `ChallengeCard` to show "Submit" button for authenticated users
  - Create `MyChallengesPage` showing user's submissions and statuses
  - Write tests for submission flow
- [ ] **Frontend**: Add to navigation
  - Add "My Challenges" to Sidebar under Member Area
- [ ] **i18n**: Add translations for submissions
- [ ] **Testing**: End-to-end test
  - User submits evidence → Submission created with "pending" status
  - User can view their submissions
  - Cannot submit twice to same challenge
- [ ] **Deploy**: Challenge submissions work ✅

### Slice 2.4: Review Submissions & Award Points ✅ Deployable

**Value**: Admins can approve/reject submissions; approved submissions award points to users.

- [ ] **Backend**: Implement review and points logic
  - `GET /api/v1/submissions` - List pending submissions (admin only)
  - `POST /api/v1/submissions/:id/review` - Approve/reject (admin only)
  - Award points logic: On approval, add `points_reward` to user's points
  - Write tests for review workflow and point awards
- [ ] **Frontend**: Create review UI
  - Create `SubmissionReviewPanel` component (admin only)
  - Add to `ManageChallengesPage` or create separate review page
  - Show pending submissions with evidence
  - Add approve/reject buttons
  - Write tests for review actions
- [ ] **Frontend**: Update submission display
  - Show approval status in `MyChallengesPage`
  - Display points awarded for approved submissions
- [ ] **i18n**: Add translations for review workflow
- [ ] **Testing**: End-to-end test
  - Admin approves submission → Points added to user
  - User sees approved status and points received
  - Admin rejects submission → No points awarded
  - Rejection workflow works correctly
- [ ] **Deploy**: Full challenge workflow complete ✅

---

## Phase 3: Blogs System

### Slice 3.1: Read & Browse Blogs ✅ Deployable

**Value**: Users can read blog posts from the community.

- [ ] **Database**: Create migration for `blogs` table
  - Columns: `id`, `user_id`, `title`, `content`, `featured`, `likes_count`, `comments_count`, `created_at`, `updated_at`
  - Add indexes on `created_at` and `featured`
  - Run migration locally and verify schema
- [ ] **Types**: Create `src/types/blog.ts`
  - Define `Blog` interface
  - Update `src/types/api.ts` with blog response types
- [ ] **Backend**: Implement read-only blogs API
  - `GET /api/v1/blogs` - List blogs (public, paginated)
  - `GET /api/v1/blogs/:id` - Get single blog (public)
  - Support `?featured=true` query param
  - Write tests for GET endpoints
- [ ] **Frontend**: Create blog viewing UI
  - Create `BlogCard` component (title, excerpt, author, date)
  - Create `BlogsPage` with blog list and filters
  - Create `BlogDetailPage` for full blog content
  - Create `blogService.ts` with fetch methods
  - Write tests for components
- [ ] **Frontend**: Add to navigation
  - Add "Blogs" link to Sidebar under Feed section
  - Update routing in `App.tsx`
- [ ] **i18n**: Add translations for blogs
- [ ] **Testing**: End-to-end test
  - Users can browse blogs
  - Blog detail page displays full content
  - Featured filter works
- [ ] **Deploy**: Blog reading works ✅

### Slice 3.2: Write & Publish Blogs ✅ Deployable

**Value**: Authenticated users can write and publish blog posts; earn points.

- [ ] **Backend**: Implement blog creation API
  - `POST /api/v1/blogs` - Create blog (authenticated, auto-publish)
  - `PUT /api/v1/blogs/:id` - Update blog (author only)
  - `DELETE /api/v1/blogs/:id` - Delete blog (author or admin)
  - Award +10 points on blog publish
  - Write tests for blog CRUD with point awards
- [ ] **Frontend**: Create blog writing UI
  - Create `BlogEditor` component (title + markdown or rich text editor)
  - Create `CreateBlogPage` for new blogs
  - Create `MyBlogsPage` showing user's published blogs
  - Add edit/delete actions to `BlogCard` for author
  - Write tests for blog creation flow
- [ ] **Frontend**: Add to navigation
  - Add "My Blogs" to Sidebar under Member Area
  - Add "Write Blog" button to BlogsPage
- [ ] **i18n**: Add translations for blog creation
- [ ] **Testing**: End-to-end test
  - User creates blog → Blog published → +10 points awarded
  - User edits own blog
  - User deletes own blog
  - Admin can delete any blog
- [ ] **Deploy**: Blog creation works ✅

### Slice 3.3: Blog Engagement (Likes & Comments) ✅ Deployable

**Value**: Users can like and comment on blogs (reuse post engagement patterns).

- [ ] **Database**: Extend likes/comments for blogs
  - Option A: Reuse `post_likes` and `post_comments` with polymorphic relations
  - Option B: Create separate `blog_likes` and `blog_comments` tables
  - Run migration locally
- [ ] **Backend**: Implement blog engagement API
  - `POST /api/v1/blogs/:id/like` - Like blog (authenticated)
  - `DELETE /api/v1/blogs/:id/like` - Unlike blog (authenticated)
  - `POST /api/v1/blogs/:id/comments` - Add comment (authenticated)
  - `GET /api/v1/blogs/:id/comments` - Get comments (public)
  - Write tests for engagement endpoints
- [ ] **Frontend**: Add engagement UI to blogs
  - Update `BlogDetailPage` with like button and comments section
  - Reuse or adapt `PostComments` component for blogs
  - Write tests for blog engagement
- [ ] **Testing**: End-to-end test
  - User likes blog → Count increments
  - User comments on blog → Comment appears
  - Engagement persists
- [ ] **Deploy**: Blog engagement works ✅

### Slice 3.4: Featured Blogs & Admin Curation ✅ Deployable

**Value**: Admins can feature exceptional blogs; featured blogs appear prominently; authors earn bonus points.

- [ ] **Backend**: Implement feature/unfeature API
  - `PATCH /api/v1/blogs/:id/feature` - Toggle featured status (admin only)
  - Award +50 bonus points when blog is featured
  - Write tests for feature endpoint and bonus points
- [ ] **Frontend**: Add feature functionality
  - Create `FeaturedBlogsBanner` component for FeedPage
  - Add feature toggle button in admin view
  - Show "Featured" badge on `BlogCard`
  - Write tests for featured blogs display
- [ ] **Testing**: End-to-end test
  - Admin features blog → Badge appears → Author gets +50 points
  - Featured blogs show in banner
  - Admin can unfeature blog
- [ ] **Deploy**: Featured blogs work ✅

---

## Phase 4: Leaderboard & Gamification

### Slice 4.1: Basic Leaderboard ✅ Deployable

**Value**: Users can see top contributors ranked by points; motivates participation.

- [ ] **Backend**: Implement leaderboard API
  - `GET /api/v1/leaderboard` - Get ranked users by points (public, paginated)
  - `GET /api/v1/users/:id/rank` - Get specific user rank
  - Implement rank calculation logic
  - Write tests for leaderboard endpoints
- [ ] **Frontend**: Create leaderboard UI
  - Create `LeaderboardTable` component (rank, user, points)
  - Create `LeaderboardPage` with top users
  - Create `leaderboardService.ts`
  - Highlight current user's position
  - Write tests for leaderboard display
- [ ] **Frontend**: Add to navigation
  - Add "Leaderboard" link to Sidebar under Links section
  - Update routing in `App.tsx`
- [ ] **i18n**: Add translations for leaderboard
- [ ] **Testing**: End-to-end test
  - Leaderboard displays correctly
  - Users ranked by points
  - Current user is highlighted
- [ ] **Deploy**: Leaderboard is live ✅

### Slice 4.2: Time-Period Filters ✅ Deployable

**Value**: Users can view leaderboards for different time periods (weekly, monthly, all-time).

- [ ] **Database**: Add time tracking to points
  - Consider adding `points_history` table for granular tracking (optional)
  - Or use `updated_at` in existing tables
- [ ] **Backend**: Implement time-period filtering
  - Update `GET /api/v1/leaderboard` to support `?period=` query param
  - Calculate ranks for weekly, monthly, all-time
  - Write tests for time-period filters
- [ ] **Frontend**: Add period selector
  - Add dropdown to `LeaderboardPage` (All-time, Monthly, Weekly)
  - Update leaderboard based on selection
  - Write tests for filtering
- [ ] **Testing**: End-to-end test
  - Each time period shows correct rankings
  - Switching periods updates leaderboard
- [ ] **Deploy**: Time-period filtering works ✅

### Slice 4.3: Points Display & User Badges ✅ Deployable

**Value**: Users see their points everywhere; gamification is visible throughout the platform.

- [ ] **Frontend**: Create points display components
  - Create `UserRankBadge` component (rank + points)
  - Update Navbar to show current user's points
  - Add points display to user profile pages
  - Show points earned on activity notifications
  - Write tests for points display
- [ ] **Testing**: End-to-end test
  - Points display correctly in navbar
  - User profile shows total points
  - Points update in real-time when earned
- [ ] **Deploy**: Points visibility is complete ✅

### Slice 4.4: Points System Documentation ✅ Deployable

**Value**: Users understand how to earn points; transparent gamification rules.

- [ ] Create `docs/POINTS_SYSTEM.md` documenting all point rules:
  - Challenge completion: Variable (based on challenge)
  - Blog post: +10 points
  - Featured blog: +50 bonus points
  - Mentorship completion: +20 points (Phase 5)
  - Optional: Likes, comments, engagement
- [ ] Add points help page to frontend
  - Create `HowToEarnPointsPage` with rules explanation
  - Link from leaderboard and user profile
- [ ] **i18n**: Add translations for points help
- [ ] **Deploy**: Points documentation is live ✅

---

## Phase 5: Mentorship Redesign & Integration

### Slice 5.1: Database & API Restructure ✅ Deployable

**Value**: Mentorship system uses consistent terminology; database schema supports points.

- [ ] **Database**: Update schema for mentorships
  - Rename `matches` table to `mentorships` (or add views for compatibility)
  - Add `points_awarded` column to track points for completed mentorships
  - Run migration and verify backward compatibility
- [ ] **Types**: Update type definitions
  - Rename `src/types/match.ts` → `mentorship.ts`
  - Update `Match` interface → `Mentorship`
  - Update all import statements
  - Update `src/types/api.ts` with new mentorship types
- [ ] **Backend**: Migrate API endpoints
  - Create new `/api/v1/mentorships/*` endpoints
  - Keep `/api/v1/matches/*` as aliases for backward compatibility
  - Update all mentorship logic
  - Write tests for new endpoints
- [ ] **Testing**: End-to-end test
  - New mentorship API works
  - Backward compatibility maintained
  - Database migration successful
- [ ] **Deploy**: Mentorship API restructured ✅

### Slice 5.2: Move to Member Area ✅ Deployable

**Value**: Mentorship is integrated as one service in the Member Area (not the main feature).

- [ ] **Frontend**: Restructure navigation
  - Remove mentor browsing from public homepage
  - Move "Find a Mentor" to Sidebar under Member Area (authenticated only)
  - Rename `MatchesList.tsx` → `MyMentorshipsPage.tsx`
  - Update all routing in `App.tsx`
- [ ] **Frontend**: Update services
  - Rename `matchService.ts` → `mentorshipService.ts`
  - Update import statements across codebase
  - Write tests for updated services
- [ ] **i18n**: Update translations
  - Change "matches" → "mentorships" throughout
  - Update `zh-CN/translation.json` and `en/translation.json`
- [ ] **Testing**: End-to-end test
  - Mentorship features accessible from Member Area
  - Public users see simplified homepage
  - Authenticated users can browse mentors
- [ ] **Deploy**: Mentorship moved to Member Area ✅

### Slice 5.3: Simplify Mentor Profiles ✅ Deployable

**Value**: Mentor profiles integrated with user profiles; simpler UX.

- [ ] **Frontend**: Simplify mentor components
  - Update `MentorCard.tsx` to use user profile data
  - Streamline `MentorProfileSetup.tsx` form
  - Remove redundant fields from mentor profiles
  - Write tests for simplified components
- [ ] **Backend**: Update mentor profile logic (if needed)
  - Simplify profile creation/update endpoints
  - Write tests for changes
- [ ] **Testing**: End-to-end test
  - Mentor profiles display correctly
  - Profile creation/editing works
  - Data migration handled
- [ ] **Deploy**: Simplified mentor profiles live ✅

### Slice 5.4: Award Points for Mentorships ✅ Deployable

**Value**: Mentors and mentees earn points for completing mentorships; incentivizes participation.

- [ ] **Backend**: Implement points for mentorships
  - Award +20 points when mentorship marked as "completed"
  - Award points to both mentor and mentee
  - Update `PATCH /api/v1/mentorships/:id/complete` endpoint
  - Write tests for point awards
- [ ] **Frontend**: Display mentorship points
  - Show points earned in `MyMentorshipsPage`
  - Add "Complete Mentorship" button with points preview
  - Write tests for points display
- [ ] **Testing**: End-to-end test
  - Completing mentorship awards +20 points to both parties
  - Points display correctly
  - Leaderboard reflects mentorship points
- [ ] **Deploy**: Mentorship points system complete ✅

---

## Final Integration & Polish

### Slice 6.1: Admin Dashboard ✅ Deployable

**Value**: Admins have a central dashboard to manage all platform activity.

- [ ] **Frontend**: Create admin dashboard
  - Create `AdminDashboardPage.tsx`
    - Platform overview (stats: users, posts, blogs, challenges)
    - Pending challenge submissions panel
    - Content moderation panel (delete posts/blogs)
    - User role management
    - Feature/unfeature blogs
  - Write tests for admin dashboard
- [ ] **Frontend**: Add to navigation
  - Add "Admin Dashboard" to Sidebar (admin only)
- [ ] **i18n**: Add translations for dashboard
- [ ] **Testing**: End-to-end test
  - Dashboard displays correct stats
  - All admin actions work from dashboard
  - Non-admins cannot access dashboard
- [ ] **Deploy**: Admin dashboard is live ✅

### Slice 6.2: User Activity Feed ✅ Deployable

**Value**: User profiles show activity history; better community transparency.

- [ ] **Backend**: Implement activity feed API
  - `GET /api/v1/users/:id/activity` - Get user's recent activity
  - Aggregate posts, blogs, challenges, mentorships
  - Write tests for activity endpoint
- [ ] **Frontend**: Create activity feed UI
  - Create `UserActivityFeed` component
  - Add to user profile pages
  - Show recent contributions with timestamps
  - Write tests for activity display
- [ ] **Testing**: End-to-end test
  - Activity feed displays user actions
  - Activity updates in real-time
- [ ] **Deploy**: User activity feed works ✅

### Slice 6.3: Performance Optimization ✅ Deployable

**Value**: Platform is fast and responsive; handles growth.

- [ ] **Database**: Optimize queries
  - Add database indexes where missing (created_at, user_id, status fields)
  - Analyze slow queries and optimize
  - Test with large datasets
- [ ] **Backend**: Implement caching
  - Cache leaderboard results (refresh hourly)
  - Cache featured blogs (refresh on change)
  - Add database query result caching
- [ ] **Frontend**: Optimize bundle
  - Lazy load heavy components
  - Implement code splitting for routes
  - Optimize images (compression, lazy loading)
  - Profile and reduce bundle size
- [ ] **Testing**: Performance testing
  - Load test with simulated users
  - Measure page load times
  - Verify database performance
- [ ] **Deploy**: Platform performance optimized ✅

### Slice 6.4: Documentation ✅ Deployable

**Value**: Complete documentation for developers, users, and admins.

- [ ] Update developer documentation
  - Update `README.md` with new platform features
  - Update `CLAUDE.md` with architecture changes
  - Create `docs/API_DOCUMENTATION.md` for all endpoints
  - Create `docs/ARCHITECTURE.md` with system design
- [ ] Create user documentation
  - Create `docs/USER_GUIDE.md` for end users
  - Create `docs/ADMIN_GUIDE.md` for administrators
  - Document points system (already in Slice 4.4)
- [ ] **Deploy**: Documentation complete ✅

### Slice 6.5: Security & Quality Assurance ✅ Deployable

**Value**: Platform is secure, tested, and production-ready.

- [ ] **Testing**: Comprehensive test suite
  - Run full test suite and verify >80% coverage
  - Fix any failing tests
  - Add missing test cases
- [ ] **Testing**: Cross-platform testing
  - Test on Chrome, Firefox, Safari
  - Test on iOS and Android mobile devices
  - Verify responsive design everywhere
- [ ] **Security**: Security audit
  - Review authentication and authorization
  - Test for SQL injection vulnerabilities
  - Verify JWT token security
  - Review admin-only endpoints
  - Check for XSS vulnerabilities
- [ ] **Deploy**: Platform is secure and ready for production ✅

### Slice 6.6: Phased Deployment ✅ Deployable

**Value**: Platform deployed to production with monitoring.

- [ ] Deploy each phase to staging
  - Deploy Phase 0 (Foundation) to staging environment
  - Verify functionality, monitor logs
  - Deploy Phase 1 (Feed & Posts) to staging
  - Deploy Phase 2 (Challenges) to staging
  - Deploy Phase 3 (Blogs) to staging
  - Deploy Phase 4 (Leaderboard) to staging
  - Deploy Phase 5 (Mentorship) to staging
  - Deploy Final Integration to staging
- [ ] Production deployment
  - Deploy to production incrementally (one phase per week)
  - Monitor error logs and user feedback
  - Fix issues before next phase
  - Announce new features to users
- [ ] **Deploy**: Platform fully deployed to production ✅

---

## Progress Tracking

Track your progress by phase and slice. Mark slices as complete when deployed and verified.

### Phase 0: Foundation (4 slices)
- ✅ Slice 0.1: User Roles System
- ✅ Slice 0.2: Points System
- ✅ Slice 0.3: New Navigation Layout
- ✅ Slice 0.4: Documentation Update

### Phase 1: Feed & Posts (5 slices)
- ✅ Slice 1.1: View Posts Feed
- ⬜ Slice 1.2: Create Posts
- ⬜ Slice 1.3: Like Posts
- ⬜ Slice 1.4: Comment on Posts
- ⬜ Slice 1.5: Post Types & Admin Announcements

### Phase 2: Challenges (4 slices)
- ⬜ Slice 2.1: View Challenges
- ⬜ Slice 2.2: Admin Create & Manage Challenges
- ⬜ Slice 2.3: Submit to Challenges
- ⬜ Slice 2.4: Review Submissions & Award Points

### Phase 3: Blogs (4 slices)
- ⬜ Slice 3.1: Read & Browse Blogs
- ⬜ Slice 3.2: Write & Publish Blogs
- ⬜ Slice 3.3: Blog Engagement (Likes & Comments)
- ⬜ Slice 3.4: Featured Blogs & Admin Curation

### Phase 4: Leaderboard (4 slices)
- ⬜ Slice 4.1: Basic Leaderboard
- ⬜ Slice 4.2: Time-Period Filters
- ⬜ Slice 4.3: Points Display & User Badges
- ⬜ Slice 4.4: Points System Documentation

### Phase 5: Mentorship Redesign (4 slices)
- ⬜ Slice 5.1: Database & API Restructure
- ⬜ Slice 5.2: Move to Member Area
- ⬜ Slice 5.3: Simplify Mentor Profiles
- ⬜ Slice 5.4: Award Points for Mentorships

### Phase 6: Final Integration (6 slices)
- ⬜ Slice 6.1: Admin Dashboard
- ⬜ Slice 6.2: User Activity Feed
- ⬜ Slice 6.3: Performance Optimization
- ⬜ Slice 6.4: Documentation
- ⬜ Slice 6.5: Security & Quality Assurance
- ⬜ Slice 6.6: Phased Deployment

**Total Slices: 31** | **Completed: 5** | **Progress: ~16%**

---

## Notes & Decisions

### Vertical Slicing Approach
- **Each slice is independently deployable** - Delivers working functionality end-to-end
- **Database → Backend → Frontend → Tests** - Complete stack for each slice
- **Deploy often** - Get feedback early, reduce integration risk
- **Flexibility** - Can pause, reorder, or skip slices based on priorities

### Architecture Decisions
- **Sidebar navigation**: Fixed left sidebar with Feed, Member Area, and Links sections
- **API versioning**: All endpoints use `/api/v1/` prefix
- **User roles**: Simple two-role system (Admin, Member)
- **Hybrid moderation**: Auto-publish for posts/blogs, approval for challenge submissions
- **Points system**: Centralized in `user_points` table with rank calculation
- **Mentorship integration**: Moved to Member Area, no longer the primary feature

### Technology Stack
- **Frontend**: React 19, React Router, TailwindCSS, shadcn/ui
- **Backend**: Hono on Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite)
- **Auth**: Google OAuth 2.0 + JWT
- **i18n**: react-i18next (Chinese default, English fallback)
- **Testing**: Vitest, React Testing Library

### Key Principles
- **Vertical Slicing**: Each deliverable cuts through all layers of the stack
- **Test-Driven Development**: Write tests first for all features
- **Incremental deployment**: Deploy each slice independently
- **Mobile-first**: Responsive design for all components
- **Accessibility**: ARIA labels, keyboard navigation
- **Performance**: Lazy loading, code splitting, optimized queries

### Points System Rules
- Challenge completion: Variable (set per challenge)
- Blog post published: +10 points
- Blog featured by admin: +50 bonus points
- Mentorship completed: +20 points (both mentor and mentee)
- Optional future: Engagement points for likes/comments

---

Last Updated: 2025-10-31
