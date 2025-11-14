import { Hono } from "hono";
import type { User } from "../types/user";
import type {
  CreateUserRequest,
  UpdateUserRequest,
  CreateMentorProfileRequest,
  UpdateMentorProfileRequest,
  SearchMentorsResponse,
  CreateMatchRequest,
  RespondToMatchRequest,
  GetMatchesResponse,
  AssignRoleRequest,
  GetUserRoleResponse,
  GetUserPointsResponse,
  UpdateUserPointsRequest,
  GetPostsResponse,
  GetBlogsResponse,
  CreateBlogRequest,
  UpdateBlogRequest,
  FeatureBlogRequest,
  GetBlogCommentsResponse,
  CreateBlogCommentRequest
} from "../types/api";
import type {
  FeatureFlagCreateRequest,
  FeatureFlagUpdateRequest,
  EnabledFeatures,
} from "../types/features";
import { normalizeFeatureFlag, isValidFeatureKey } from "../types/features";
import type { MentorProfile } from "../types/mentor";
import type { Match } from "../types/match";
import type { Post } from "../types/post";
import { normalizePost, normalizePostCommentWithAuthor } from "../types/post";
import type { Blog, BlogWithLikeStatus } from "../types/blog";
import { normalizeBlog, normalizeBlogCommentWithAuthor } from "../types/blog";
import { authMiddleware, requireAuth } from "./auth/middleware";
import { requireAdmin } from "./auth/roleMiddleware";
import {
  getGoogleLoginUrl,
  exchangeGoogleCode,
  getGoogleUserProfile,
  findOrCreateUserFromGoogle,
  createAuthPayload,
} from "./auth/google";
import { createToken } from "./auth/jwt";
import { AuthPayload } from "../types/user";
import { UserRole, DEFAULT_ROLE, normalizeUserRole } from "../types/role";
import {
  normalizeUserPointsWithRank,
  INITIAL_POINTS,
  POINTS_FOR_CREATE_DISCUSSION_POST,
  POINTS_FOR_CREATE_GENERAL_POST,
  POINTS_FOR_CREATE_ANNOUNCEMENT_POST,
  POINTS_FOR_CREATE_COMMENT,
  POINTS_FOR_CREATE_BLOG,
  POINTS_FOR_BLOG_FEATURED,
  POINTS_FOR_RECEIVING_LIKE,
  POINTS_FOR_RECEIVING_COMMENT,
  LIKES_RECEIVED_FULL_POINTS_THRESHOLD,
  LIKES_RECEIVED_REDUCED_POINTS_THRESHOLD,
  LIKES_RECEIVED_REDUCED_MULTIPLIER,
  COMMENTS_CREATED_FULL_POINTS_THRESHOLD,
  COMMENTS_CREATED_REDUCED_POINTS_THRESHOLD,
  COMMENTS_CREATED_REDUCED_MULTIPLIER,
  POSTS_CREATED_FULL_POINTS_THRESHOLD,
  POSTS_CREATED_REDUCED_POINTS_THRESHOLD,
  POSTS_CREATED_REDUCED_MULTIPLIER,
  BLOGS_CREATED_FULL_POINTS_THRESHOLD,
  BLOGS_CREATED_REDUCED_POINTS_THRESHOLD,
  BLOGS_CREATED_REDUCED_MULTIPLIER,
  DIMINISHING_RETURNS_WINDOW_SECONDS,
} from "../types/points";
import { generateBlogId, generateBlogLikeId, generateBlogCommentId } from "./utils/idGenerator";

/**
 * Environment variables and bindings for the Worker
 */
interface Env {
  platform_db: D1Database;
  CV_BUCKET: R2Bucket;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  JWT_SECRET: string;
}

/**
 * Custom Hono context type with auth payload
 */
type HonoContext = {
  Bindings: Env;
  Variables: {
    user: AuthPayload;
  };
};

const app = new Hono<HonoContext>();

// Apply authentication middleware to all routes
app.use(authMiddleware);

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate a unique ID (using crypto.randomUUID)
 */
function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Get current Unix timestamp in seconds
 */
