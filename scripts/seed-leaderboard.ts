import { faker } from '@faker-js/faker/locale/zh_CN';
import { randomUUID } from 'crypto';
import { spawn } from 'child_process';
import { writeFileSync, unlinkSync, existsSync } from 'fs';
import { tmpdir } from 'os';

interface User {
  id: string;
  email: string;
  name: string;
  created_at: number;
  updated_at: number;
}

interface UserPoints {
  id: string;
  user_id: string;
  points: number;
  updated_at: number;
}

// Generate realistic names in Chinese format
function generateUsers(count: number): User[] {
  const users: User[] = [];
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();

    users.push({
      id: randomUUID(),
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@leaderboard.local`,
      name: `${lastName}${firstName}`,
      created_at: now,
      updated_at: now,
    });
  }

  return users;
}

// Generate points distribution: top tier (1000-5000), mid tier (500-999), lower tier (100-499)
function generateUserPoints(users: User[]): UserPoints[] {
  const points: UserPoints[] = [];
  const now = Date.now();

  users.forEach((user, index) => {
    let pointValue: number;

    if (index < 2) {
      // Top 2: 1000-5000 points
      pointValue = faker.number.int({ min: 1000, max: 5000 });
    } else if (index < 6) {
      // Mid 4: 500-999 points
      pointValue = faker.number.int({ min: 500, max: 999 });
    } else {
      // Lower 4: 100-499 points
      pointValue = faker.number.int({ min: 100, max: 499 });
    }

    points.push({
      id: randomUUID(),
      user_id: user.id,
      points: pointValue,
      updated_at: now,
    });
  });

  // Sort by points descending to show distribution clearly
  points.sort((a, b) => b.points - a.points);

  return points;
}

function buildSQL(users: User[], userPoints: UserPoints[]): string {
  let sql = '-- Clear existing data (idempotent)\n';
  sql += '-- Delete in reverse order of foreign key dependencies\n';
  sql += 'DELETE FROM post_comments;\n';
  sql += 'DELETE FROM post_likes;\n';
  sql += 'DELETE FROM posts;\n';
  sql += 'DELETE FROM matches;\n';
  sql += 'DELETE FROM mentor_profiles;\n';
  sql += 'DELETE FROM user_roles;\n';
  sql += 'DELETE FROM user_points;\n';
  sql += 'DELETE FROM users;\n\n';

  sql += '-- Insert users\n';
  for (const user of users) {
    sql += `INSERT INTO users (id, email, name, created_at, updated_at) VALUES ('${user.id}', '${user.email}', '${user.name.replace(/'/g, "''")}', ${user.created_at}, ${user.updated_at});\n`;
  }

  sql += '\n-- Insert user points\n';
  for (const points of userPoints) {
    sql += `INSERT INTO user_points (id, user_id, points, updated_at) VALUES ('${points.id}', '${points.user_id}', ${points.points}, ${points.updated_at});\n`;
  }

  return sql;
}

async function executeSQL(sql: string): Promise<void> {
  const tempFile = `${tmpdir()}/.seed-leaderboard-${Date.now()}.sql`;

  writeFileSync(tempFile, sql, 'utf-8');

  // Verify file exists and is readable
  if (!existsSync(tempFile)) {
    throw new Error(`Failed to create temporary SQL file at ${tempFile}`);
  }

  return new Promise((resolve, reject) => {
    const proc = spawn('wrangler', [
      'd1',
      'execute',
      'platform-db',
      '--local',
      '--file',
      tempFile,
    ]);

    let stderr = '';

    proc.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      // Cleanup file after wrangler is done
      try {
        if (existsSync(tempFile)) {
          unlinkSync(tempFile);
        }
      } catch {
        // Ignore cleanup errors
      }

      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Wrangler command failed with code ${code}\n${stderr}`));
      }
    });

    proc.on('error', (err) => {
      // Cleanup file on error too
      try {
        if (existsSync(tempFile)) {
          unlinkSync(tempFile);
        }
      } catch {
        // Ignore cleanup errors
      }
      reject(err);
    });
  });
}

async function main(): Promise<void> {
  console.log('🌱 Seeding 10 users with leaderboard points locally...\n');

  try {
    // Generate data
    console.log('📝 Generating leaderboard data...');
    const users = generateUsers(10);
    const userPoints = generateUserPoints(users);
    console.log(`✅ Generated ${users.length} users and ${userPoints.length} point entries\n`);

    // Build and execute SQL
    console.log('💾 Executing database migration...');
    const sql = buildSQL(users, userPoints);
    await executeSQL(sql);
    console.log('✅ Database seeded successfully\n');

    // Summary
    console.log('📊 Seed Summary:');
    console.log(`   - Users created: ${users.length}`);
    console.log(`   - Point entries created: ${userPoints.length}`);
    console.log(`   - Top tier (1000-5000 points): 2 users`);
    console.log(`   - Mid tier (500-999 points): 4 users`);
    console.log(`   - Lower tier (100-499 points): 4 users`);
    console.log('');
    console.log('📊 Point Distribution:');
    userPoints.slice(0, 5).forEach((entry, index) => {
      console.log(`   ${index + 1}. ${entry.points} points`);
    });
    console.log('');
    console.log('🎉 Seeding complete! You can now run:');
    console.log('   npm run dev');
    console.log('   Then visit http://localhost:5173/leaderboard to see the leaderboard');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

main();
