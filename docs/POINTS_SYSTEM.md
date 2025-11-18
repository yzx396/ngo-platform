# Points System & Gamification

This document details the Points System that enables gamification across the Lead Forward Platform.

## Overview

The Points System tracks user points and calculates leaderboard rankings. Points are awarded for various activities (creating posts, receiving engagement, etc.) and displayed throughout the platform.

**Key Design Decisions:**
- **No Rank Column**: Rank is calculated on-the-fly using SQL window functions, avoiding expensive updates when points change
- **Initial Points on Registration**: New users receive 20 initial points upon account creation as a welcome bonus to encourage engagement
- **Eager Initialization**: Points records are created during user registration (both direct signup and Google OAuth)
- **Fallback Auto-initialization**: If a legacy user without a points record is accessed, points are auto-initialized on first access
- **Consistent Timestamps**: Uses Unix timestamps (seconds) for consistency with existing schema
- **Type Safety**: Shared types between frontend and backend in `src/types/points.ts`

## Database Schema

### user_points table

```sql
id TEXT PRIMARY KEY
user_id TEXT UNIQUE (FOREIGN KEY to users)
points INTEGER (default 0)
updated_at INTEGER (Unix timestamp)
```

**Indexes:**
- `idx_user_points_user_id`: Fast lookups by user
- `idx_user_points_points DESC`: Efficient leaderboard sorting

### point_actions_log table (migration 0013)

Tracks all point awards with timestamps for audit trails and diminishing returns calculations.

```sql
id TEXT PRIMARY KEY
user_id TEXT (FOREIGN KEY to users)
action_type TEXT (post_created|blog_created|blog_featured|like_received|comment_created|comment_received)
reference_id TEXT (ID of post/blog/comment/like)
points_awarded INTEGER (actual points after diminishing returns)
created_at INTEGER (Unix timestamp)
```

**Index:**
- `idx_point_actions_user_time`: Fast lookups for diminishing returns calculations

## API Endpoints

### GET /api/v1/users/:id/points (Public)

Returns user points with calculated rank. For new users, a points record is created during registration with 20 initial points. For legacy users without a points record, one is auto-created with a fallback value on first access.

**Response:**
```typescript
{
  id: string;
  user_id: string;
  points: number;
  updated_at: number;
  rank?: number; // Calculated position in leaderboard
}
```

### PATCH /api/v1/users/:id/points (Admin Only)

Updates user's total points. Requires authentication and admin role.

**Request body:** `{ points: number }`

**Returns:** Updated points with recalculated rank

## Post Engagement Point System

Automatically awards points for creating and engaging with community posts.

### Point Values (Creation-Focused)

**Content Creation:**
- Discussion posts: 15 points
- General posts: 10 points
- Announcement posts: 0 points (admin-only, no gamification)
- Comments: 5 points

**Content Author Rewards (for receiving engagement):**
- Each like on post: 2 points (to post author)
- Each comment on post: 3 points (to post author)

### Anti-Spam: Diminishing Returns

All point awards use a rolling 1-hour window with diminishing returns to prevent spam:

- **Likes received**: First 5/hour = full points, next 10 = 50% points, then 0 points
- **Comments created**: First 10/hour = full points, next 10 = 40% points, then 0 points
- **Posts created**: First 3/hour = full points, next 2 = 50% points, then 0 points

### How It Works

1. **Post Creation**: User creates discussion/general post → immediately receives creation points
2. **Receiving Like**: Another user likes post → post author receives points (not liker)
3. **Creating Comment**: User comments on post → commenter receives points AND post author receives points (unless same person)
4. **Point Tracking**: All awards logged in `point_actions_log` table

**Important:** Points awarding is handled silently - if point system fails, the post/like/comment action still succeeds. This prioritizes user experience over perfect consistency.

## Blog Point System

Automatically awards points for creating and engaging with blog posts.

### Point Values (Creation-Focused)

**Content Creation:**
- Blog posts: 10 points (with diminishing returns)
- Blog featured by admin: 50 bonus points (one-time, no diminishing returns)
- Comments on blogs: 5 points (reuses post comment system)

**Content Author Rewards (for receiving engagement):**
- Each like on blog: 2 points (to blog author)
- Each comment on blog: 3 points (to blog author)

### Diminishing Returns for Blogs

Blog creation uses a rolling 1-hour window with stricter limits than posts:

- **Blogs created**: First 2/hour = full points, next 2 = 50% points, then 0 points
- **Likes received**: First 5/hour = full points, next 10 = 50% points, then 0 points (same as posts)
- **Comments created**: First 10/hour = full points, next 10 = 40% points, then 0 points (same as posts)

**Rationale:** Blogs are longer-form content requiring more effort, so lower creation threshold encourages quality over quantity.

### Action Types for Blogs

The following action types are logged in `point_actions_log`:

- `blog_created` - User creates a blog post
- `blog_featured` - Admin features a blog (awards bonus to author)
- `like_received` - Blog author receives like on their blog (shared with posts)
- `comment_created` - User comments on blog (shared with posts)
- `comment_received` - Blog author receives comment (shared with posts)

### How It Works

1. **Blog Creation**: User creates blog → immediately receives creation points (with diminishing returns)
2. **Receiving Like**: Another user likes blog → blog author receives points (not liker)
3. **Creating Comment**: User comments on blog → commenter receives points AND blog author receives points (unless same person)
4. **Admin Featuring**: Admin features blog → author receives one-time 50-point bonus (no diminishing returns)
5. **Point Tracking**: All awards logged in `point_actions_log` table with action type and reference ID