function getTimestamp(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate LinkedIn URL format
 * Accepts: https://www.linkedin.com/in/username or https://linkedin.com/in/username
 */
function isValidLinkedInUrl(url: string): boolean {
  const linkedinRegex = /^https?:\/\/(www\.)?linkedin\.com\/in\/[\w-]+\/?$/;
  return linkedinRegex.test(url);
}

/**
 * Convert mentor profile with SQLite boolean integers (0/1) to JavaScript booleans
 * SQLite stores BOOLEAN as INTEGER, so we need to convert 0->false, 1->true
 * This ensures the TypeScript types match the runtime values
 */
function normalizeMentorProfile(profile: unknown): MentorProfile {
  const dbProfile = profile as Record<string, unknown>;

  // Explicitly construct the response to ensure correct types
  return {
    id: dbProfile.id as string,
    user_id: dbProfile.user_id as string,
    nick_name: dbProfile.nick_name as string,
    bio: dbProfile.bio as string,
    mentoring_levels: dbProfile.mentoring_levels as number,
    availability: (dbProfile.availability as string | null) || null,
    hourly_rate: dbProfile.hourly_rate as number | null,
    payment_types: dbProfile.payment_types as number,
    expertise_domains: dbProfile.expertise_domains as number,
    expertise_topics_preset: dbProfile.expertise_topics_preset as number,
    allow_reviews: dbProfile.allow_reviews === 1 || dbProfile.allow_reviews === true,
    allow_recording: dbProfile.allow_recording === 1 || dbProfile.allow_recording === true,
    linkedin_url: (dbProfile.linkedin_url as string | null) || null,
    created_at: dbProfile.created_at as number,
    updated_at: dbProfile.updated_at as number,
  };
}

// ============================================================================
// User Management API (/api/v1/users)
// ============================================================================

/**
 * POST /api/v1/users - Create new user
 */
app.post("/api/v1/users", async (c) => {
  try {
    const body = await c.req.json<CreateUserRequest>();

    // Validation: Required fields
    if (!body.email || !body.name) {
      return c.json({ error: "Email and name are required" }, 400);
    }

    // Validation: Email format
    if (!isValidEmail(body.email)) {
      return c.json({ error: "Invalid email format" }, 400);
    }

    // Check if email already exists
    const existing = await c.env.platform_db
      .prepare("SELECT id FROM users WHERE email = ?")
      .bind(body.email)
      .first();

    if (existing) {
      return c.json({ error: "User with this email already exists" }, 409);
    }

    // Create user
    const id = generateId();
    const timestamp = getTimestamp();

    await c.env.platform_db
      .prepare(
        "INSERT INTO users (id, email, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
      )
      .bind(id, body.email, body.name, timestamp, timestamp)
      .run();

    const user: User = {
      id,
      email: body.email,
      name: body.name,
      created_at: timestamp,
      updated_at: timestamp,
    };

    return c.json(user, 201);
  } catch {
    return c.json({ error: "Invalid request body" }, 400);
  }
});

/**
 * GET /api/v1/users - List all users (admin only)
 * Supports pagination
 */
app.get("/api/v1/users", requireAuth, requireAdmin, async (c) => {
  try {
    // Get query parameters
    const limit = c.req.query("limit") ? parseInt(c.req.query("limit") as string) : 50;
    const offset = c.req.query("offset") ? parseInt(c.req.query("offset") as string) : 0;

    // Validation: limit and offset must be valid numbers
    if (!Number.isInteger(limit) || !Number.isInteger(offset) || limit < 1 || offset < 0) {
      return c.json({ error: "limit must be a positive integer and offset must be >= 0" }, 400);
    }

    // Cap limit at 100 to prevent excessive queries
    const cappedLimit = Math.min(limit, 100);

    // Get total count
    const countResult = await c.env.platform_db
      .prepare("SELECT COUNT(*) as count FROM users")
      .first<{ count: number }>();

    const total = countResult?.count || 0;

    // Get users with their roles
    const usersResult = await c.env.platform_db
      .prepare(`
        SELECT
          u.id,
          u.email,
          u.name,
          u.google_id,
          u.cv_url,
          u.cv_filename,
          u.cv_uploaded_at,
          u.created_at,
          u.updated_at,
          ur.role
        FROM users u
        LEFT JOIN user_roles ur ON u.id = ur.user_id
        ORDER BY u.created_at DESC
        LIMIT ? OFFSET ?
      `)
      .bind(cappedLimit, offset)
      .all<User>();

    const users = usersResult.results || [];

    return c.json({
      users,
      total,
      limit: cappedLimit,
      offset,
    });
  } catch (err) {
    console.error("Error listing users:", err);
    return c.json({ error: "Failed to list users" }, 500);
  }
});

/**
 * GET /api/v1/users/:id - Get user by ID
 */
app.get("/api/v1/users/:id", async (c) => {
  const id = c.req.param("id");

  const user = await c.env.platform_db
    .prepare("SELECT * FROM users WHERE id = ?")
    .bind(id)
    .first<User>();

  if (!user) {
    return c.json({ error: "User not found" }, 404);
  }

  return c.json(user);
});

/**
 * PUT /api/v1/users/:id - Update user
 */
app.put("/api/v1/users/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json<UpdateUserRequest>();

    // Validation: At least one field must be provided
    if (!body.name && !body.email) {
      return c.json({ error: "At least one field (name or email) must be provided" }, 400);
    }

    // Validation: Email format if provided
    if (body.email && !isValidEmail(body.email)) {
      return c.json({ error: "Invalid email format" }, 400);
    }

    // Check if user exists
    const existing = await c.env.platform_db
      .prepare("SELECT * FROM users WHERE id = ?")
      .bind(id)
      .first<User>();

    if (!existing) {
      return c.json({ error: "User not found" }, 404);
    }

    // Build update query dynamically
    const updates: string[] = [];
    const params: (string | number)[] = [];

    if (body.name) {
      updates.push("name = ?");
      params.push(body.name);
    }

    if (body.email) {
      updates.push("email = ?");
      params.push(body.email);
    }

    const timestamp = getTimestamp();
    updates.push("updated_at = ?");
    params.push(timestamp);
    params.push(id); // For WHERE clause

    await c.env.platform_db
      .prepare(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`)
      .bind(...params)
      .run();

    // Fetch and return updated user
    const updated = await c.env.platform_db
      .prepare("SELECT * FROM users WHERE id = ?")
      .bind(id)
      .first<User>();

    return c.json(updated);
  } catch {
    return c.json({ error: "Invalid request body" }, 400);
  }
});

// ============================================================================
// Role Management API (/api/v1/roles)
// ============================================================================

/**
 * POST /api/v1/roles - Assign role to user (admin only)
 */
app.post("/api/v1/roles", requireAuth, requireAdmin, async (c) => {
  try {
    const body = await c.req.json<AssignRoleRequest>();

    // Validation: Required fields
    if (!body.userId || !body.role) {
      return c.json({ error: "userId and role are required" }, 400);
    }

    // Validation: Valid role value
    if (body.role !== UserRole.Admin && body.role !== UserRole.Member) {
      return c.json({ error: "Invalid role value" }, 400);
    }

    // Check if user exists
    const user = await c.env.platform_db
      .prepare("SELECT id FROM users WHERE id = ?")
      .bind(body.userId)
      .first();

    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }

    const id = generateId();
    const timestamp = getTimestamp();

    // Upsert into user_roles table
    // Try to insert, but if user_id exists, update instead
    const existing = await c.env.platform_db
      .prepare("SELECT id FROM user_roles WHERE user_id = ?")
      .bind(body.userId)
      .first();

    if (existing) {
      // Update existing role
      await c.env.platform_db
        .prepare("UPDATE user_roles SET role = ? WHERE user_id = ?")
        .bind(body.role, body.userId)
        .run();
    } else {
      // Insert new role record
      await c.env.platform_db
        .prepare("INSERT INTO user_roles (id, user_id, role, created_at) VALUES (?, ?, ?, ?)")
        .bind(id, body.userId, body.role, timestamp)
        .run();
    }

    return c.json({
      userId: body.userId,
      role: body.role,
      message: "Role assigned successfully",
    });
  } catch (err) {
    console.error("Error assigning role:", err);
    return c.json({ error: "Failed to assign role" }, 500);
  }
});

/**
 * GET /api/v1/users/:id/role - Get user's role
 */
app.get("/api/v1/users/:id/role", async (c) => {
  try {
    const userId = c.req.param("id");

    // Check if user exists
    const user = await c.env.platform_db
      .prepare("SELECT id FROM users WHERE id = ?")
      .bind(userId)
      .first();

    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }

    // Get user's role (default to member if not found)
    const roleRecord = await c.env.platform_db
      .prepare("SELECT role FROM user_roles WHERE user_id = ?")
      .bind(userId)
      .first<{ role: string }>();

    const role = roleRecord ? normalizeUserRole(roleRecord.role) : DEFAULT_ROLE;

    return c.json({
      userId,
      role,
    } as GetUserRoleResponse);
  } catch (err) {
    console.error("Error fetching user role:", err);
    return c.json({ error: "Failed to fetch user role" }, 500);
  }
});

// ============================================================================
// Feature Flags API (/api/v1/admin/features and /api/v1/features/enabled)
// ============================================================================

/**
 * GET /api/v1/admin/features - List all feature flags (admin only)
 */
app.get("/api/v1/admin/features", requireAuth, requireAdmin, async (c) => {
  try {
    const result = await c.env.platform_db
      .prepare("SELECT * FROM feature_flags ORDER BY created_at DESC")
      .all();

    const features = result.results.map((row) => normalizeFeatureFlag(row));

    return c.json(features);
  } catch (err) {
    console.error("Error fetching feature flags:", err);
    return c.json({ error: "Failed to fetch feature flags" }, 500);
  }
});

/**
 * POST /api/v1/admin/features - Create new feature flag (admin only)
 */
app.post("/api/v1/admin/features", requireAuth, requireAdmin, async (c) => {
  try {
    const body = await c.req.json<FeatureFlagCreateRequest>();

    // Validation: Required fields
    if (!body.feature_key || !body.display_name) {
      return c.json({ error: "feature_key and display_name are required" }, 400);
    }

    // Validation: Feature key format (lowercase alphanumeric with underscores)
    if (!isValidFeatureKey(body.feature_key)) {
      return c.json(
        { error: "feature_key must contain only lowercase letters, numbers, and underscores" },
        400
      );
    }

    // Check if feature_key already exists
    const existing = await c.env.platform_db
      .prepare("SELECT id FROM feature_flags WHERE feature_key = ?")
      .bind(body.feature_key)
      .first();

    if (existing) {
      return c.json({ error: "Feature key already exists" }, 409);
    }

    const id = generateId();
    const timestamp = getTimestamp();
    const enabled = body.enabled !== undefined ? (body.enabled ? 1 : 0) : 0;

    await c.env.platform_db
      .prepare(
        "INSERT INTO feature_flags (id, feature_key, display_name, description, enabled, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
      )
      .bind(
        id,
        body.feature_key,
        body.display_name,
        body.description || null,
        enabled,
        timestamp,
        timestamp
      )
      .run();

    // Fetch the created feature
    const created = await c.env.platform_db
      .prepare("SELECT * FROM feature_flags WHERE id = ?")
      .bind(id)
      .first();

    return c.json(normalizeFeatureFlag(created), 201);
  } catch (err) {
    console.error("Error creating feature flag:", err);
    return c.json({ error: "Failed to create feature flag" }, 500);
  }
});

/**
 * PATCH /api/v1/admin/features/:id - Toggle feature flag (admin only)
 */
app.patch("/api/v1/admin/features/:id", requireAuth, requireAdmin, async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json<FeatureFlagUpdateRequest>();

    // Validation: Required field
    if (body.enabled === undefined) {
      return c.json({ error: "enabled field is required" }, 400);
    }

    // Check if feature exists
    const existing = await c.env.platform_db
      .prepare("SELECT * FROM feature_flags WHERE id = ?")
      .bind(id)
      .first();

    if (!existing) {
      return c.json({ error: "Feature flag not found" }, 404);
    }

    const timestamp = getTimestamp();
    const enabled = body.enabled ? 1 : 0;

    await c.env.platform_db
      .prepare("UPDATE feature_flags SET enabled = ?, updated_at = ? WHERE id = ?")
      .bind(enabled, timestamp, id)
      .run();

    // Fetch the updated feature
    const updated = await c.env.platform_db
      .prepare("SELECT * FROM feature_flags WHERE id = ?")
      .bind(id)
      .first();

    return c.json(normalizeFeatureFlag(updated));
  } catch (err) {
    console.error("Error updating feature flag:", err);
    return c.json({ error: "Failed to update feature flag" }, 500);
  }
});

/**
 * DELETE /api/v1/admin/features/:id - Delete feature flag (admin only)
 */
app.delete("/api/v1/admin/features/:id", requireAuth, requireAdmin, async (c) => {
  try {
    const id = c.req.param("id");

    // Check if feature exists
    const existing = await c.env.platform_db
      .prepare("SELECT id FROM feature_flags WHERE id = ?")
      .bind(id)
      .first();

    if (!existing) {
      return c.json({ error: "Feature flag not found" }, 404);
    }

    await c.env.platform_db
      .prepare("DELETE FROM feature_flags WHERE id = ?")
      .bind(id)
      .run();

    return c.body(null, 204);
  } catch (err) {
    console.error("Error deleting feature flag:", err);
    return c.json({ error: "Failed to delete feature flag" }, 500);
  }
});

/**
 * GET /api/v1/features/enabled - Get enabled features (public endpoint)
 * Returns a map of feature keys to boolean values
 */
app.get("/api/v1/features/enabled", async (c) => {
  try {
    const result = await c.env.platform_db
      .prepare("SELECT feature_key FROM feature_flags WHERE enabled = 1")
      .all();

    const enabledFeatures: EnabledFeatures = {};
    for (const row of result.results) {
      const featureKey = (row as { feature_key: string }).feature_key;
      enabledFeatures[featureKey] = true;
    }

    return c.json(enabledFeatures);
  } catch (err) {
    console.error("Error fetching enabled features:", err);
    return c.json({ error: "Failed to fetch enabled features" }, 500);
  }
});

// ============================================================================
// Points System API (/api/v1/users/:id/points)
// ============================================================================

/**
 * Helper function to calculate user rank in leaderboard
 * @param db - Database instance
 * @param userId - User ID to get rank for
 * @returns User's rank (1-indexed) or null if user not found
 */
async function getUserRank(db: D1Database, userId: string): Promise<number | null> {
  try {
    const result = await db.prepare(`
      SELECT COUNT(*) as count
      FROM (
        SELECT RANK() OVER (ORDER BY points DESC) as rank
        FROM user_points
      ) as ranked
      WHERE rank <= (
        SELECT RANK() OVER (ORDER BY points DESC)
        FROM user_points
        WHERE user_id = ?
      )
    `).bind(userId).first<{ count: number }>();

    return result ? result.count : null;
  } catch (err) {
    console.error("Error calculating rank:", err);
    return null;
  }
}

/**
 * Award points to a user for a specific action with diminishing returns
 * Applies anti-spam logic based on action type and recent activity
 * @param db - Database instance
 * @param userId - User ID to award points to
 * @param actionType - Type of action (e.g., 'like_received', 'comment_created')
 * @param referenceId - ID of the referenced content (post/comment/like)
 * @param basePoints - Base points before diminishing returns calculation
 * @returns Actual points awarded (may be reduced by diminishing returns)
 */
async function awardPointsForAction(
  db: D1Database,
  userId: string,
  actionType: string,
  referenceId: string,
  basePoints: number
): Promise<number> {
  try {
    // Silently return 0 for non-positive base points
    if (basePoints <= 0) {
      return 0;
    }

    const now = getTimestamp();
    const windowStart = now - DIMINISHING_RETURNS_WINDOW_SECONDS;

    // Count recent actions of the same type in the time window
    const recentActionsResult = await db.prepare(`
      SELECT COUNT(*) as count
      FROM point_actions_log
      WHERE user_id = ? AND action_type = ? AND created_at >= ?
    `).bind(userId, actionType, windowStart).first<{ count: number }>();

    const recentActionCount = recentActionsResult?.count || 0;

    // Calculate adjusted points based on diminishing returns thresholds
    let adjustedPoints = basePoints;

    if (actionType === 'like_received') {
      if (recentActionCount >= LIKES_RECEIVED_REDUCED_POINTS_THRESHOLD) {
        adjustedPoints = 0; // Over threshold, no points
      } else if (recentActionCount >= LIKES_RECEIVED_FULL_POINTS_THRESHOLD) {
        adjustedPoints = Math.floor(basePoints * LIKES_RECEIVED_REDUCED_MULTIPLIER);
      }
    } else if (actionType === 'comment_created') {
      if (recentActionCount >= COMMENTS_CREATED_REDUCED_POINTS_THRESHOLD) {
        adjustedPoints = 0; // Over threshold, no points
      } else if (recentActionCount >= COMMENTS_CREATED_FULL_POINTS_THRESHOLD) {
        adjustedPoints = Math.floor(basePoints * COMMENTS_CREATED_REDUCED_MULTIPLIER);
      }
    } else if (actionType === 'post_created') {
      if (recentActionCount >= POSTS_CREATED_REDUCED_POINTS_THRESHOLD) {
        adjustedPoints = 0; // Over threshold, no points
      } else if (recentActionCount >= POSTS_CREATED_FULL_POINTS_THRESHOLD) {
        adjustedPoints = Math.floor(basePoints * POSTS_CREATED_REDUCED_MULTIPLIER);
      }
    } else if (actionType === 'blog_created') {
      if (recentActionCount >= BLOGS_CREATED_REDUCED_POINTS_THRESHOLD) {
        adjustedPoints = 0; // Over threshold, no points
      } else if (recentActionCount >= BLOGS_CREATED_FULL_POINTS_THRESHOLD) {
        adjustedPoints = Math.floor(basePoints * BLOGS_CREATED_REDUCED_MULTIPLIER);
      }
    }

    // If no points to award, still log the action but return 0
    if (adjustedPoints === 0) {
      const logId = generateId();
      await db.prepare(`
        INSERT INTO point_actions_log (id, user_id, action_type, reference_id, points_awarded, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(logId, userId, actionType, referenceId, 0, now).run();
      return 0;
    }

    // Update user points (increment by adjusted amount)
    // First, fetch current points
    const pointsRecord = await db.prepare(`
      SELECT id, points FROM user_points WHERE user_id = ?
    `).bind(userId).first<{ id: string; points: number }>();

    const timestamp = getTimestamp();

    if (pointsRecord) {
      // Update existing points record
      const newPoints = Math.min(
        pointsRecord.points + adjustedPoints,
        999999 // Cap at reasonable max
      );
      await db.prepare(`
        UPDATE user_points SET points = ?, updated_at = ? WHERE user_id = ?
      `).bind(newPoints, timestamp, userId).run();
    } else {
      // Create new points record
      const id = generateId();
      const newPoints = Math.min(adjustedPoints, 999999);
      await db.prepare(`
        INSERT INTO user_points (id, user_id, points, updated_at)
        VALUES (?, ?, ?, ?)
      `).bind(id, userId, newPoints, timestamp).run();
    }

    // Log the action
    const logId = generateId();
    await db.prepare(`
      INSERT INTO point_actions_log (id, user_id, action_type, reference_id, points_awarded, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(logId, userId, actionType, referenceId, adjustedPoints, now).run();

    return adjustedPoints;
  } catch (err) {
    console.error("Error awarding points for action:", err);
    // Silently fail to avoid blocking user actions
    return 0;
  }
}

/**
 * GET /api/v1/users/:id/points - Get user points and rank
 * Public endpoint - anyone can view user points and rank
 */
app.get("/api/v1/users/:id/points", async (c) => {
  try {
    const userId = c.req.param("id");

    // Check if user exists
    const user = await c.env.platform_db
      .prepare("SELECT id FROM users WHERE id = ?")
      .bind(userId)
      .first();

    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }

    // Get user points (or create if doesn't exist)
    let pointsRecord = await c.env.platform_db
      .prepare("SELECT * FROM user_points WHERE user_id = ?")
      .bind(userId)
      .first<Record<string, unknown>>();

    // If no points record exists, initialize it
    if (!pointsRecord) {
      const id = generateId();
      const timestamp = getTimestamp();

      await c.env.platform_db
        .prepare("INSERT INTO user_points (id, user_id, points, updated_at) VALUES (?, ?, ?, ?)")
        .bind(id, userId, INITIAL_POINTS, timestamp)
        .run();

      pointsRecord = {
        id,
        user_id: userId,
        points: INITIAL_POINTS,
        updated_at: timestamp,
      };
    }

    // Calculate rank
    const rank = await getUserRank(c.env.platform_db, userId);

    const response = normalizeUserPointsWithRank(pointsRecord, rank ?? undefined);
    return c.json<GetUserPointsResponse>(response);
  } catch (err) {
    console.error("Error fetching user points:", err);
    return c.json({ error: "Failed to fetch user points" }, 500);
  }
});

/**
 * PATCH /api/v1/users/:id/points - Update user points (admin only)
 * Internal endpoint for awarding or adjusting points
 */
app.patch("/api/v1/users/:id/points", requireAuth, requireAdmin, async (c) => {
  try {
    const userId = c.req.param("id");
    const body = await c.req.json<UpdateUserPointsRequest>();

    // Validation: points field required
    if (body.points === undefined) {
      return c.json({ error: "points field is required" }, 400);
    }

    // Validation: points must be a non-negative integer
    if (!Number.isInteger(body.points) || body.points < 0) {
      return c.json({ error: "points must be a non-negative integer" }, 400);
    }

    // Check if user exists
    const user = await c.env.platform_db
      .prepare("SELECT id FROM users WHERE id = ?")
      .bind(userId)
      .first();

    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }

    const timestamp = getTimestamp();

    // Get current points record
    const pointsRecord = await c.env.platform_db
      .prepare("SELECT id FROM user_points WHERE user_id = ?")
      .bind(userId)
      .first<{ id: string }>();

    if (pointsRecord) {
      // Update existing record
      await c.env.platform_db
        .prepare("UPDATE user_points SET points = ?, updated_at = ? WHERE user_id = ?")
        .bind(body.points, timestamp, userId)
        .run();
    } else {
      // Create new record
      const id = generateId();
      await c.env.platform_db
        .prepare("INSERT INTO user_points (id, user_id, points, updated_at) VALUES (?, ?, ?, ?)")
        .bind(id, userId, body.points, timestamp)
        .run();
    }

    // Fetch updated record and calculate rank
    const updated = await c.env.platform_db
      .prepare("SELECT * FROM user_points WHERE user_id = ?")
      .bind(userId)
      .first<Record<string, unknown>>();

    const rank = await getUserRank(c.env.platform_db, userId);

    const response = normalizeUserPointsWithRank(updated, rank ?? undefined);
    return c.json<GetUserPointsResponse>(response);
  } catch (err) {
    console.error("Error updating user points:", err);
    return c.json({ error: "Failed to update user points" }, 500);
  }
});

/**
 * GET /api/v1/leaderboard - Get leaderboard with users sorted by points
 * Public endpoint - anyone can view the leaderboard
 */
app.get("/api/v1/leaderboard", async (c) => {
  try {
    // Get query parameters
    const limit = c.req.query("limit") ? parseInt(c.req.query("limit") as string) : 50;
    const offset = c.req.query("offset") ? parseInt(c.req.query("offset") as string) : 0;

    // Validation: limit and offset must be valid numbers
    if (!Number.isInteger(limit) || !Number.isInteger(offset) || limit < 1 || offset < 0) {
      return c.json({ error: "limit must be a positive integer and offset must be >= 0" }, 400);
    }

    // Cap limit at 100 to prevent excessive queries
    const cappedLimit = Math.min(limit, 100);

    // Get total count of users with points
    const countResult = await c.env.platform_db
      .prepare("SELECT COUNT(*) as count FROM user_points")
      .first<{ count: number }>();

    const total = countResult?.count || 0;

    // Get leaderboard: users with points, joined with user names, ranked
    const leaderboardResult = await c.env.platform_db
      .prepare(`
        SELECT
          up.user_id,
          u.name,
          up.points,
          RANK() OVER (ORDER BY up.points DESC) as rank
        FROM user_points up
        JOIN users u ON up.user_id = u.id
        ORDER BY up.points DESC
        LIMIT ? OFFSET ?
      `)
      .bind(cappedLimit, offset)
      .all<{
        user_id: string;
        name: string;
        points: number;
        rank: number;
      }>();

    const users = (leaderboardResult.results || []).map((row) => ({
      user_id: row.user_id,
      name: row.name,
      points: row.points,
      rank: row.rank,
    }));

    return c.json({
      users,
      total,
      limit: cappedLimit,
      offset,
    });
  } catch (err) {
    console.error("Error fetching leaderboard:", err);
    return c.json({ error: "Failed to fetch leaderboard" }, 500);
  }
});

// ============================================================================
// CV Management API (/api/v1/users/:userId/cv)
// ============================================================================

/**
 * POST /api/v1/users/:userId/cv - Upload user CV to R2
 * Accepts PDF files only, max 5MB
 */
app.post("/api/v1/users/:userId/cv", requireAuth, async (c) => {
  try {
    const userId = c.req.param("userId");
    const formData = await c.req.formData();
    const file = formData.get("file");

    // Validate file exists
    if (!file || !(file instanceof File)) {
      return c.json({ error: "No file provided" }, 400);
    }

    // Validate file type (PDF only)
    if (file.type !== "application/pdf") {
      return c.json({ error: "Only PDF files are allowed" }, 400);
    }

    // Validate file size (max 5MB)
    const MAX_FILE_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      return c.json({ error: "File size must be less than 5MB" }, 400);
    }

    // Generate unique filename: userId-timestamp.pdf
    const timestamp = Date.now();
    const filename = `${userId}-${timestamp}.pdf`;

    // Upload to R2
    const arrayBuffer = await file.arrayBuffer();
    await c.env.CV_BUCKET.put(filename, arrayBuffer, {
      httpMetadata: {
        contentType: "application/pdf",
        contentDisposition: `attachment; filename="${file.name}"`,
      },
      customMetadata: {
        uploadedBy: userId,
        originalName: file.name,
      },
    });

    // Update user record with CV info
    const cvUploadedAt = getTimestamp();
    await c.env.platform_db
      .prepare(
        `UPDATE users SET cv_url = ?, cv_filename = ?, cv_uploaded_at = ?, updated_at = ?
         WHERE id = ?`
      )
      .bind(filename, file.name, cvUploadedAt, cvUploadedAt, userId)
      .run();

    // Return success with file info
    return c.json({
      success: true,
      filename: file.name,
      originalFilename: file.name,
      uploadedAt: cvUploadedAt,
      message: "CV uploaded successfully",
    }, 201);
  } catch (error) {
    console.error("CV upload error:", error);
    return c.json({ error: "Failed to upload CV" }, 500);
  }
});

/**
 * GET /api/v1/users/:userId/cv - Get user CV metadata
 * Returns CV metadata including filename and upload timestamp
 */
app.get("/api/v1/users/:userId/cv", requireAuth, async (c) => {
  try {
    const userId = c.req.param("userId");

    const user = await c.env.platform_db
      .prepare(`SELECT cv_url, cv_filename, cv_uploaded_at FROM users WHERE id = ?`)
      .bind(userId)
      .first<{ cv_url: string | null; cv_filename: string | null; cv_uploaded_at: number | null }>();

    if (!user || !user.cv_url) {
      return c.json({ error: "No CV found" }, 404);
    }

    return c.json({
      cv_filename: user.cv_filename,
      cv_uploaded_at: user.cv_uploaded_at,
    });
  } catch (error) {
    console.error("CV fetch error:", error);
    return c.json({ error: "Failed to fetch CV" }, 500);
  }
});

/**
 * DELETE /api/v1/users/:userId/cv - Delete user CV
 */
app.delete("/api/v1/users/:userId/cv", requireAuth, async (c) => {
  try {
    const userId = c.req.param("userId");

    // Get current CV filename
    const user = await c.env.platform_db
      .prepare(`SELECT cv_url FROM users WHERE id = ?`)
      .bind(userId)
      .first<{ cv_url: string | null }>();

    if (!user || !user.cv_url) {
      return c.json({ error: "No CV found" }, 404);
    }

    // Delete from R2
    await c.env.CV_BUCKET.delete(user.cv_url);

    // Clear CV fields from user record
    await c.env.platform_db
      .prepare(
        `UPDATE users SET cv_url = NULL, cv_filename = NULL, cv_uploaded_at = NULL, updated_at = ?
         WHERE id = ?`
      )
      .bind(getTimestamp(), userId)
      .run();

    return c.json({ success: true, message: "CV deleted successfully" });
  } catch (error) {
    console.error("CV deletion error:", error);
    return c.json({ error: "Failed to delete CV" }, 500);
  }
});

// ============================================================================
// Mentor Profile Management API (/api/v1/mentors/profiles)
// ============================================================================

/**
 * POST /api/v1/mentors/profiles - Create mentor profile
 */
app.post("/api/v1/mentors/profiles", requireAuth, async (c) => {
  try {
    const body = await c.req.json<CreateMentorProfileRequest>();

    // Get authenticated user
    const authUser = c.get('user') as AuthPayload;

    // Validation: Required fields
    if (!body.user_id || !body.nick_name || !body.bio ||
        body.mentoring_levels === undefined || body.payment_types === undefined) {
      return c.json({ error: "user_id, nick_name, bio, mentoring_levels, and payment_types are required" }, 400);
    }

    // Authorization: Users can only create profiles for themselves
    if (body.user_id !== authUser.userId) {
      return c.json({ error: "Cannot create mentor profile for another user" }, 403);
    }

    // Validation: Bit flags must be non-negative integers
    if (body.mentoring_levels < 0 || body.payment_types < 0) {
      return c.json({ error: "Bit flags must be non-negative integers" }, 400);
    }

    // Validation: LinkedIn URL format if provided
    if (body.linkedin_url && !isValidLinkedInUrl(body.linkedin_url)) {
      return c.json({ error: "Invalid LinkedIn URL format. Must be https://www.linkedin.com/in/username or https://linkedin.com/in/username" }, 400);
    }

    // Set default values for expertise fields if not provided
    const expertise_domains = body.expertise_domains !== undefined ? body.expertise_domains : 0;
    const expertise_topics_preset = body.expertise_topics_preset !== undefined ? body.expertise_topics_preset : 0;

    // Validation: Expertise bit flags must be non-negative if provided
    if (expertise_domains < 0 || expertise_topics_preset < 0) {
      return c.json({ error: "Expertise bit flags must be non-negative integers" }, 400);
    }

    // Check if user exists
    const userExists = await c.env.platform_db
      .prepare("SELECT id FROM users WHERE id = ?")
      .bind(body.user_id)
      .first();

    if (!userExists) {
      return c.json({ error: "User not found" }, 400);
    }

    // Check if nickname already exists
    const nicknameExists = await c.env.platform_db
      .prepare("SELECT id FROM mentor_profiles WHERE nick_name = ?")
      .bind(body.nick_name)
      .first();

    if (nicknameExists) {
      return c.json({ error: "Mentor with this nickname already exists" }, 409);
    }

    // Check if user already has a mentor profile
    const profileExists = await c.env.platform_db
      .prepare("SELECT id FROM mentor_profiles WHERE user_id = ?")
      .bind(body.user_id)
      .first();

    if (profileExists) {
      return c.json({ error: "User already has a mentor profile" }, 409);
    }

    // Create mentor profile
    const id = generateId();
    const timestamp = getTimestamp();

    await c.env.platform_db
      .prepare(
        `INSERT INTO mentor_profiles (
          id, user_id, nick_name, bio, mentoring_levels, availability,
          hourly_rate, payment_types, expertise_domains, expertise_topics_preset,
          allow_reviews, allow_recording, linkedin_url, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        id,
        body.user_id,
        body.nick_name,
        body.bio,
        body.mentoring_levels,
        body.availability !== undefined ? body.availability : null,
        body.hourly_rate !== undefined ? body.hourly_rate : null,
        body.payment_types,
        expertise_domains,
        expertise_topics_preset,
        body.allow_reviews !== undefined ? body.allow_reviews : true,
        body.allow_recording !== undefined ? body.allow_recording : true,
        body.linkedin_url !== undefined ? body.linkedin_url : null,
        timestamp,
        timestamp
      )
      .run();

    const profile: MentorProfile = {
      id,
      user_id: body.user_id,
      nick_name: body.nick_name,
      bio: body.bio,
      mentoring_levels: body.mentoring_levels,
      availability: body.availability !== undefined ? body.availability : null,
      hourly_rate: body.hourly_rate !== undefined ? body.hourly_rate : null,
      payment_types: body.payment_types,
      expertise_domains,
      expertise_topics_preset,
      allow_reviews: body.allow_reviews !== undefined ? body.allow_reviews : true,
      allow_recording: body.allow_recording !== undefined ? body.allow_recording : true,
      linkedin_url: body.linkedin_url !== undefined ? body.linkedin_url : null,
      created_at: timestamp,
      updated_at: timestamp,
    };

    return c.json<MentorProfile>(profile, 201);
  } catch {
    return c.json({ error: "Invalid request body" }, 400);
  }
});

/**
 * GET /api/v1/mentors/profiles/by-user/:userId - Get mentor profile by user ID (requires authentication)
 */
app.get("/api/v1/mentors/profiles/by-user/:userId", requireAuth, async (c) => {
  const userId = c.req.param("userId");

  const profile = await c.env.platform_db
    .prepare("SELECT * FROM mentor_profiles WHERE user_id = ?")
    .bind(userId)
    .first<MentorProfile>();

  if (!profile) {
    return c.json({ error: "Mentor profile not found" }, 404);
  }

  return c.json<MentorProfile>(normalizeMentorProfile(profile));
});

/**
 * GET /api/v1/mentors/profiles/:id - Get mentor profile by ID (requires authentication)
 */
app.get("/api/v1/mentors/profiles/:id", requireAuth, async (c) => {
  const id = c.req.param("id");

  const profile = await c.env.platform_db
    .prepare("SELECT * FROM mentor_profiles WHERE id = ?")
    .bind(id)
    .first<MentorProfile>();

  if (!profile) {
    return c.json({ error: "Mentor profile not found" }, 404);
  }

  return c.json<MentorProfile>(normalizeMentorProfile(profile));
});

/**
 * PUT /api/v1/mentors/profiles/:id - Update mentor profile
 */
app.put("/api/v1/mentors/profiles/:id", requireAuth, async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json<UpdateMentorProfileRequest>();

    // Get authenticated user
    const authUser = c.get('user') as AuthPayload;

    // Validation: At least one field must be provided
    const hasUpdates = body.nick_name || body.bio || body.mentoring_levels !== undefined ||
                       body.availability !== undefined || body.hourly_rate !== undefined ||
                       body.payment_types !== undefined || body.expertise_domains !== undefined ||
                       body.expertise_topics_preset !== undefined ||
                       body.allow_reviews !== undefined || body.allow_recording !== undefined ||
                       body.linkedin_url !== undefined;

    if (!hasUpdates) {
      return c.json({ error: "At least one field must be provided for update" }, 400);
    }

    // Validation: Bit flags must be non-negative if provided
    if ((body.mentoring_levels !== undefined && body.mentoring_levels < 0) ||
        (body.payment_types !== undefined && body.payment_types < 0) ||
        (body.expertise_domains !== undefined && body.expertise_domains < 0) ||
        (body.expertise_topics_preset !== undefined && body.expertise_topics_preset < 0)) {
      return c.json({ error: "Bit flags must be non-negative integers" }, 400);
    }

    // Validation: LinkedIn URL format if provided
    if (body.linkedin_url !== undefined && body.linkedin_url !== null && !isValidLinkedInUrl(body.linkedin_url)) {
      return c.json({ error: "Invalid LinkedIn URL format. Must be https://www.linkedin.com/in/username or https://linkedin.com/in/username" }, 400);
    }

    // Check if profile exists
    const existing = await c.env.platform_db
      .prepare("SELECT * FROM mentor_profiles WHERE id = ?")
      .bind(id)
      .first<MentorProfile>();

    if (!existing) {
      return c.json({ error: "Mentor profile not found" }, 404);
    }

    // Authorization: Users can only update their own profiles
    if (existing.user_id !== authUser.userId) {
      return c.json({ error: "Cannot update another user's mentor profile" }, 403);
    }

    // If nickname is being changed, check for duplicates
    if (body.nick_name !== undefined && body.nick_name !== existing.nick_name) {
      const nicknameExists = await c.env.platform_db
        .prepare("SELECT id FROM mentor_profiles WHERE nick_name = ? AND id != ?")
        .bind(body.nick_name, id)
        .first();

      if (nicknameExists) {
        return c.json({ error: "Mentor with this nickname already exists" }, 409);
      }
    }

    // Build update query dynamically
    const updates: string[] = [];
    const params: (string | number | boolean | null)[] = [];

    if (body.nick_name !== undefined) {
      updates.push("nick_name = ?");
      params.push(body.nick_name);
    }
    if (body.bio !== undefined) {
      updates.push("bio = ?");
      params.push(body.bio);
    }
    if (body.mentoring_levels !== undefined) {
      updates.push("mentoring_levels = ?");
      params.push(body.mentoring_levels);
    }
    if (body.availability !== undefined) {
      updates.push("availability = ?");
      params.push(body.availability);
    }
    if (body.hourly_rate !== undefined) {
      updates.push("hourly_rate = ?");
      params.push(body.hourly_rate);
    }
    if (body.payment_types !== undefined) {
      updates.push("payment_types = ?");
      params.push(body.payment_types);
    }
    if (body.expertise_domains !== undefined) {
      updates.push("expertise_domains = ?");
      params.push(body.expertise_domains);
    }
    if (body.expertise_topics_preset !== undefined) {
      updates.push("expertise_topics_preset = ?");
      params.push(body.expertise_topics_preset);
    }
    if (body.allow_reviews !== undefined) {
      updates.push("allow_reviews = ?");
      params.push(body.allow_reviews);
    }
    if (body.allow_recording !== undefined) {
      updates.push("allow_recording = ?");
      params.push(body.allow_recording);
    }
    if (body.linkedin_url !== undefined) {
      updates.push("linkedin_url = ?");
      params.push(body.linkedin_url);
    }

    const timestamp = getTimestamp();
    updates.push("updated_at = ?");
    params.push(timestamp);
    params.push(id); // For WHERE clause

    await c.env.platform_db
      .prepare(`UPDATE mentor_profiles SET ${updates.join(", ")} WHERE id = ?`)
      .bind(...params)
      .run();

    // Fetch and return updated profile
    const updated = await c.env.platform_db
      .prepare("SELECT * FROM mentor_profiles WHERE id = ?")
      .bind(id)
      .first<MentorProfile>();

    if (!updated) {
      return c.json({ error: "Mentor profile not found" }, 404);
    }

    return c.json<MentorProfile>(normalizeMentorProfile(updated));
  } catch {
    return c.json({ error: "Invalid request body" }, 400);
  }
});

