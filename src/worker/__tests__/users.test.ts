/**
 * Tests for User CRUD API endpoints
 * Following TDD: Write tests FIRST, then implement the API
 *
 * Endpoints under test:
 * - POST /api/v1/users - Create new user
 * - GET /api/v1/users/:id - Get user by ID
 * - PUT /api/v1/users/:id - Update user
 */

import { describe, it, expect, beforeEach } from 'vitest';
import app from '../index';
import { createMockDb } from './utils/mockDbFactory';
import { createTestEnv } from './utils/testAuth';
import { expectCreated, expectBadRequest, expectNotFound, expectConflict } from './utils/assertions';

// ============================================================================
// Test Suite
// ============================================================================

describe('User CRUD API', () => {
  let mockDb: ReturnType<typeof createMockDb>;
  let mockEnv: ReturnType<typeof createTestEnv>;

  beforeEach(() => {
    mockDb = createMockDb({ tables: { users: {} } });
    mockEnv = createTestEnv({ platform_db: mockDb as unknown });
  });

  // ==========================================================================
  // POST /api/v1/users - Create User
  // ==========================================================================

  describe('POST /api/v1/users', () => {
    it('should create a new user with valid data', async () => {
      const userData = {
        email: 'test@example.com',
        name: 'Test User',
      };

      const req = new Request('http://localhost/api/v1/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });

      const res = await app.fetch(req, mockEnv);

      // Debug: log the response if it's not 201
      if (res.status !== 201) {
        const errorData = await res.json();
        console.log('User creation failed:', res.status, errorData);
      }

      const data = await expectCreated(res);

      expect(data).toMatchObject({
        id: expect.any(String),
        email: userData.email,
        name: userData.name,
        created_at: expect.any(Number),
        updated_at: expect.any(Number),
      });
      expect(data.id).toBeTruthy();
      expect(data.created_at).toBe(data.updated_at); // Should be same on creation
    });

    it('should return 400 when email is missing', async () => {
      const req = new Request('http://localhost/api/v1/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test User' }), // Missing email
      });

      const res = await app.fetch(req, mockEnv);
      await expectBadRequest(res, undefined, 'email');
    });

    it('should return 400 when name is missing', async () => {
      const req = new Request('http://localhost/api/v1/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com' }), // Missing name
      });

      const res = await app.fetch(req, mockEnv);
      await expectBadRequest(res, undefined, 'name');
    });

    it('should return 400 when email format is invalid', async () => {
      const req = new Request('http://localhost/api/v1/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'invalid-email', name: 'Test User' }),
      });

      const res = await app.fetch(req, mockEnv);
      await expectBadRequest(res, undefined, 'email');
    });

    it('should return 409 when email already exists', async () => {
      const userData = {
        email: 'duplicate@example.com',
        name: 'User One',
      };

      // Create first user
      const req1 = new Request('http://localhost/api/v1/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });
      await app.fetch(req1, mockEnv);

      // Try to create second user with same email
      const req2 = new Request('http://localhost/api/v1/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...userData, name: 'User Two' }),
      });
      const res = await app.fetch(req2, mockEnv);
      await expectConflict(res, undefined, 'already exists');
    });

    it('should return 400 when body is not JSON', async () => {
      const req = new Request('http://localhost/api/v1/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not json',
      });

      const res = await app.fetch(req, mockEnv);
      await expectBadRequest(res);
    });
  });

  // ==========================================================================
  // GET /api/v1/users/:id - Get User by ID
  // ==========================================================================

  describe('GET /api/v1/users/:id', () => {
    it('should return user when ID exists', async () => {
      // First, create a user
      const createReq = new Request('http://localhost/api/v1/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'gettest@example.com',
          name: 'Get Test User',
        }),
      });
      const createRes = await app.fetch(createReq, mockEnv);
      const created = await createRes.json();

      // Now get the user
      const getReq = new Request(`http://localhost/api/v1/users/${created.id}`, {
        method: 'GET',
      });
      const getRes = await app.fetch(getReq, mockEnv);

      expect(getRes.status).toBe(200);
      const data = await getRes.json();
      expect(data).toEqual(created);
    });

    it('should return 404 when user does not exist', async () => {
      const req = new Request('http://localhost/api/v1/users/nonexistent-id', {
        method: 'GET',
      });
      const res = await app.fetch(req, mockEnv);
      await expectNotFound(res);
    });

    it('should return 400 when ID parameter is empty', async () => {
      const req = new Request('http://localhost/api/v1/users/ ', {
        method: 'GET',
      });
      const res = await app.fetch(req, mockEnv);

      // Either 404 (route not found) or 400 (bad request) is acceptable
      expect([400, 404]).toContain(res.status);
    });
  });

  // ==========================================================================
  // PUT /api/v1/users/:id - Update User
  // ==========================================================================

  describe('PUT /api/v1/users/:id', () => {
    it('should update user name', async () => {
      // Create a user first
      const createReq = new Request('http://localhost/api/v1/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'update@example.com',
          name: 'Original Name',
        }),
      });
      const createRes = await app.fetch(createReq, mockEnv);
      const created = await createRes.json();

      // Update the user's name
      const updateReq = new Request(`http://localhost/api/v1/users/${created.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Updated Name' }),
      });
      const updateRes = await app.fetch(updateReq, mockEnv);

      expect(updateRes.status).toBe(200);
      const updated = await updateRes.json();
      expect(updated.name).toBe('Updated Name');
      expect(updated.email).toBe(created.email); // Email unchanged
      expect(updated.updated_at).toBeGreaterThanOrEqual(created.updated_at);
    });

    it('should update user email', async () => {
      // Create a user first
      const createReq = new Request('http://localhost/api/v1/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'old@example.com',
          name: 'Test User',
        }),
      });
      const createRes = await app.fetch(createReq, mockEnv);
      const created = await createRes.json();

      // Update the user's email
      const updateReq = new Request(`http://localhost/api/v1/users/${created.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'new@example.com' }),
      });
      const updateRes = await app.fetch(updateReq, mockEnv);

      expect(updateRes.status).toBe(200);
      const updated = await updateRes.json();
      expect(updated.email).toBe('new@example.com');
      expect(updated.name).toBe(created.name); // Name unchanged
    });

    it('should update both name and email', async () => {
      // Create a user first
      const createReq = new Request('http://localhost/api/v1/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'original@example.com',
          name: 'Original Name',
        }),
      });
      const createRes = await app.fetch(createReq, mockEnv);
      const created = await createRes.json();

      // Update both fields
      const updateReq = new Request(`http://localhost/api/v1/users/${created.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'updated@example.com',
          name: 'Updated Name',
        }),
      });
      const updateRes = await app.fetch(updateReq, mockEnv);

      expect(updateRes.status).toBe(200);
      const updated = await updateRes.json();
      expect(updated.email).toBe('updated@example.com');
      expect(updated.name).toBe('Updated Name');
    });

    it('should return 404 when updating non-existent user', async () => {
      const req = new Request('http://localhost/api/v1/users/nonexistent-id', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'New Name' }),
      });
      const res = await app.fetch(req, mockEnv);
      await expectNotFound(res);
    });

    it('should return 400 when update email format is invalid', async () => {
      // Create a user first
      const createReq = new Request('http://localhost/api/v1/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'valid@example.com',
          name: 'Test User',
        }),
      });
      const createRes = await app.fetch(createReq, mockEnv);
      const created = await createRes.json();

      // Try to update with invalid email
      const updateReq = new Request(`http://localhost/api/v1/users/${created.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'invalid-email' }),
      });
      const updateRes = await app.fetch(updateReq, mockEnv);
      await expectBadRequest(updateRes, undefined, 'email');
    });

    it('should return 400 when no fields provided to update', async () => {
      // Create a user first
      const createReq = new Request('http://localhost/api/v1/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          name: 'Test User',
        }),
      });
      const createRes = await app.fetch(createReq, mockEnv);
      const created = await createRes.json();

      // Try to update with empty body
      const updateReq = new Request(`http://localhost/api/v1/users/${created.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const updateRes = await app.fetch(updateReq, mockEnv);
      await expectBadRequest(updateRes);
    });
  });

  // ==========================================================================
  // Edge Cases and Security
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle very long email addresses', async () => {
      const longEmail = 'a'.repeat(100) + '@example.com';

      const req = new Request('http://localhost/api/v1/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: longEmail,
          name: 'Test User',
        }),
      });
      const res = await app.fetch(req, mockEnv);

      // Should either accept or reject gracefully
      expect([201, 400]).toContain(res.status);
    });

    it('should handle very long names', async () => {
      const longName = 'A'.repeat(500);

      const req = new Request('http://localhost/api/v1/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          name: longName,
        }),
      });
      const res = await app.fetch(req, mockEnv);

      // Should either accept or reject gracefully
      expect([201, 400]).toContain(res.status);
    });

    it('should handle special characters in name', async () => {
      const req = new Request('http://localhost/api/v1/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'special@example.com',
          name: "O'Brien-Smith (José) 李明",
        }),
      });
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.name).toBe("O'Brien-Smith (José) 李明");
    });
  });
});