**Important:** Point awarding is handled silently - if point system fails, the blog/like/comment action still succeeds. This prioritizes user experience over perfect consistency.

## Initial Points on Registration

When a new user joins the platform (either through direct signup or Google OAuth), they automatically receive **20 initial points** as a welcome bonus.

### Implementation

**User Registration (Direct Signup):**
- `POST /api/v1/users` endpoint creates a user and immediately inserts a `user_points` record with 20 points

**Google OAuth:**
- OAuth callback creates user and inserts `user_points` record with 20 points when `isNewUser` flag is true

**Backfill for Legacy Users:**
- Existing users created before this feature was added can be backfilled via migration `0021_backfill_initial_points.sql`
- This migration creates points records for all users who don't have one yet, awarding 20 points to each

### Configuration

The initial points value is controlled by the `INITIAL_POINTS` constant in `src/types/points.ts`:

```typescript
export const INITIAL_POINTS = 20;
```

To change the welcome bonus, modify this constant and redeploy.

## Constants

Located in `src/types/points.ts`:

```typescript
// Initial points awarded to new users on registration
INITIAL_POINTS = 20

// Content creation points
POINTS_FOR_CREATE_DISCUSSION_POST = 15
POINTS_FOR_CREATE_GENERAL_POST = 10
POINTS_FOR_CREATE_BLOG = 10
POINTS_FOR_BLOG_FEATURED = 50
POINTS_FOR_CREATE_COMMENT = 5

// Author rewards
POINTS_FOR_RECEIVING_LIKE = 2
POINTS_FOR_RECEIVING_COMMENT = 3

// Diminishing returns - Posts
POSTS_CREATED_FULL_POINTS_THRESHOLD = 3
POSTS_CREATED_REDUCED_POINTS_THRESHOLD = 5
POSTS_CREATED_REDUCED_MULTIPLIER = 0.5

// Diminishing returns - Blogs
BLOGS_CREATED_FULL_POINTS_THRESHOLD = 2
BLOGS_CREATED_REDUCED_POINTS_THRESHOLD = 4
BLOGS_CREATED_REDUCED_MULTIPLIER = 0.5

// Diminishing returns - Engagement (shared)
LIKES_RECEIVED_FULL_POINTS_THRESHOLD = 5
LIKES_RECEIVED_REDUCED_POINTS_THRESHOLD = 15
LIKES_RECEIVED_REDUCED_MULTIPLIER = 0.5
COMMENTS_CREATED_FULL_POINTS_THRESHOLD = 10
COMMENTS_CREATED_REDUCED_POINTS_THRESHOLD = 20
COMMENTS_CREATED_REDUCED_MULTIPLIER = 0.4

DIMINISHING_RETURNS_WINDOW_SECONDS = 3600
```

## Helper Function

`awardPointsForAction()` in `src/worker/index.ts`:

```typescript
async function awardPointsForAction(
  db: D1Database,
  userId: string,
  actionType: string,
  referenceId: string,
  basePoints: number
): Promise<number>
```

- Calculates diminishing returns based on recent actions
- Updates `user_points` table
- Logs action in `point_actions_log`
- Returns actual points awarded (after diminishing returns)
- **Supported action types**: `post_created`, `blog_created`, `blog_featured`, `like_received`, `comment_created`, `comment_received`

**Silent Failure:** If point awarding fails for any reason, the function returns 0 and logs the error, but the main action (post/blog/like/comment creation) still succeeds.

## Frontend Components

### UserPointsBadge

Location: `src/react-app/components/UserPointsBadge.tsx`

Displays points with icon and optional rank.

**Props:**
- `points` (number): Point count
- `rank` (number, optional): User's rank
- `showRank` (boolean): Show rank display
- `variant` (sm|md|lg): Size variant
- `showBadge` (boolean): Show badge background

**Color Coding:**
- Gray: < 100 points
- Orange: 100-499 points
- Blue: 500-999 points
- Yellow: 1000+ points

Responsive design with accessible ARIA labels.

### Points Service

Location: `src/react-app/services/pointsService.ts`

```typescript
getUserPoints(userId: string): Promise<UserPoints>
updateUserPoints(userId: string, points: number): Promise<UserPoints>
addPointsToUser(userId: string, pointsToAdd: number): Promise<UserPoints>
awardPointsForAction(userId: string, pointsToAward: number, action: string): Promise<UserPoints>
```

## Helper Functions

Located in `src/types/points.ts`:

- `normalizeUserPoints()`: Ensure proper typing from database
- `formatPoints()`: Format with thousands separator (e.g., "1,000")
- `formatRank()`: Format with ordinal suffix (e.g., "1st", "2nd", "3rd")
- `getPointsColor()`: Get TailwindCSS color class for badge

## Integration

Points are integrated with:
- User types and API response types in `src/types/`
- Post creation and engagement endpoints (`/api/v1/posts/*`)
- Blog creation and engagement endpoints (`/api/v1/blogs/*`)
- User profile endpoints
- Frontend UI components throughout the app

## Testing

Test coverage should include:
- Type normalization and formatting functions
- Point storage and retrieval from database
- Rank calculation accuracy
- Authorization checks on admin endpoints
- Component rendering and accessibility
- Diminishing returns calculations
- Edge cases (no points, same author interactions, etc.)

Run tests with: `npm run test:watch`