/**
 * DELETE /api/v1/mentors/profiles/:id - Delete mentor profile
 */
app.delete("/api/v1/mentors/profiles/:id", requireAuth, async (c) => {
  const id = c.req.param("id");

  // Get authenticated user
  const authUser = c.get('user') as AuthPayload;

  // Check if profile exists
  const existing = await c.env.platform_db
    .prepare("SELECT * FROM mentor_profiles WHERE id = ?")
    .bind(id)
    .first<MentorProfile>();

  if (!existing) {
    return c.json({ error: "Mentor profile not found" }, 404);
  }

  // Authorization: Users can only delete their own profiles
  if (existing.user_id !== authUser.userId) {
    return c.json({ error: "Cannot delete another user's mentor profile" }, 403);
  }

  // Delete the profile
  await c.env.platform_db
    .prepare("DELETE FROM mentor_profiles WHERE id = ?")
    .bind(id)
    .run();

  return c.json({ success: true });
});

// ============================================================================
// Search & Discovery API (/api/v1/mentors/search)
// ============================================================================

/**
 * GET /api/v1/mentors/search - Search and filter mentor profiles
 * Query parameters:
 * - mentoring_levels: bit flags (e.g., 3 = Entry OR Senior)
 * - payment_types: bit flags (e.g., 1 = Venmo)
 * - expertise_domains: bit flags for professional domains
 * - expertise_topics: bit flags for preset expertise topics
 * - hourly_rate_max: maximum hourly rate
 * - hourly_rate_min: minimum hourly rate
 * - nick_name: partial nickname search (case-insensitive)
 * - limit: results per page (default: 20, max: 100)
 * - offset: pagination offset (default: 0)
 *
 * Note: This endpoint requires authentication
 */
