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
  GetMatchesResponse
} from "../types/api";
import type { MentorProfile } from "../types/mentor";
import type { Match, MatchStatus } from "../types/match";

const app = new Hono<{ Bindings: Env }>();

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
  } catch (error) {
    return c.json({ error: "Invalid request body" }, 400);
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
  } catch (error) {
    return c.json({ error: "Invalid request body" }, 400);
  }
});

// ============================================================================
// Mentor Profile Management API (/api/v1/mentors/profiles)
// ============================================================================

/**
 * POST /api/v1/mentors/profiles - Create mentor profile
 */
app.post("/api/v1/mentors/profiles", async (c) => {
  try {
    const body = await c.req.json<CreateMentorProfileRequest>();

    // Validation: Required fields
    if (!body.user_id || !body.nick_name || !body.bio ||
        body.mentoring_levels === undefined || body.payment_types === undefined) {
      return c.json({ error: "user_id, nick_name, bio, mentoring_levels, and payment_types are required" }, 400);
    }

    // Validation: Bit flags must be non-negative integers
    if (body.mentoring_levels < 0 || body.payment_types < 0) {
      return c.json({ error: "Bit flags must be non-negative integers" }, 400);
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
          hourly_rate, payment_types, allow_reviews, allow_recording, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
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
        body.allow_reviews !== undefined ? body.allow_reviews : true,
        body.allow_recording !== undefined ? body.allow_recording : true,
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
      allow_reviews: body.allow_reviews !== undefined ? body.allow_reviews : true,
      allow_recording: body.allow_recording !== undefined ? body.allow_recording : true,
      created_at: timestamp,
      updated_at: timestamp,
    };

    return c.json<MentorProfile>(profile, 201);
  } catch (error) {
    return c.json({ error: "Invalid request body" }, 400);
  }
});

/**
 * GET /api/v1/mentors/profiles/:id - Get mentor profile by ID
 */
app.get("/api/v1/mentors/profiles/:id", async (c) => {
  const id = c.req.param("id");

  const profile = await c.env.platform_db
    .prepare("SELECT * FROM mentor_profiles WHERE id = ?")
    .bind(id)
    .first<MentorProfile>();

  if (!profile) {
    return c.json({ error: "Mentor profile not found" }, 404);
  }

  return c.json<MentorProfile>(profile);
});

/**
 * PUT /api/v1/mentors/profiles/:id - Update mentor profile
 */
app.put("/api/v1/mentors/profiles/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json<UpdateMentorProfileRequest>();

    // Validation: At least one field must be provided
    const hasUpdates = body.nick_name || body.bio || body.mentoring_levels !== undefined ||
                       body.availability !== undefined || body.hourly_rate !== undefined ||
                       body.payment_types !== undefined || body.allow_reviews !== undefined ||
                       body.allow_recording !== undefined;

    if (!hasUpdates) {
      return c.json({ error: "At least one field must be provided for update" }, 400);
    }

    // Validation: Bit flags must be non-negative if provided
    if ((body.mentoring_levels !== undefined && body.mentoring_levels < 0) ||
        (body.payment_types !== undefined && body.payment_types < 0)) {
      return c.json({ error: "Bit flags must be non-negative integers" }, 400);
    }

    // Check if profile exists
    const existing = await c.env.platform_db
      .prepare("SELECT * FROM mentor_profiles WHERE id = ?")
      .bind(id)
      .first();

    if (!existing) {
      return c.json({ error: "Mentor profile not found" }, 404);
    }

    // Build update query dynamically
    const updates: string[] = [];
    const params: any[] = [];

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
    if (body.allow_reviews !== undefined) {
      updates.push("allow_reviews = ?");
      params.push(body.allow_reviews);
    }
    if (body.allow_recording !== undefined) {
      updates.push("allow_recording = ?");
      params.push(body.allow_recording);
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

    return c.json<MentorProfile>(updated);
  } catch (error) {
    return c.json({ error: "Invalid request body" }, 400);
  }
});

/**
 * DELETE /api/v1/mentors/profiles/:id - Delete mentor profile
 */