app.get("/api/v1/mentors/search", requireAuth, async (c) => {
  try {
    // Parse query parameters
    const url = new URL(c.req.url);
    const mentoring_levels = url.searchParams.get("mentoring_levels");
    const payment_types = url.searchParams.get("payment_types");
    const expertise_domains = url.searchParams.get("expertise_domains");
    const expertise_topics = url.searchParams.get("expertise_topics");
    const hourly_rate_max = url.searchParams.get("hourly_rate_max");
    const hourly_rate_min = url.searchParams.get("hourly_rate_min");
    const nick_name = url.searchParams.get("nick_name");
    const limitParam = url.searchParams.get("limit");
    const offsetParam = url.searchParams.get("offset");

    // Parse and validate limit and offset
    const limit = limitParam ? parseInt(limitParam, 10) : 20;
    const offset = offsetParam ? parseInt(offsetParam, 10) : 0;

    // Validation: limit and offset must be non-negative
    if (limit < 0 || offset < 0) {
      return c.json({ error: "Limit and offset must be non-negative integers" }, 400);
    }

    // Validation: limit must not exceed maximum
    if (limit > 100) {
      return c.json({ error: "Limit must not exceed 100" }, 400);
    }

    // Validation: numeric parameters must be valid numbers
    if (mentoring_levels && isNaN(parseInt(mentoring_levels, 10))) {
      return c.json({ error: "mentoring_levels must be a valid integer" }, 400);
    }
    if (payment_types && isNaN(parseInt(payment_types, 10))) {
      return c.json({ error: "payment_types must be a valid integer" }, 400);
    }
    if (expertise_domains && isNaN(parseInt(expertise_domains, 10))) {
      return c.json({ error: "expertise_domains must be a valid integer" }, 400);
    }
    if (expertise_topics && isNaN(parseInt(expertise_topics, 10))) {
      return c.json({ error: "expertise_topics must be a valid integer" }, 400);
    }
    if (hourly_rate_max && isNaN(parseInt(hourly_rate_max, 10))) {
      return c.json({ error: "hourly_rate_max must be a valid number" }, 400);
    }
    if (hourly_rate_min && isNaN(parseInt(hourly_rate_min, 10))) {
      return c.json({ error: "hourly_rate_min must be a valid number" }, 400);
    }

    // Build WHERE clause dynamically
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (mentoring_levels) {
      const levels = parseInt(mentoring_levels, 10);
      conditions.push("mentoring_levels & ? > 0");
      params.push(levels);
    }

    if (payment_types) {
      const types = parseInt(payment_types, 10);
      conditions.push("payment_types & ? > 0");
      params.push(types);
    }

    if (expertise_domains) {
      const domains = parseInt(expertise_domains, 10);
      conditions.push("expertise_domains & ? > 0");
      params.push(domains);
    }

    if (expertise_topics) {
      const topics = parseInt(expertise_topics, 10);
      conditions.push("expertise_topics_preset & ? > 0");
      params.push(topics);
    }

    if (hourly_rate_max) {
      const max = parseInt(hourly_rate_max, 10);
      conditions.push("hourly_rate <= ?");
      params.push(max);
    }

    if (hourly_rate_min) {
      const min = parseInt(hourly_rate_min, 10);
      conditions.push("hourly_rate >= ?");
      params.push(min);
    }

    if (nick_name) {
      conditions.push("nick_name LIKE ?");
      params.push(`%${nick_name}%`);
    }

    // Build WHERE clause
    const whereClause = conditions.length > 0
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM mentor_profiles ${whereClause}`;
    const countResult = await c.env.platform_db
      .prepare(countQuery)
      .bind(...params)
      .first<{ 'COUNT(*)': number }>();

    const total = countResult?.['COUNT(*)'] || 0;

    // Get paginated results
    const selectQuery = `
      SELECT * FROM mentor_profiles
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;

    const results = await c.env.platform_db
      .prepare(selectQuery)
      .bind(...params, limit, offset)
      .all<MentorProfile>();

    const response: SearchMentorsResponse = {
      mentors: (results.results || []).map(normalizeMentorProfile),
      total,
      limit,
      offset,
    };

    return c.json<SearchMentorsResponse>(response);
  } catch (err) {
    console.error("Search error:", err);
    return c.json({ error: "Invalid request", details: err instanceof Error ? err.message : String(err) }, 400);
  }
});

// ============================================================================
// Match Management API (/api/v1/matches)
// ============================================================================

/**
 * POST /api/v1/matches - Create match request (mentee-initiated)
 */
app.post("/api/v1/matches", requireAuth, async (c) => {
  try {
    const body = await c.req.json<CreateMatchRequest>();

    // Validation: Required fields
    if (!body.mentor_id) {
      return c.json({ error: "mentor_id is required" }, 400);
    }
    if (!body.introduction) {
      return c.json({ error: "introduction is required" }, 400);
    }
    if (!body.preferred_time) {
      return c.json({ error: "preferred_time is required" }, 400);
    }

    // Check if mentor user exists
    const mentorUser = await c.env.platform_db
      .prepare("SELECT id FROM users WHERE id = ?")
      .bind(body.mentor_id)
      .first();

    if (!mentorUser) {
      return c.json({ error: "Mentor user not found" }, 400);
    }

    // Check if mentor profile exists
    const mentorProfile = await c.env.platform_db
      .prepare("SELECT id FROM mentor_profiles WHERE user_id = ?")
      .bind(body.mentor_id)
      .first();

    if (!mentorProfile) {
      return c.json({ error: "Mentor mentor profile not found" }, 400);
    }

    // Get current user (mentee) from JWT authentication
    const user = c.get('user') as AuthPayload;
    const menteeId = user.userId;

    // Check if mentee tries to match with themselves
    if (body.mentor_id === menteeId) {
      return c.json({ error: "Cannot match with themselves" }, 400);
    }

    // Check if duplicate match already exists
    const existingMatch = await c.env.platform_db
      .prepare("SELECT id FROM matches WHERE mentor_id = ? AND mentee_id = ?")
      .bind(body.mentor_id, menteeId)
      .first();

    if (existingMatch) {
      return c.json({ error: "Duplicate match already exists" }, 409);
    }

    // Validate that mentee has uploaded CV (CV is mandatory)
    const menteeUser = await c.env.platform_db
      .prepare("SELECT cv_url FROM users WHERE id = ?")
      .bind(menteeId)
      .first<{ cv_url: string | null }>();

    if (!menteeUser?.cv_url) {
      return c.json({ error: "CV is required to send mentorship request" }, 400);
    }

    // Create match
    const matchId = generateId();
    const timestamp = getTimestamp();
    const cvIncluded = 1; // Always 1 since CV is mandatory

    await c.env.platform_db
      .prepare(
        "INSERT INTO matches (id, mentor_id, mentee_id, status, introduction, preferred_time, cv_included, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
      )
      .bind(matchId, body.mentor_id, menteeId, "pending", body.introduction, body.preferred_time, cvIncluded, timestamp, timestamp)
      .run();

    const match: Match = {
      id: matchId,
      mentor_id: body.mentor_id,
      mentee_id: menteeId,
      status: "pending",
      introduction: body.introduction,
      preferred_time: body.preferred_time,
      cv_included: cvIncluded,
      created_at: timestamp,
      updated_at: timestamp,
    };

    return c.json<Match>(match, 201);
  } catch {
    return c.json({ error: "Invalid request body" }, 400);
  }
});

/**
 * GET /api/v1/matches/check/:mentorId - Check if match exists between current user (mentee) and mentor
 * Returns the existing match status, or 404 if no match exists
 */
app.get("/api/v1/matches/check/:mentorId", requireAuth, async (c) => {
  try {
    const mentorId = c.req.param("mentorId");
    const user = c.get('user') as AuthPayload;
    const menteeId = user.userId;

    // Check for any non-rejected match between mentee and mentor
    const result = await c.env.platform_db
      .prepare(
        `SELECT id, status FROM matches
         WHERE mentee_id = ? AND mentor_id = ? AND status != 'rejected'
         LIMIT 1`
      )
      .bind(menteeId, mentorId)
      .first<{ id: string; status: string }>();

    if (!result) {
      return c.json({ exists: false }, 404);
    }

    return c.json({
      exists: true,
      matchId: result.id,
      status: result.status,
    });
  } catch {
    return c.json({ error: "Invalid request" }, 400);
  }
});

/**
 * GET /api/v1/matches - List matches for user (mentor or mentee)
 */
app.get("/api/v1/matches", requireAuth, async (c) => {
  try {
    // Get current user from JWT authentication
    const user = c.get('user') as AuthPayload;
    const userId = user.userId;

    const statusParam = c.req.query("status");
    const roleParam = c.req.query("role");

    // Validate status if provided
    if (statusParam && !["pending", "accepted", "rejected", "active", "completed"].includes(statusParam)) {
      return c.json({ error: "Invalid status value" }, 400);
    }

    // Build WHERE clause
    const conditions: string[] = [];
    const params: string[] = [];

    // Filter by user (as mentor or mentee)
    conditions.push("(matches.mentor_id = ? OR matches.mentee_id = ?)");
    params.push(userId, userId);

    // Filter by role if provided
    if (roleParam === "mentor") {
      conditions.push("matches.mentor_id = ?");
      params.push(userId);
    } else if (roleParam === "mentee") {
      conditions.push("matches.mentee_id = ?");
      params.push(userId);
    }

    // Filter by status if provided
    if (statusParam) {
      conditions.push("matches.status = ?");
      params.push(statusParam);
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;

    // Get matches with mentor and mentee names via JOIN
    // For active/completed matches, also include email addresses and mentor LinkedIn URL
    const sql = `
      SELECT
        matches.id,
        matches.mentor_id,
        matches.mentee_id,
        mentor_users.name as mentor_name,
        mentee_users.name as mentee_name,
        CASE
          WHEN matches.status IN ('active', 'completed') THEN mentor_users.email
          ELSE NULL
        END as mentor_email,
        CASE
          WHEN matches.status IN ('active', 'completed') THEN mentee_users.email
          ELSE NULL
        END as mentee_email,
        CASE
          WHEN matches.status IN ('active', 'completed') THEN mentor_profiles.linkedin_url
          ELSE NULL
        END as mentor_linkedin_url,
        matches.status,
        matches.introduction,
        matches.preferred_time,
        matches.cv_included,
        matches.created_at,
        matches.updated_at
      FROM matches
      LEFT JOIN users as mentor_users ON matches.mentor_id = mentor_users.id
      LEFT JOIN users as mentee_users ON matches.mentee_id = mentee_users.id
      LEFT JOIN mentor_profiles ON matches.mentor_id = mentor_profiles.user_id
      ${whereClause}
      ORDER BY matches.created_at DESC
    `;

    const results = await c.env.platform_db
      .prepare(sql)
      .bind(...params)
      .all<Match>();

    const response: GetMatchesResponse = {
      matches: results.results || [],
    };

    return c.json<GetMatchesResponse>(response);
  } catch {
    return c.json({ error: "Invalid request" }, 400);
  }
});

/**
 * POST /api/v1/matches/:id/respond - Mentor accepts or rejects match
 */
app.post("/api/v1/matches/:id/respond", requireAuth, async (c) => {
  try {
    const matchId = c.req.param("id");
    const body = await c.req.json<RespondToMatchRequest>();

    // Validation: action must be provided
    if (!body.action || !["accept", "reject"].includes(body.action)) {
      return c.json({ error: "action must be 'accept' or 'reject'" }, 400);
    }

    // Get match
    const match = await c.env.platform_db
      .prepare("SELECT * FROM matches WHERE id = ?")
      .bind(matchId)
      .first();

    if (!match) {
      return c.json({ error: "Match not found" }, 404);
    }

    // Validate match is in pending state
    if (match.status !== "pending") {
      return c.json({ error: "Match is not in pending state" }, 400);
    }

    // Determine new status
    const newStatus = body.action === "accept" ? "active" : "rejected";

    // Update match
    const timestamp = getTimestamp();
    await c.env.platform_db
      .prepare("UPDATE matches SET status = ?, updated_at = ? WHERE id = ?")
      .bind(newStatus, timestamp, matchId)
      .run();

    // Fetch and return updated match
    const updated = await c.env.platform_db
      .prepare("SELECT * FROM matches WHERE id = ?")
      .bind(matchId)
      .first<Match>();

    if (!updated) {
      return c.json({ error: "Match not found" }, 404);
    }

    return c.json<Match>(updated);
  } catch {
    return c.json({ error: "Invalid request body" }, 400);
  }
});

/**
 * PATCH /api/v1/matches/:id/complete - Mark match as completed
 */
app.patch("/api/v1/matches/:id/complete", requireAuth, async (c) => {
  try {
    const matchId = c.req.param("id");

    // Get match
    const match = await c.env.platform_db
      .prepare("SELECT * FROM matches WHERE id = ?")
      .bind(matchId)
      .first();

    if (!match) {
      return c.json({ error: "Match not found" }, 404);
    }

    // Validate match is in active state
    if (match.status !== "active") {
      return c.json({ error: "Match is not active" }, 400);
    }

    // Update match to completed
    const timestamp = getTimestamp();
    await c.env.platform_db
      .prepare("UPDATE matches SET status = ?, updated_at = ? WHERE id = ?")
      .bind("completed", timestamp, matchId)
      .run();

    // Fetch and return updated match
    const updated = await c.env.platform_db
      .prepare("SELECT * FROM matches WHERE id = ?")
      .bind(matchId)
      .first<Match>();

    if (!updated) {
      return c.json({ error: "Match not found" }, 404);
    }

    return c.json<Match>(updated);
  } catch {
    return c.json({ error: "Invalid request" }, 400);
  }
});

/**
 * DELETE /api/v1/matches/:id - Cancel/delete match
 */
app.delete("/api/v1/matches/:id", requireAuth, async (c) => {
  const matchId = c.req.param("id");

  // Check if match exists
  const existing = await c.env.platform_db
    .prepare("SELECT id FROM matches WHERE id = ?")
    .bind(matchId)
    .first();

  if (!existing) {
    return c.json({ error: "Match not found" }, 404);
  }

  // Delete the match
  await c.env.platform_db
    .prepare("DELETE FROM matches WHERE id = ?")
    .bind(matchId)
    .run();

  return c.json({ success: true });
});

// ============================================================================
// Google OAuth Routes (/api/v1/auth)
// ============================================================================

/**
 * GET /api/v1/auth/google/login - Initiate Google OAuth login
 * Redirects user to Google's OAuth consent screen
 */
app.get("/api/v1/auth/google/login", (c) => {
  try {
    const clientId = c.env.GOOGLE_CLIENT_ID;

    if (!clientId) {
      return c.json({ error: "Google OAuth is not configured" }, 500);
    }

    // Construct redirect URI using proper URL parsing
    const requestUrl = new URL(c.req.url);
    const redirectUri = c.req.query("redirect_uri") || `${requestUrl.protocol}//${requestUrl.host}/auth/google/callback`;

    // Store the effective redirect URI in a temporary cookie so the callback handler
    // can use the exact same value that Google saw, preventing invalid_grant errors.
    const isHttps = requestUrl.protocol === "https:";
    let cookieValue = `oauth_redirect_uri=${encodeURIComponent(redirectUri)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=300`;
    if (isHttps) {
      cookieValue += "; Secure";
    }
    c.header("Set-Cookie", cookieValue, { append: true });

    const loginUrl = getGoogleLoginUrl(clientId, redirectUri);
    return c.json({ url: loginUrl });
  } catch {
    return c.json({ error: "Failed to generate login URL" }, 500);
  }
});

/**
 * GET /api/v1/auth/google/callback - Handle Google OAuth callback
 * Exchanges authorization code for access token and creates/updates user
 */
app.get("/api/v1/auth/google/callback", async (c) => {
  try {
    const code = c.req.query("code");
    const error = c.req.query("error");

    // Retrieve redirect URI cookie early so we can clear it regardless of outcome
    const requestUrl = new URL(c.req.url);
    const cookies = c.req.header("Cookie") || "";
    const redirectCookie = cookies
      .split(";")
      .map((cookie) => cookie.trim())
      .find((cookie) => cookie.startsWith("oauth_redirect_uri="));

    const fallbackRedirectUri = `${requestUrl.protocol}//${requestUrl.host}/auth/google/callback`;
    const redirectUriFromCookie = redirectCookie
      ? decodeURIComponent(redirectCookie.split("=")[1])
      : null;
    const redirectUri = redirectUriFromCookie || fallbackRedirectUri;

    const isHttps = requestUrl.protocol === "https:";
    let clearCookieValue = "oauth_redirect_uri=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0";
    if (isHttps) {
      clearCookieValue += "; Secure";
    }
    c.header("Set-Cookie", clearCookieValue, { append: true });

    // Handle OAuth errors
    if (error) {
      return c.json(
        { error: `Google OAuth error: ${error}`, error_description: c.req.query("error_description") },
        400
      );
    }

    if (!code) {
      return c.json({ error: "Missing authorization code" }, 400);
    }

    const clientId = c.env.GOOGLE_CLIENT_ID;
    const clientSecret = c.env.GOOGLE_CLIENT_SECRET;
    const jwtSecret = c.env.JWT_SECRET;

    if (!clientId || !clientSecret || !jwtSecret) {
      return c.json({ error: "OAuth configuration missing" }, 500);
    }

    // Exchange code for access token
    const tokenResponse = await exchangeGoogleCode(code, clientId, clientSecret, redirectUri);

    // Fetch user profile (pass id_token as fallback if available)
    const googleProfile = await getGoogleUserProfile(
      tokenResponse.access_token,
      tokenResponse.id_token
    );

    // Find or create user
    const user = await findOrCreateUserFromGoogle(googleProfile, c.env.platform_db);

    // Fetch user's role
    const roleRecord = await c.env.platform_db
      .prepare("SELECT role FROM user_roles WHERE user_id = ?")
      .bind(user.id)
      .first<{ role: string }>();

    const userRole = roleRecord ? normalizeUserRole(roleRecord.role) : DEFAULT_ROLE;

    // Create JWT token with role
    const authPayload = createAuthPayload(user);
    authPayload.role = userRole;
    const token = await createToken(authPayload, jwtSecret);

    // Set auth token as HTTP-only cookie
    let cookieValue = `auth_token=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800`;
    if (isHttps) {
      cookieValue += "; Secure";
    }
    c.header("Set-Cookie", cookieValue, { append: true });

    // Return user info (token is in cookie now)
    return c.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: userRole,
      },
    });
  } catch (err) {
    // Detailed error logging for OAuth debugging
    console.error("OAuth callback error:", err);

    // Log additional context if available
    if (err instanceof Error) {
      console.error("Error message:", err.message);
      console.error("Error stack:", err.stack);
    }

    // Log request details (without sensitive data)
    const requestUrl = new URL(c.req.url);
    console.error("Request URL:", requestUrl.pathname);
    console.error("Has authorization code:", !!c.req.query("code"));

    return c.json({ error: "Authentication failed" }, 500);
  }
});

/**
 * GET /api/v1/auth/me - Get current authenticated user
 */
app.get("/api/v1/auth/me", async (c) => {
  try {
    const authPayload = c.get("user") as AuthPayload | undefined;

    if (!authPayload) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    // Fetch full user details from database
    const user = await c.env.platform_db
      .prepare("SELECT * FROM users WHERE id = ?")
      .bind(authPayload.userId)
      .first<User>();

    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }

    // Fetch user's role
    const roleRecord = await c.env.platform_db
      .prepare("SELECT role FROM user_roles WHERE user_id = ?")
      .bind(authPayload.userId)
      .first<{ role: string }>();

    const userRole = roleRecord ? normalizeUserRole(roleRecord.role) : DEFAULT_ROLE;
    user.role = userRole;

    return c.json(user);
  } catch {
    return c.json({ error: "Failed to fetch user" }, 500);
  }
});

/**
 * POST /api/v1/auth/logout - Clear auth cookie and logout
 * Clears the auth_token cookie by setting Max-Age=0
 */
app.post("/api/v1/auth/logout", (c) => {
  const requestUrl = new URL(c.req.url);
  const isHttps = requestUrl.protocol === "https:";
  let clearCookieValue = "auth_token=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0";
  if (isHttps) {
    clearCookieValue += "; Secure";
  }
  c.header("Set-Cookie", clearCookieValue, { append: true });

  return c.json({ success: true, message: "Logged out successfully" });
});

// ============================================================================
// Posts API (/api/v1/posts)
// ============================================================================

/**
 * GET /api/v1/posts - List posts with pagination
 * Public endpoint - no authentication required
 * Supports filtering by post type and category, sorting by different criteria
 * Forum features: category filter, sorting (latest/hot/most_replies/most_views), pinned posts
 */
app.get("/api/v1/posts", async (c) => {
  try {
    const limitParam = c.req.query("limit");
    const offsetParam = c.req.query("offset");
    const typeParam = c.req.query("type");
    const categoryParam = c.req.query("category");
    const sortByParam = c.req.query("sortBy") || "latest"; // Forum sorting

    // Validation: Parse and validate limit and offset
    const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10), 1), 100) : 20; // Default 20, max 100
    const offset = offsetParam ? Math.max(parseInt(offsetParam, 10), 0) : 0; // Default 0

    // Build query - filter by type and category if provided
    const whereConditions: string[] = [];
    const bindings: unknown[] = [];

    if (typeParam) {
      // Validate post type
      if (!["announcement", "discussion", "general"].includes(typeParam)) {
        return c.json({ error: "Invalid post type" }, 400);
      }
      whereConditions.push("post_type = ?");
      bindings.push(typeParam);
    }

    if (categoryParam) {
      // Validate category
      if (!["general", "career", "mentorship", "technology", "learning", "announcements"].includes(categoryParam)) {
        return c.json({ error: "Invalid category" }, 400);
      }
      whereConditions.push("category = ?");
      bindings.push(categoryParam);
    }

    const whereClause = whereConditions.length > 0 ? " WHERE " + whereConditions.join(" AND ") : "";

    // Count total posts (matching filters if applied)
    const countQuery = `SELECT COUNT(*) as count FROM posts${whereClause}`;
    const countResult = await c.env.platform_db
      .prepare(countQuery)
      .bind(...bindings)
      .first<{ count: number }>();
    const total = countResult?.count || 0;

    // Determine sort order based on sortBy parameter
    let orderByClause = "created_at DESC"; // Default: latest
    if (sortByParam === "hot") {
      orderByClause = "last_reply_at DESC NULLS LAST, created_at DESC";
    } else if (sortByParam === "most_replies") {
      orderByClause = "comments_count DESC, created_at DESC";
    } else if (sortByParam === "most_views") {
      orderByClause = "views DESC, created_at DESC";
    }

    // Fetch posts - pinned posts first, then sorted by specified criteria
    const query = `SELECT * FROM posts${whereClause} ORDER BY is_pinned DESC, ${orderByClause} LIMIT ? OFFSET ?`;
    bindings.push(limit, offset);

    const results = await c.env.platform_db
      .prepare(query)
      .bind(...bindings)
      .all<Record<string, unknown>>();

    // Normalize posts and attach author info, last replier info, and user like status
    const user = c.get('user') as AuthPayload | undefined;
    const postsWithAuthorsAndLikes = await Promise.all(
      results.results.map(async (post) => {
        // Fetch author name
        const author = await c.env.platform_db
          .prepare("SELECT name FROM users WHERE id = ?")
          .bind(post.user_id)
          .first<{ name: string }>();

        // Fetch last replier name if exists
        let lastReplyUserName: string | undefined;
        if (post.last_reply_user_id) {
          const lastReplier = await c.env.platform_db
            .prepare("SELECT name FROM users WHERE id = ?")
            .bind(post.last_reply_user_id)
            .first<{ name: string }>();
          lastReplyUserName = lastReplier?.name;
        }

        // Check if current user has liked this post
        let userHasLiked = false;
        if (user) {
          const likeRecord = await c.env.platform_db
            .prepare("SELECT 1 FROM post_likes WHERE post_id = ? AND user_id = ? LIMIT 1")
            .bind(post.id, user.userId)
            .first();
          userHasLiked = !!likeRecord;
        }

        return {
          ...post,
          author_name: author?.name || "Unknown User",
          last_reply_user_name: lastReplyUserName,
          user_has_liked: userHasLiked,
        };
      })
    );

    const response: GetPostsResponse = {
      posts: postsWithAuthorsAndLikes as unknown as Post[],
      total,
      limit,
      offset,
    };

    return c.json<GetPostsResponse>(response);
  } catch (err) {
    console.error("Error fetching posts:", err);
    return c.json({ error: "Failed to fetch posts" }, 500);
  }
});

/**
 * GET /api/v1/posts/:id - Get single post by ID
 * Public endpoint - no authentication required
 * Forum feature: Increments view counter
 */
app.get("/api/v1/posts/:id", async (c) => {
  try {
    const postId = c.req.param("id");

    // Fetch post
    const post = await c.env.platform_db
      .prepare("SELECT * FROM posts WHERE id = ?")
      .bind(postId)
      .first<Record<string, unknown>>();

    if (!post) {
      return c.json({ error: "Post not found" }, 404);
    }

    // Increment view counter (fire and forget - don't block response)
    c.env.platform_db
      .prepare("UPDATE posts SET views = COALESCE(views, 0) + 1 WHERE id = ?")
      .bind(postId)
      .run()
      .catch((err) => console.error("Failed to increment view count:", err));

    // Fetch author name
    const author = await c.env.platform_db
      .prepare("SELECT name FROM users WHERE id = ?")
      .bind(post.user_id)
      .first<{ name: string }>();

    // Fetch last replier name if exists
    let lastReplyUserName: string | undefined;
    if (post.last_reply_user_id) {
      const lastReplier = await c.env.platform_db
        .prepare("SELECT name FROM users WHERE id = ?")
        .bind(post.last_reply_user_id)
        .first<{ name: string }>();
      lastReplyUserName = lastReplier?.name;
    }

    const postWithAuthor = {
      ...post,
      author_name: author?.name || "Unknown User",
      last_reply_user_name: lastReplyUserName,
      views: (post.views as number || 0) + 1, // Return incremented count immediately
    };

    return c.json<Post>(postWithAuthor as unknown as Post);
  } catch (err) {
    console.error("Error fetching post:", err);
    return c.json({ error: "Failed to fetch post" }, 500);
  }
});

/**
 * POST /api/v1/posts - Create a new post
 * Authenticated endpoint - requires valid JWT token
 * Auto-publishes posts immediately (except announcements which require admin)
 */
app.post("/api/v1/posts", requireAuth, async (c) => {
  try {
    const authPayload = c.get("user") as AuthPayload | undefined;
    if (!authPayload) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const userId = authPayload.userId;

    // Fetch user's role to check admin privileges
    const roleRecord = await c.env.platform_db
      .prepare("SELECT role FROM user_roles WHERE user_id = ?")
      .bind(userId)
      .first<{ role: string }>();
    const userRole = roleRecord ? roleRecord.role : "member";

    // Parse request body
    const body = await c.req.json<Record<string, unknown>>();
    const title = body.title ? String(body.title).trim() : undefined;
    const content = String(body.content || "").trim();
    const post_type = String(body.post_type || "general");
    const category = String(body.category || "general");

    // Validation: Check title if provided
    if (title && title.length > 200) {
      return c.json({ error: "Post title must not exceed 200 characters" }, 400);
    }

    // Validation: Check content is not empty and within length limits
    if (!content) {
      return c.json({ error: "Post content is required" }, 400);
    }
    if (content.length > 2000) {
      return c.json({ error: "Post content must not exceed 2000 characters" }, 400);
    }

    // Security: Check for dangerous HTML in title and content
    if (title && (title.includes('<script') || title.includes('</script>') || title.includes('javascript:'))) {
      return c.json({ error: "Invalid title" }, 400);
    }
    if (content.includes('<script') || content.includes('</script>') || content.includes('javascript:')) {
      return c.json({ error: "Invalid content" }, 400);
    }

    // Validation: Check post type is valid
    if (!["announcement", "discussion", "general"].includes(post_type)) {
      return c.json({ error: "Invalid post type" }, 400);
    }

    // Validation: Check category is valid
    if (!["general", "career", "mentorship", "technology", "learning", "announcements"].includes(category)) {
      return c.json({ error: "Invalid category" }, 400);
    }

    // Authorization: Only admins can create announcements
    if (post_type === "announcement" && userRole !== "admin") {
      return c.json(
        { error: "Only administrators can create announcements" },
        403
      );
    }

    // Generate post ID and timestamps
    const postId = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000); // Unix timestamp in seconds

    // Insert post into database with forum fields
    const result = await c.env.platform_db
      .prepare(
        "INSERT INTO posts (id, user_id, title, content, post_type, category, likes_count, comments_count, views, is_pinned, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 0, 0, 0, 0, ?, ?)"
      )
      .bind(postId, userId, title || null, content, post_type, category, now, now)
      .run();

    if (!result.success) {
      throw new Error("Failed to insert post");
    }

    // Award points to the post creator (silent failure if points system fails)
    const basePoints =
      post_type === "discussion"
        ? POINTS_FOR_CREATE_DISCUSSION_POST
        : post_type === "general"
          ? POINTS_FOR_CREATE_GENERAL_POST
          : POINTS_FOR_CREATE_ANNOUNCEMENT_POST;

    if (basePoints > 0) {
      await awardPointsForAction(
        c.env.platform_db,
        userId,
        "post_created",
        postId,
        basePoints
      );
    }

    // Fetch and return the created post
    const post = await c.env.platform_db
      .prepare("SELECT * FROM posts WHERE id = ?")
      .bind(postId)
      .first<Record<string, unknown>>();

    if (!post) {
      return c.json({ error: "Failed to retrieve created post" }, 500);
    }

    // Fetch author name
    const author = await c.env.platform_db
      .prepare("SELECT name FROM users WHERE id = ?")
      .bind(userId)
      .first<{ name: string }>();

    const postWithAuthor = {
      ...post,
      author_name: author?.name || "Unknown User",
    };

    return c.json<Post>(postWithAuthor as unknown as Post, 201);
  } catch (err) {
    console.error("Error creating post:", err);
    return c.json({ error: "Failed to create post" }, 500);
  }
});