app.delete("/api/v1/mentors/profiles/:id", async (c) => {
  const id = c.req.param("id");

  // Check if profile exists
  const existing = await c.env.platform_db
    .prepare("SELECT id FROM mentor_profiles WHERE id = ?")
    .bind(id)
    .first();

  if (!existing) {
    return c.json({ error: "Mentor profile not found" }, 404);
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
 * - hourly_rate_max: maximum hourly rate
 * - hourly_rate_min: minimum hourly rate
 * - nick_name: partial nickname search (case-insensitive)
 * - limit: results per page (default: 20, max: 100)
 * - offset: pagination offset (default: 0)
 */
app.get("/api/v1/mentors/search", async (c) => {
  try {
    // Parse query parameters
    const url = new URL(c.req.url);
    const mentoring_levels = url.searchParams.get("mentoring_levels");
    const payment_types = url.searchParams.get("payment_types");
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
    if (hourly_rate_max && isNaN(parseInt(hourly_rate_max, 10))) {
      return c.json({ error: "hourly_rate_max must be a valid number" }, 400);
    }
    if (hourly_rate_min && isNaN(parseInt(hourly_rate_min, 10))) {
      return c.json({ error: "hourly_rate_min must be a valid number" }, 400);
    }

    // Build WHERE clause dynamically
    const conditions: string[] = [];
    const params: any[] = [];

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
      mentors: results.results || [],
      total,
      limit,
      offset,
    };

    return c.json<SearchMentorsResponse>(response);
  } catch (error) {
    console.error("Search error:", error);
    return c.json({ error: "Invalid request", details: error instanceof Error ? error.message : String(error) }, 400);
  }
});

// ============================================================================
// Match Management API (/api/v1/matches)
// ============================================================================

/**
 * POST /api/v1/matches - Create match request (mentee-initiated)
 */
app.post("/api/v1/matches", async (c) => {
  try {
    const body = await c.req.json<CreateMatchRequest>();

    // Validation: Required fields
    if (!body.mentor_id) {
      return c.json({ error: "mentor_id is required" }, 400);
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

    // Get current user (mentee) - in real app this would come from auth
    // For now, assume it's injected in the context or body
    const menteeId = c.req.header("X-User-ID") || body.mentee_id;
    if (!menteeId) {
      return c.json({ error: "mentee_id or X-User-ID header required" }, 400);
    }

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

    // Create match
    const matchId = generateId();
    const timestamp = getTimestamp();

    await c.env.platform_db
      .prepare(
        "INSERT INTO matches (id, mentor_id, mentee_id, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
      )
      .bind(matchId, body.mentor_id, menteeId, "pending", timestamp, timestamp)
      .run();

    const match: Match = {
      id: matchId,
      mentor_id: body.mentor_id,
      mentee_id: menteeId,
      status: "pending",
      created_at: timestamp,
      updated_at: timestamp,
    };

    return c.json<Match>(match, 201);
  } catch (error) {
    return c.json({ error: "Invalid request body" }, 400);
  }
});

/**
 * GET /api/v1/matches - List matches for user (mentor or mentee)
 */
app.get("/api/v1/matches", async (c) => {
  try {
    // Get current user - in real app this would come from auth
    const userId = c.req.header("X-User-ID");
    if (!userId) {
      return c.json({ error: "X-User-ID header required" }, 400);
    }

    const statusParam = c.req.query("status");
    const roleParam = c.req.query("role");

    // Validate status if provided
    if (statusParam && !["pending", "accepted", "rejected", "active", "completed"].includes(statusParam)) {
      return c.json({ error: "Invalid status value" }, 400);
    }

    // Build WHERE clause
    const conditions: string[] = [];
    const params: any[] = [];

    // Filter by user (as mentor or mentee)
    conditions.push("(mentor_id = ? OR mentee_id = ?)");
    params.push(userId, userId);

    // Filter by role if provided
    if (roleParam === "mentor") {
      conditions.push("mentor_id = ?");
      params.push(userId);
    } else if (roleParam === "mentee") {
      conditions.push("mentee_id = ?");
      params.push(userId);
    }

    // Filter by status if provided
    if (statusParam) {
      conditions.push("status = ?");
      params.push(statusParam);
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;

    // Get matches
    const results = await c.env.platform_db
      .prepare(`SELECT * FROM matches ${whereClause} ORDER BY created_at DESC`)
      .bind(...params)
      .all<Match>();

    const response: GetMatchesResponse = {
      matches: results.results || [],
    };

    return c.json<GetMatchesResponse>(response);
  } catch (error) {
    return c.json({ error: "Invalid request" }, 400);
  }
});

/**
 * POST /api/v1/matches/:id/respond - Mentor accepts or rejects match
 */
app.post("/api/v1/matches/:id/respond", async (c) => {
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
    let newStatus = body.action === "accept" ? "active" : "rejected";

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

    return c.json<Match>(updated);
  } catch (error) {
    return c.json({ error: "Invalid request body" }, 400);
  }
});

/**
 * PATCH /api/v1/matches/:id/complete - Mark match as completed
 */
app.patch("/api/v1/matches/:id/complete", async (c) => {
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

    return c.json<Match>(updated);
  } catch (error) {
    return c.json({ error: "Invalid request" }, 400);
  }
});

/**
 * DELETE /api/v1/matches/:id - Cancel/delete match
 */
app.delete("/api/v1/matches/:id", async (c) => {
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
// Legacy Route (kept for backward compatibility)
// ============================================================================

app.get("/api/", (c) => c.json({ name: "Cloudflare" }));

export default app;