/**
 * PUT /api/v1/posts/:id - Update a post
 * Authenticated endpoint - author only (or admin)
 * Can update content and/or post type
 */
app.put("/api/v1/posts/:id", requireAuth, async (c) => {
  try {
    const authPayload = c.get("user") as AuthPayload | undefined;
    if (!authPayload) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const postId = c.req.param("id");
    const userId = authPayload.userId;

    // Fetch user's role to check admin privileges
    const roleRecord = await c.env.platform_db
      .prepare("SELECT role FROM user_roles WHERE user_id = ?")
      .bind(userId)
      .first<{ role: string }>();
    const userRole = roleRecord ? roleRecord.role : "member";

    // Parse request body
    const body = await c.req.json<Record<string, unknown>>();
    const content = body.content ? String(body.content).trim() : null;
    const post_type = body.post_type ? String(body.post_type) : null;

    // Fetch the post to check ownership
    const post = await c.env.platform_db
      .prepare("SELECT * FROM posts WHERE id = ?")
      .bind(postId)
      .first<Record<string, unknown>>();

    if (!post) {
      return c.json({ error: "Post not found" }, 404);
    }

    // Authorization: Check if user is author or admin
    if (post.user_id !== userId && userRole !== "admin") {
      return c.json({ error: "Unauthorized to update this post" }, 403);
    }

    // Validation: If content is provided, check constraints
    if (content !== null) {
      if (!content) {
        return c.json({ error: "Post content cannot be empty" }, 400);
      }
      if (content.length > 2000) {
        return c.json(
          { error: "Post content must not exceed 2000 characters" },
          400
        );
      }

      // Security: Check for dangerous HTML
      if (content.includes('<script') || content.includes('</script>') || content.includes('javascript:')) {
        return c.json({ error: "Invalid content" }, 400);
      }
    }

    // Validation: If post_type is provided, check it's valid
    if (post_type !== null) {
      if (!["announcement", "discussion", "general"].includes(post_type)) {
        return c.json({ error: "Invalid post type" }, 400);
      }
      // Authorization: Only admins can change to/from announcements
      if (
        (post_type === "announcement" || post.post_type === "announcement") &&
        userRole !== "admin"
      ) {
        return c.json(
          { error: "Only administrators can modify announcements" },
          403
        );
      }
    }

    // Build update query dynamically
    const updates: string[] = [];
    const bindings: unknown[] = [];

    if (content !== null) {
      updates.push("content = ?");
      bindings.push(content);
    }
    if (post_type !== null) {
      updates.push("post_type = ?");
      bindings.push(post_type);
    }

    // Always update the updated_at timestamp
    updates.push("updated_at = ?");
    bindings.push(Math.floor(Date.now() / 1000));

    // Add post ID to bindings for WHERE clause
    bindings.push(postId);

    // Execute update
    const updateQuery = `UPDATE posts SET ${updates.join(", ")} WHERE id = ?`;
    const result = await c.env.platform_db
      .prepare(updateQuery)
      .bind(...bindings)
      .run();

    if (!result.success) {
      throw new Error("Failed to update post");
    }

    // Fetch and return updated post
    const updatedPost = await c.env.platform_db
      .prepare("SELECT * FROM posts WHERE id = ?")
      .bind(postId)
      .first<Record<string, unknown>>();

    if (!updatedPost) {
      return c.json({ error: "Failed to retrieve updated post" }, 500);
    }

    // Fetch author name
    const author = await c.env.platform_db
      .prepare("SELECT name FROM users WHERE id = ?")
      .bind(updatedPost.user_id)
      .first<{ name: string }>();

    const postWithAuthor = {
      ...updatedPost,
      author_name: author?.name || "Unknown User",
    };

    return c.json<Post>(postWithAuthor as unknown as Post);
  } catch (err) {
    console.error("Error updating post:", err);
    return c.json({ error: "Failed to update post" }, 500);
  }
});

/**
 * DELETE /api/v1/posts/:id - Delete a post
 * Authenticated endpoint - author only (or admin)
 * Hard deletes the post from the database
 */
app.delete("/api/v1/posts/:id", requireAuth, async (c) => {
  try {
    const authPayload = c.get("user") as AuthPayload | undefined;
    if (!authPayload) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const postId = c.req.param("id");
    const userId = authPayload.userId;

    // Fetch user's role to check admin privileges
    const roleRecord = await c.env.platform_db
      .prepare("SELECT role FROM user_roles WHERE user_id = ?")
      .bind(userId)
      .first<{ role: string }>();
    const userRole = roleRecord ? roleRecord.role : "member";

    // Fetch the post to check ownership
    const post = await c.env.platform_db
      .prepare("SELECT * FROM posts WHERE id = ?")
      .bind(postId)
      .first<Record<string, unknown>>();

    if (!post) {
      return c.json({ error: "Post not found" }, 404);
    }

    // Authorization: Check if user is author or admin
    if (post.user_id !== userId && userRole !== "admin") {
      return c.json({ error: "Unauthorized to delete this post" }, 403);
    }

    // Delete the post
    const result = await c.env.platform_db
      .prepare("DELETE FROM posts WHERE id = ?")
      .bind(postId)
      .run();

    if (!result.success) {
      throw new Error("Failed to delete post");
    }

    return c.json({ success: true, message: "Post deleted successfully" });
  } catch (err) {
    console.error("Error deleting post:", err);
    return c.json({ error: "Failed to delete post" }, 500);
  }
});

/**
 * PATCH /api/v1/posts/:id/pin - Pin or unpin a post
 * Admin-only endpoint - requires admin role
 * Forum feature: Pinned posts appear at the top of the list
 */
app.patch("/api/v1/posts/:id/pin", requireAuth, async (c) => {
  try {
    const authPayload = c.get("user") as AuthPayload | undefined;
    if (!authPayload) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const userId = authPayload.userId;
    const postId = c.req.param("id");

    // Check if user is admin
    const roleRecord = await c.env.platform_db
      .prepare("SELECT role FROM user_roles WHERE user_id = ?")
      .bind(userId)
      .first<{ role: string }>();
    const userRole = roleRecord ? roleRecord.role : "member";

    if (userRole !== "admin") {
      return c.json({ error: "Only administrators can pin/unpin posts" }, 403);
    }

    // Parse request body
    const body = await c.req.json<Record<string, unknown>>();
    const isPinned = Boolean(body.is_pinned);

    // Fetch the post
    const post = await c.env.platform_db
      .prepare("SELECT * FROM posts WHERE id = ?")
      .bind(postId)
      .first<Record<string, unknown>>();

    if (!post) {
      return c.json({ error: "Post not found" }, 404);
    }

    // Update the is_pinned status
    const now = Math.floor(Date.now() / 1000);
    const result = await c.env.platform_db
      .prepare("UPDATE posts SET is_pinned = ?, updated_at = ? WHERE id = ?")
      .bind(isPinned ? 1 : 0, now, postId)
      .run();

    if (!result.success) {
      throw new Error("Failed to update post pin status");
    }

    // Fetch and return the updated post
    const updatedPost = await c.env.platform_db
      .prepare("SELECT * FROM posts WHERE id = ?")
      .bind(postId)
      .first<Record<string, unknown>>();

    return c.json({
      success: true,
      message: isPinned ? "Post pinned successfully" : "Post unpinned successfully",
      post: updatedPost,
    });
  } catch (err) {
    console.error("Error updating post pin status:", err);
    return c.json({ error: "Failed to update post pin status" }, 500);
  }
});

// ============================================================================
// Posts Engagement API (/api/v1/posts/:id/like)
// ============================================================================

/**
 * POST /api/v1/posts/:id/like - Like a post
 * Authenticated endpoint
 * Creates a like record and increments likes_count
 * Returns 409 if user already liked the post
 */
app.post("/api/v1/posts/:id/like", requireAuth, async (c) => {
  try {
    const authPayload = c.get("user") as AuthPayload | undefined;
    if (!authPayload) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const postId = c.req.param("id");
    const userId = authPayload.userId;

    // Fetch the post
    const post = await c.env.platform_db
      .prepare("SELECT * FROM posts WHERE id = ?")
      .bind(postId)
      .first<Record<string, unknown>>();

    if (!post) {
      return c.json({ error: "Post not found" }, 404);
    }

    // Check if user already liked this post
    const existingLike = await c.env.platform_db
      .prepare("SELECT id FROM post_likes WHERE post_id = ? AND user_id = ?")
      .bind(postId, userId)
      .first<{ id: string }>();

    if (existingLike) {
      return c.json({ error: "Post already liked by this user" }, 409);
    }

    // Create the like record
    const likeId = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);

    const likeResult = await c.env.platform_db
      .prepare(
        "INSERT INTO post_likes (id, post_id, user_id, created_at) VALUES (?, ?, ?, ?)"
      )
      .bind(likeId, postId, userId, now)
      .run();

    if (!likeResult.success) {
      throw new Error("Failed to create like");
    }

    // Increment likes_count in posts table
    const updateResult = await c.env.platform_db
      .prepare("UPDATE posts SET likes_count = likes_count + 1, updated_at = ? WHERE id = ?")
      .bind(now, postId)
      .run();

    if (!updateResult.success) {
      throw new Error("Failed to update likes count");
    }

    // Award points to the post author for receiving a like (silent failure if points system fails)
    const postAuthorId = post.user_id as string;
    if (postAuthorId !== userId) {
      // Only award points if the liker is not the post author
      await awardPointsForAction(
        c.env.platform_db,
        postAuthorId,
        "like_received",
        likeId,
        POINTS_FOR_RECEIVING_LIKE
      );
    }

    // Fetch updated post
    const updatedPost = await c.env.platform_db
      .prepare("SELECT * FROM posts WHERE id = ?")
      .bind(postId)
      .first<Record<string, unknown>>();

    return c.json({
      post: normalizePost(updatedPost),
      user_has_liked: true,
    });
  } catch (err) {
    console.error("Error liking post:", err);
    return c.json({ error: "Failed to like post" }, 500);
  }
});

/**
 * DELETE /api/v1/posts/:id/like - Unlike a post
 * Authenticated endpoint
 * Removes the like record and decrements likes_count
 * Returns 404 if user hasn't liked the post
 */
app.delete("/api/v1/posts/:id/like", requireAuth, async (c) => {
  try {
    const authPayload = c.get("user") as AuthPayload | undefined;
    if (!authPayload) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const postId = c.req.param("id");
    const userId = authPayload.userId;

    // Fetch the post
    const post = await c.env.platform_db
      .prepare("SELECT * FROM posts WHERE id = ?")
      .bind(postId)
      .first<Record<string, unknown>>();

    if (!post) {
      return c.json({ error: "Post not found" }, 404);
    }

    // Check if user has liked this post
    const existingLike = await c.env.platform_db
      .prepare("SELECT id FROM post_likes WHERE post_id = ? AND user_id = ?")
      .bind(postId, userId)
      .first<{ id: string }>();

    if (!existingLike) {
      return c.json({ error: "Post not liked by this user" }, 404);
    }

    // Delete the like record
    const deleteResult = await c.env.platform_db
      .prepare("DELETE FROM post_likes WHERE post_id = ? AND user_id = ?")
      .bind(postId, userId)
      .run();

    if (!deleteResult.success) {
      throw new Error("Failed to delete like");
    }

    // Decrement likes_count in posts table
    const now = Math.floor(Date.now() / 1000);
    const updateResult = await c.env.platform_db
      .prepare("UPDATE posts SET likes_count = MAX(0, likes_count - 1), updated_at = ? WHERE id = ?")
      .bind(now, postId)
      .run();

    if (!updateResult.success) {
      throw new Error("Failed to update likes count");
    }

    // Fetch updated post
    const updatedPost = await c.env.platform_db
      .prepare("SELECT * FROM posts WHERE id = ?")
      .bind(postId)
      .first<Record<string, unknown>>();

    return c.json({
      post: normalizePost(updatedPost),
      user_has_liked: false,
    });
  } catch (err) {
    console.error("Error unliking post:", err);
    return c.json({ error: "Failed to unlike post" }, 500);
  }
});

// ============================================================================
// Posts Comments API (/api/v1/posts/:id/comments, /api/v1/comments/:id)
// ============================================================================

/**
 * POST /api/v1/posts/:id/comments - Create a comment on a post
 * Authenticated endpoint
 * Creates a new comment and increments comments_count
 * Returns 400 if content is empty or exceeds max length
 * Returns 404 if post not found
 */
app.post("/api/v1/posts/:id/comments", requireAuth, async (c) => {
  try {
    const authPayload = c.get("user") as AuthPayload | undefined;
    if (!authPayload) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const postId = c.req.param("id");
    const userId = authPayload.userId;
    const body = await c.req.json<{ content: string; parent_comment_id?: string }>();

    // Validate content
    if (!body.content || body.content.trim().length === 0) {
      return c.json({ error: "Comment content is required" }, 400);
    }

    const MAX_COMMENT_LENGTH = 500;
    if (body.content.length > MAX_COMMENT_LENGTH) {
      return c.json(
        { error: `Comment content must be ${MAX_COMMENT_LENGTH} characters or less` },
        400
      );
    }

    // Security: Check for dangerous HTML
    if (body.content.includes('<script') || body.content.includes('</script>') || body.content.includes('javascript:')) {
      return c.json({ error: "Invalid content" }, 400);
    }

    // Check if post exists
    const post = await c.env.platform_db
      .prepare("SELECT * FROM posts WHERE id = ?")
      .bind(postId)
      .first<Record<string, unknown>>();

    if (!post) {
      return c.json({ error: "Post not found" }, 404);
    }

    // If parent_comment_id is provided, validate it exists
    if (body.parent_comment_id) {
      const parentComment = await c.env.platform_db
        .prepare("SELECT id FROM post_comments WHERE id = ?")
        .bind(body.parent_comment_id)
        .first<{ id: string }>();

      if (!parentComment) {
        return c.json({ error: "Parent comment not found" }, 404);
      }
    }

    // Create the comment
    const commentId = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);

    const insertResult = await c.env.platform_db
      .prepare(
        "INSERT INTO post_comments (id, post_id, user_id, content, parent_comment_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
      )
      .bind(
        commentId,
        postId,
        userId,
        body.content,
        body.parent_comment_id || null,
        now,
        now
      )
      .run();

    if (!insertResult.success) {
      throw new Error("Failed to insert comment");
    }

    // Increment comments_count and update last_reply info in posts table (forum feature)
    const updateResult = await c.env.platform_db
      .prepare("UPDATE posts SET comments_count = comments_count + 1, last_reply_at = ?, last_reply_user_id = ?, updated_at = ? WHERE id = ?")
      .bind(now, userId, now, postId)
      .run();

    if (!updateResult.success) {
      throw new Error("Failed to update comments count");
    }

    // Award points to the comment creator (silent failure if points system fails)
    await awardPointsForAction(
      c.env.platform_db,
      userId,
      "comment_created",
      commentId,
      POINTS_FOR_CREATE_COMMENT
    );

    // Award points to the post author for receiving a comment (silent failure if points system fails)
    const postAuthorId = post.user_id as string;
    if (postAuthorId !== userId) {
      // Only award points if the commenter is not the post author
      await awardPointsForAction(
        c.env.platform_db,
        postAuthorId,
        "comment_received",
        commentId,
        POINTS_FOR_RECEIVING_COMMENT
      );
    }

    // Fetch the created comment with author info
    const comment = await c.env.platform_db
      .prepare("SELECT pc.*, u.name as author_name, u.email as author_email FROM post_comments pc JOIN users u ON pc.user_id = u.id WHERE pc.id = ?")
      .bind(commentId)
      .first<Record<string, unknown>>();

    return c.json(normalizePostCommentWithAuthor(comment, comment?.author_name as string, comment?.author_email as string), 201);
  } catch (err) {
    console.error("Error creating comment:", err);
    return c.json({ error: "Failed to create comment" }, 500);
  }
});

/**
 * GET /api/v1/posts/:id/comments - Get all comments for a post
 * Public endpoint
 * Returns paginated comments sorted by created_at (oldest first)
 * Returns 404 if post not found
 */
app.get("/api/v1/posts/:id/comments", async (c) => {
  try {
    const postId = c.req.param("id");
    const limit = Math.min(Number(c.req.query("limit")) || 20, 100); // Max 100, default 20
    const offset = Math.max(Number(c.req.query("offset")) || 0, 0);

    // Check if post exists
    const post = await c.env.platform_db
      .prepare("SELECT id FROM posts WHERE id = ?")
      .bind(postId)
      .first<{ id: string }>();

    if (!post) {
      return c.json({ error: "Post not found" }, 404);
    }

    // Get total count of comments
    const countResult = await c.env.platform_db
      .prepare("SELECT COUNT(*) as count FROM post_comments WHERE post_id = ?")
      .bind(postId)
      .first<{ count: number }>();

    const total = countResult?.count || 0;

    // Fetch comments with author info, sorted by created_at (oldest first)
    const comments = await c.env.platform_db
      .prepare(
        "SELECT pc.*, u.name as author_name, u.email as author_email FROM post_comments pc JOIN users u ON pc.user_id = u.id WHERE pc.post_id = ? ORDER BY pc.created_at ASC LIMIT ? OFFSET ?"
      )
      .bind(postId, limit, offset)
      .all<Record<string, unknown>>();

    const normalizedComments = (comments.results || []).map((comment) =>
      normalizePostCommentWithAuthor(comment, comment.author_name as string, comment.author_email as string)
    );

    return c.json({
      comments: normalizedComments,
      total,
      limit,
      offset,
    });
  } catch (err) {
    console.error("Error fetching comments:", err);
    return c.json({ error: "Failed to fetch comments" }, 500);
  }
});

/**
 * DELETE /api/v1/comments/:id - Delete a comment (soft delete)
 * Authenticated endpoint
 * Author or admin can delete a comment
 * Performs soft delete by setting content to '[deleted]' and preserving thread structure
 * This allows replies to remain visible and the comment tree to stay intact
 * Returns 403 if user is not author or admin
 * Returns 404 if comment not found
 */
app.delete("/api/v1/comments/:id", requireAuth, async (c) => {
  try {
    const authPayload = c.get("user") as AuthPayload | undefined;
    if (!authPayload) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const commentId = c.req.param("id");
    const userId = authPayload.userId;

    // Fetch the comment
    const comment = await c.env.platform_db
      .prepare("SELECT * FROM post_comments WHERE id = ?")
      .bind(commentId)
      .first<Record<string, unknown>>();

    if (!comment) {
      return c.json({ error: "Comment not found" }, 404);
    }

    // Check authorization (author or admin)
    const isAuthor = comment.user_id === userId;
    const userRole = authPayload.role || "member";
    const isAdmin = userRole === "admin";

    if (!isAuthor && !isAdmin) {
      return c.json({ error: "Not authorized to delete this comment" }, 403);
    }

    // Soft delete: set content to '[deleted]' instead of removing the record
    // This preserves the comment tree structure and keeps replies visible
    const now = Math.floor(Date.now() / 1000);
    const updateResult = await c.env.platform_db
      .prepare("UPDATE post_comments SET content = '[deleted]', updated_at = ? WHERE id = ?")
      .bind(now, commentId)
      .run();

    if (!updateResult.success) {
      throw new Error("Failed to delete comment");
    }

    return c.json({ success: true });
  } catch (err) {
    console.error("Error deleting comment:", err);
    return c.json({ error: "Failed to delete comment" }, 500);
  }
});

// ============================================================================
// Blogs API (/api/v1/blogs)
// ============================================================================

/**
 * GET /api/v1/blogs - List blogs with pagination
 * Public endpoint - no authentication required
 * Supports filtering by featured status, author_id, or current user's blogs (my=true)
 */
app.get("/api/v1/blogs", async (c) => {
  try {
    const limitParam = c.req.query("limit");
    const offsetParam = c.req.query("offset");
    const featuredParam = c.req.query("featured");
    const authorIdParam = c.req.query("author_id");
    const myParam = c.req.query("my");

    // Validation: Parse and validate limit and offset
    const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10), 1), 100) : 20; // Default 20, max 100
    const offset = offsetParam ? Math.max(parseInt(offsetParam, 10), 0) : 0; // Default 0

    // Build query - filter by featured, author_id, or current user
    let query = "SELECT * FROM blogs";
    const bindings: unknown[] = [];
    let whereClause = "";

    // If my=true, filter by current user's blogs (requires authentication)
    if (myParam === "true") {
      const user = c.get('user') as AuthPayload | undefined;
      if (!user) {
        return c.json({ error: "Authentication required to view your blogs" }, 401);
      }
      whereClause = " WHERE user_id = ?";
      bindings.push(user.userId);
    }
    // If author_id is provided, filter by that author
    else if (authorIdParam) {
      whereClause = " WHERE user_id = ?";
      bindings.push(authorIdParam);
    }
    // If featured is provided, filter by featured status
    else if (featuredParam !== undefined) {
      const featured = featuredParam === "true" ? 1 : 0;
      whereClause = " WHERE featured = ?";
      bindings.push(featured);
    }

    query += whereClause;

    // Count total blogs (matching filter if applied)
    const countQuery = `SELECT COUNT(*) as count FROM blogs${whereClause}`;
    const countResult = await c.env.platform_db
      .prepare(countQuery)
      .bind(...bindings)
      .first<{ count: number }>();
    const total = countResult?.count || 0;

    // Fetch blogs - ordered by created_at DESC (newest first)
    query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
    bindings.push(limit, offset);

    const results = await c.env.platform_db
      .prepare(query)
      .bind(...bindings)
      .all<Record<string, unknown>>();

    // Normalize blogs and attach author info and user like status
    const user = c.get('user') as AuthPayload | undefined;
    const blogsWithAuthorsAndLikes = await Promise.all(
      results.results.map(async (blog) => {
        // Fetch author name
        const author = await c.env.platform_db
          .prepare("SELECT name, email FROM users WHERE id = ?")
          .bind(blog.user_id)
          .first<{ name: string; email: string }>();

        // Check if current user has liked this blog
        let userHasLiked = false;
        if (user) {
          const likeRecord = await c.env.platform_db
            .prepare("SELECT 1 FROM blog_likes WHERE blog_id = ? AND user_id = ? LIMIT 1")
            .bind(blog.id, user.userId)
            .first();
          userHasLiked = !!likeRecord;
        }

        return {
          ...blog,
          // Normalize SQLite boolean fields (stored as 0/1)
          featured: Boolean(blog.featured),
          requires_auth: Boolean(blog.requires_auth),
          author_name: author?.name || "Unknown User",
          author_email: author?.email || "",
          liked_by_user: userHasLiked,
        };
      })
    );

    const response: GetBlogsResponse = {
      blogs: blogsWithAuthorsAndLikes as unknown as BlogWithLikeStatus[],
      total,
      limit,
      offset,
    };

    return c.json<GetBlogsResponse>(response);
  } catch (err) {
    console.error("Error fetching blogs:", err);
    return c.json({ error: "Failed to fetch blogs" }, 500);
  }
});

/**
 * GET /api/v1/blogs/:id - Get single blog by ID
 * Public endpoint - no authentication required
 * For members-only blogs (requires_auth=true), returns preview for unauthenticated users
 */
app.get("/api/v1/blogs/:id", async (c) => {
  try {
    const blogId = c.req.param("id");

    // Fetch blog
    const blog = await c.env.platform_db
      .prepare("SELECT * FROM blogs WHERE id = ?")
      .bind(blogId)
      .first<Record<string, unknown>>();

    if (!blog) {
      return c.json({ error: "Blog not found" }, 404);
    }

    // Check if blog requires authentication
    const requiresAuth = Boolean(blog.requires_auth);
    const user = c.get('user') as AuthPayload | undefined;
    const isAuthenticated = !!user;

    // Fetch author name and email
    const author = await c.env.platform_db
      .prepare("SELECT name, email FROM users WHERE id = ?")
      .bind(blog.user_id)
      .first<{ name: string; email: string }>();

    let content = String(blog.content);

    // If blog requires auth and user is not authenticated, return preview (first 200 chars)
    if (requiresAuth && !isAuthenticated) {
      const previewLength = 200;
      const textContent = content.replace(/<[^>]*>/g, ''); // Strip HTML tags for preview
      content = textContent.substring(0, previewLength);
      if (textContent.length > previewLength) {
        content += '...';
      }
    }

    const blogWithAuthor = {
      ...blog,
      content,
      // Normalize SQLite boolean fields (stored as 0/1)
      featured: Boolean(blog.featured),
      requires_auth: requiresAuth,
      author_name: author?.name || "Unknown User",
      author_email: author?.email || "",
    };

    return c.json<Blog>(blogWithAuthor as unknown as Blog);
  } catch (err) {
    console.error("Error fetching blog:", err);
    return c.json({ error: "Failed to fetch blog" }, 500);
  }
});

/**
 * POST /api/v1/blogs - Create a new blog
 * Authenticated endpoint - requires valid JWT token
 * Awards +10 points to the author (with diminishing returns after 2/hour)
 */
app.post("/api/v1/blogs", requireAuth, async (c) => {
  try {
    const authPayload = c.get("user") as AuthPayload | undefined;
    if (!authPayload) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const userId = authPayload.userId;

    // Parse request body
    const body = await c.req.json<CreateBlogRequest>();

    // Validation
    if (!body.title || body.title.trim() === "") {
      return c.json({ error: "Title is required" }, 400);
    }

    if (!body.content || body.content.trim() === "") {
      return c.json({ error: "Content is required" }, 400);
    }

    // Generate blog ID and timestamps
    const blogId = generateBlogId();
    const now = Math.floor(Date.now() / 1000);
    const requiresAuth = body.requires_auth ? 1 : 0; // Convert boolean to SQLite integer

    // Insert blog into database
    const insertResult = await c.env.platform_db
      .prepare(
        "INSERT INTO blogs (id, user_id, title, content, requires_auth, likes_count, comments_count, featured, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      )
      .bind(blogId, userId, body.title.trim(), body.content.trim(), requiresAuth, 0, 0, 0, now, now)
      .run();

    if (!insertResult.success) {
      throw new Error("Failed to create blog");
    }

    // Award points for creating a blog (with diminishing returns)
    await awardPointsForAction(
      c.env.platform_db,
      userId,
      "blog_created",
      blogId,
      POINTS_FOR_CREATE_BLOG
    );

    // Fetch the created blog
    const createdBlog = await c.env.platform_db
      .prepare("SELECT * FROM blogs WHERE id = ?")
      .bind(blogId)
      .first<Record<string, unknown>>();

    const normalizedBlog = normalizeBlog(createdBlog);

    return c.json<Blog>(normalizedBlog, 201);
  } catch (err) {
    console.error("Error creating blog:", err);
    return c.json({ error: "Failed to create blog" }, 500);
  }
});

/**
 * PUT /api/v1/blogs/:id - Update a blog
 * Authenticated endpoint - requires valid JWT token
 * Only the author can update their blog
 */
app.put("/api/v1/blogs/:id", requireAuth, async (c) => {
  try {
    const authPayload = c.get("user") as AuthPayload | undefined;
    if (!authPayload) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const blogId = c.req.param("id");
    const userId = authPayload.userId;

    // Fetch the blog
    const blog = await c.env.platform_db
      .prepare("SELECT * FROM blogs WHERE id = ?")
      .bind(blogId)
      .first<Record<string, unknown>>();

    if (!blog) {
      return c.json({ error: "Blog not found" }, 404);
    }

    // Check authorization (only author can update)
    if (blog.user_id !== userId) {
      return c.json({ error: "Not authorized to update this blog" }, 403);
    }

    // Parse request body
    const body = await c.req.json<UpdateBlogRequest>();

    // At least one field must be provided
    if (!body.title && !body.content && body.requires_auth === undefined) {
      return c.json({ error: "At least one field (title, content, or requires_auth) must be provided" }, 400);
    }

    // Update blog
    const now = Math.floor(Date.now() / 1000);
    const title = body.title?.trim() || blog.title;
    const content = body.content?.trim() || blog.content;
    const requiresAuth = body.requires_auth !== undefined ? (body.requires_auth ? 1 : 0) : blog.requires_auth;

    const updateResult = await c.env.platform_db
      .prepare("UPDATE blogs SET title = ?, content = ?, requires_auth = ?, updated_at = ? WHERE id = ?")
      .bind(title, content, requiresAuth, now, blogId)
      .run();

    if (!updateResult.success) {
      throw new Error("Failed to update blog");
    }

    // Fetch updated blog
    const updatedBlog = await c.env.platform_db
      .prepare("SELECT * FROM blogs WHERE id = ?")
      .bind(blogId)
      .first<Record<string, unknown>>();

    const normalizedBlog = normalizeBlog(updatedBlog);

    return c.json<Blog>(normalizedBlog);
  } catch (err) {
    console.error("Error updating blog:", err);
    return c.json({ error: "Failed to update blog" }, 500);
  }
});

/**
 * DELETE /api/v1/blogs/:id - Delete a blog
 * Authenticated endpoint - requires valid JWT token
 * Author or admin can delete a blog
 */
app.delete("/api/v1/blogs/:id", requireAuth, async (c) => {
  try {
    const authPayload = c.get("user") as AuthPayload | undefined;
    if (!authPayload) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const blogId = c.req.param("id");
    const userId = authPayload.userId;

    // Fetch the blog
    const blog = await c.env.platform_db
      .prepare("SELECT * FROM blogs WHERE id = ?")
      .bind(blogId)
      .first<Record<string, unknown>>();

    if (!blog) {
      return c.json({ error: "Blog not found" }, 404);
    }

    // Check authorization (author or admin)
    const isAuthor = blog.user_id === userId;
    const userRole = authPayload.role || "member";
    const isAdmin = userRole === "admin";

    if (!isAuthor && !isAdmin) {
      return c.json({ error: "Not authorized to delete this blog" }, 403);
    }

    // Delete blog
    const deleteResult = await c.env.platform_db
      .prepare("DELETE FROM blogs WHERE id = ?")
      .bind(blogId)
      .run();

    if (!deleteResult.success) {
      throw new Error("Failed to delete blog");
    }

    return c.json({ success: true });
  } catch (err) {
    console.error("Error deleting blog:", err);
    return c.json({ error: "Failed to delete blog" }, 500);
  }
});

/**
 * POST /api/v1/blogs/:id/like - Like a blog
 * Authenticated endpoint - requires valid JWT token
 * Awards +2 points to blog author for receiving the like
 * User can only like a blog once
 * Increments likes_count on the blog
 */
app.post("/api/v1/blogs/:id/like", requireAuth, async (c) => {
  try {
    const authPayload = c.get("user") as AuthPayload | undefined;
    if (!authPayload) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const blogId = c.req.param("id");
    const userId = authPayload.userId;

    // Check if blog exists
    const blog = await c.env.platform_db
      .prepare("SELECT * FROM blogs WHERE id = ?")
      .bind(blogId)
      .first<Record<string, unknown>>();

    if (!blog) {
      return c.json({ error: "Blog not found" }, 404);
    }

    // Check if user already liked this blog
    const existingLike = await c.env.platform_db
      .prepare("SELECT * FROM blog_likes WHERE blog_id = ? AND user_id = ?")
      .bind(blogId, userId)
      .first();

    if (existingLike) {
      return c.json({ error: "You already liked this blog" }, 400);
    }

    // Create like record
    const likeId = generateBlogLikeId();
    const now = Math.floor(Date.now() / 1000);

    const insertResult = await c.env.platform_db
      .prepare("INSERT INTO blog_likes (id, blog_id, user_id, created_at) VALUES (?, ?, ?, ?)")
      .bind(likeId, blogId, userId, now)
      .run();

    if (!insertResult.success) {
      throw new Error("Failed to create like");
    }

    // Increment likes_count on blog
    const newLikesCount = (blog.likes_count as number) + 1;
    await c.env.platform_db
      .prepare("UPDATE blogs SET likes_count = ? WHERE id = ?")
      .bind(newLikesCount, blogId)
      .run();

    // Award points to the blog author for receiving a like (silent failure if points system fails)
    const blogAuthorId = blog.user_id as string;
    if (blogAuthorId !== userId) {
      // Only award points if the liker is not the blog author
      await awardPointsForAction(
        c.env.platform_db,
        blogAuthorId,
        "like_received",
        likeId,
        POINTS_FOR_RECEIVING_LIKE
      );
    }

    // Fetch updated blog
    const updatedBlog = await c.env.platform_db
      .prepare("SELECT * FROM blogs WHERE id = ?")
      .bind(blogId)
      .first<Record<string, unknown>>();

    const normalizedBlog = normalizeBlog(updatedBlog);

    return c.json({
      blog: normalizedBlog,
      liked_by_user: true,
      likes_count: normalizedBlog.likes_count,
    });
  } catch (err) {
    console.error("Error liking blog:", err);
    return c.json({ error: "Failed to like blog" }, 500);
  }
});

/**
 * DELETE /api/v1/blogs/:id/like - Unlike a blog
 * Authenticated endpoint - requires valid JWT token
 * Decrements likes_count on the blog
 */
app.delete("/api/v1/blogs/:id/like", requireAuth, async (c) => {
  try {
    const authPayload = c.get("user") as AuthPayload | undefined;
    if (!authPayload) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const blogId = c.req.param("id");
    const userId = authPayload.userId;

    // Check if blog exists
    const blog = await c.env.platform_db
      .prepare("SELECT * FROM blogs WHERE id = ?")
      .bind(blogId)
      .first<Record<string, unknown>>();

    if (!blog) {
      return c.json({ error: "Blog not found" }, 404);
    }

    // Check if user has liked this blog
    const existingLike = await c.env.platform_db
      .prepare("SELECT * FROM blog_likes WHERE blog_id = ? AND user_id = ?")
      .bind(blogId, userId)
      .first();

    if (!existingLike) {
      return c.json({ error: "You have not liked this blog" }, 400);
    }

    // Delete like record
    const deleteResult = await c.env.platform_db
      .prepare("DELETE FROM blog_likes WHERE blog_id = ? AND user_id = ?")
      .bind(blogId, userId)
      .run();

    if (!deleteResult.success) {
      throw new Error("Failed to delete like");
    }

    // Decrement likes_count on blog
    const newLikesCount = Math.max((blog.likes_count as number) - 1, 0);
    await c.env.platform_db
      .prepare("UPDATE blogs SET likes_count = ? WHERE id = ?")
      .bind(newLikesCount, blogId)
      .run();

    // Fetch updated blog
    const updatedBlog = await c.env.platform_db
      .prepare("SELECT * FROM blogs WHERE id = ?")
      .bind(blogId)
      .first<Record<string, unknown>>();

    const normalizedBlog = normalizeBlog(updatedBlog);

    return c.json({
      blog: normalizedBlog,
      liked_by_user: false,
      likes_count: normalizedBlog.likes_count,
    });
  } catch (err) {
    console.error("Error unliking blog:", err);
    return c.json({ error: "Failed to unlike blog" }, 500);
  }
});

/**
 * POST /api/v1/blogs/:id/comments - Add a comment to a blog
 * Authenticated endpoint - requires valid JWT token
 * Increments comments_count on the blog
 */
app.post("/api/v1/blogs/:id/comments", requireAuth, async (c) => {
  try {
    const authPayload = c.get("user") as AuthPayload | undefined;
    if (!authPayload) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const blogId = c.req.param("id");
    const userId = authPayload.userId;

    // Parse request body
    const body = await c.req.json<CreateBlogCommentRequest>();

    // Validation
    if (!body.content || body.content.trim() === "") {
      return c.json({ error: "Comment content is required" }, 400);
    }

    // Security: Check for dangerous HTML
    if (body.content.includes('<script') || body.content.includes('</script>') || body.content.includes('javascript:')) {
      return c.json({ error: "Invalid content" }, 400);
    }

    // Check if blog exists
    const blog = await c.env.platform_db
      .prepare("SELECT * FROM blogs WHERE id = ?")
      .bind(blogId)
      .first<Record<string, unknown>>();

    if (!blog) {
      return c.json({ error: "Blog not found" }, 404);
    }

    // Validate parent comment if provided
    if (body.parent_comment_id) {
      const parentComment = await c.env.platform_db
        .prepare("SELECT * FROM blog_comments WHERE id = ? AND blog_id = ?")
        .bind(body.parent_comment_id, blogId)
        .first();

      if (!parentComment) {
        return c.json({ error: "Parent comment not found" }, 400);
      }
    }

    // Create comment
    const commentId = generateBlogCommentId();
    const now = Math.floor(Date.now() / 1000);

    const insertResult = await c.env.platform_db
      .prepare(
        "INSERT INTO blog_comments (id, blog_id, user_id, content, parent_comment_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
      )
      .bind(commentId, blogId, userId, body.content.trim(), body.parent_comment_id || null, now, now)
      .run();

    if (!insertResult.success) {
      throw new Error("Failed to create comment");
    }

    // Increment comments_count on blog
    const newCommentsCount = (blog.comments_count as number) + 1;
    await c.env.platform_db
      .prepare("UPDATE blogs SET comments_count = ? WHERE id = ?")
      .bind(newCommentsCount, blogId)
      .run();

    // Award points to the comment creator (silent failure if points system fails)
    await awardPointsForAction(
      c.env.platform_db,
      userId,
      "comment_created",
      commentId,
      POINTS_FOR_CREATE_COMMENT
    );

    // Award points to the blog author for receiving a comment (silent failure if points system fails)
    const blogAuthorId = blog.user_id as string;
    if (blogAuthorId !== userId) {
      // Only award points if the commenter is not the blog author
      await awardPointsForAction(
        c.env.platform_db,
        blogAuthorId,
        "comment_received",
        commentId,
        POINTS_FOR_RECEIVING_COMMENT
      );
    }

    // Fetch created comment with author info
    const comment = await c.env.platform_db
      .prepare("SELECT * FROM blog_comments WHERE id = ?")
      .bind(commentId)
      .first<Record<string, unknown>>();

    const user = await c.env.platform_db
      .prepare("SELECT name, email FROM users WHERE id = ?")
      .bind(userId)
      .first<{ name: string; email: string }>();

    const commentWithAuthor = normalizeBlogCommentWithAuthor({
      ...comment,
      author_name: user?.name || "Unknown User",
      author_email: user?.email || "",
    });

    return c.json(commentWithAuthor, 201);
  } catch (err) {
    console.error("Error creating comment:", err);
    return c.json({ error: "Failed to create comment" }, 500);
  }
});

/**
 * GET /api/v1/blogs/:id/comments - Get all comments for a blog
 * Public endpoint - no authentication required
 * Supports pagination
 */
app.get("/api/v1/blogs/:id/comments", async (c) => {
  try {
    const blogId = c.req.param("id");

    // Check if blog exists
    const blog = await c.env.platform_db
      .prepare("SELECT * FROM blogs WHERE id = ?")
      .bind(blogId)
      .first();

    if (!blog) {
      return c.json({ error: "Blog not found" }, 404);
    }

    // Parse pagination parameters
    const limitParam = c.req.query("limit");
    const offsetParam = c.req.query("offset");

    const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10), 1), 100) : 20;
    const offset = offsetParam ? Math.max(parseInt(offsetParam, 10), 0) : 0;

    // Count total comments
    const countResult = await c.env.platform_db
      .prepare("SELECT COUNT(*) as count FROM blog_comments WHERE blog_id = ?")
      .bind(blogId)
      .first<{ count: number }>();
    const total = countResult?.count || 0;

    // Fetch comments with author info
    const comments = await c.env.platform_db
      .prepare(
        "SELECT bc.*, u.name as author_name, u.email as author_email FROM blog_comments bc JOIN users u ON bc.user_id = u.id WHERE bc.blog_id = ? ORDER BY bc.created_at ASC LIMIT ? OFFSET ?"
      )
      .bind(blogId, limit, offset)
      .all<Record<string, unknown>>();

    const normalizedComments = (comments.results || []).map((comment) =>
      normalizeBlogCommentWithAuthor({
        ...comment,
        author_name: comment.author_name as string,
        author_email: comment.author_email as string,
      })
    );

    return c.json<GetBlogCommentsResponse>({
      comments: normalizedComments,
      total,
      limit,
      offset,
    });
  } catch (err) {
    console.error("Error fetching comments:", err);
    return c.json({ error: "Failed to fetch comments" }, 500);
  }
});

/**
 * DELETE /api/v1/blog-comments/:id - Delete a comment (soft delete)
 * Authenticated endpoint
 * Author or admin can delete a comment
 * Performs soft delete by setting content to '[deleted]' and preserving thread structure
 */
app.delete("/api/v1/blog-comments/:id", requireAuth, async (c) => {
  try {
    const authPayload = c.get("user") as AuthPayload | undefined;
    if (!authPayload) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const commentId = c.req.param("id");
    const userId = authPayload.userId;

    // Fetch the comment
    const comment = await c.env.platform_db
      .prepare("SELECT * FROM blog_comments WHERE id = ?")
      .bind(commentId)
      .first<Record<string, unknown>>();

    if (!comment) {
      return c.json({ error: "Comment not found" }, 404);
    }

    // Check authorization (author or admin)
    const isAuthor = comment.user_id === userId;
    const userRole = authPayload.role || "member";
    const isAdmin = userRole === "admin";

    if (!isAuthor && !isAdmin) {
      return c.json({ error: "Not authorized to delete this comment" }, 403);
    }

    // Soft delete: set content to '[deleted]'
    const now = Math.floor(Date.now() / 1000);
    const updateResult = await c.env.platform_db
      .prepare("UPDATE blog_comments SET content = '[deleted]', updated_at = ? WHERE id = ?")
      .bind(now, commentId)
      .run();

    if (!updateResult.success) {
      throw new Error("Failed to delete comment");
    }

    return c.json({ success: true });
  } catch (err) {
    console.error("Error deleting comment:", err);
    return c.json({ error: "Failed to delete comment" }, 500);
  }
});

/**
 * PATCH /api/v1/blogs/:id/feature - Feature or unfeature a blog (admin only)
 * Authenticated endpoint - requires admin role
 * Awards +50 bonus points to author when blog is featured
 */
app.patch("/api/v1/blogs/:id/feature", requireAuth, requireAdmin, async (c) => {
  try {
    const blogId = c.req.param("id");

    // Parse request body
    const body = await c.req.json<FeatureBlogRequest>();

    if (typeof body.featured !== "boolean") {
      return c.json({ error: "Featured field must be a boolean" }, 400);
    }

    // Check if blog exists
    const blog = await c.env.platform_db
      .prepare("SELECT * FROM blogs WHERE id = ?")
      .bind(blogId)
      .first<Record<string, unknown>>();

    if (!blog) {
      return c.json({ error: "Blog not found" }, 404);
    }

    const wasFeatured = Boolean(blog.featured);
    const willBeFeatured = body.featured;

    // Update featured status
    const now = Math.floor(Date.now() / 1000);
    const updateResult = await c.env.platform_db
      .prepare("UPDATE blogs SET featured = ?, updated_at = ? WHERE id = ?")
      .bind(willBeFeatured ? 1 : 0, now, blogId)
      .run();

    if (!updateResult.success) {
      throw new Error("Failed to update blog featured status");
    }

    // Award bonus points if blog is being featured (not if already featured)
    let pointsAwarded = 0;
    if (willBeFeatured && !wasFeatured) {
      const authorId = blog.user_id as string;
      
      pointsAwarded = await awardPointsForAction(
        c.env.platform_db,
        authorId,
        "blog_featured",
        blogId,
        POINTS_FOR_BLOG_FEATURED
      );
    }

    // Fetch updated blog
    const updatedBlog = await c.env.platform_db
      .prepare("SELECT * FROM blogs WHERE id = ?")
      .bind(blogId)
      .first<Record<string, unknown>>();

    const normalizedBlog = normalizeBlog(updatedBlog);

    return c.json({
      blog: normalizedBlog,
      points_awarded: pointsAwarded,
    });
  } catch (err) {
    console.error("Error featuring blog:", err);
    return c.json({ error: "Failed to feature blog" }, 500);
  }
});

// ============================================================================
// Legacy Route (kept for backward compatibility)
// ============================================================================

app.get("/api/", (c) => c.json({ name: "Cloudflare" }));

export default app;
