import { randomUUID } from 'crypto';
import { spawn } from 'child_process';
import { writeFileSync, unlinkSync, existsSync } from 'fs';
import { tmpdir } from 'os';

// Bit flag enums (matching src/types/mentor.ts)
enum MentoringLevel {
  Entry = 1,
  Senior = 2,
  Staff = 4,
  Management = 8,
}

enum PaymentType {
  Venmo = 1,
  Paypal = 2,
  Zelle = 4,
  Alipay = 8,
  Wechat = 16,
  Crypto = 32,
}

enum ExpertiseDomain {
  TechnicalDevelopment = 1,
  ProductProjectManagement = 2,
  ManagementStrategy = 4,
  CareerDevelopment = 8,
}

enum ExpertiseTopic {
  CareerTransition = 1,
  TechnicalSkills = 2,
  Leadership = 4,
  Communication = 8,
  InterviewPrep = 16,
  Negotiation = 32,
  TimeManagement = 64,
  Fundraising = 128,
  VolunteerManagement = 256,
  StrategicPlanning = 512,
}

interface User {
  id: string;
  email: string;
  name: string;
  google_id: string | null;
  cv_url: string | null;
  cv_filename: string | null;
  cv_uploaded_at: number | null;
  created_at: number;
  updated_at: number;
}

interface MentorProfile {
  id: string;
  user_id: string;
  nick_name: string;
  bio: string;
  mentoring_levels: number;
  availability: string;
  hourly_rate: number;
  payment_types: number;
  expertise_domains: number;
  expertise_topics_preset: number;
  linkedin_url: string | null;
  allow_reviews: boolean;
  allow_recording: boolean;
  created_at: number;
  updated_at: number;
}

function generateUsers(): User[] {
  const now = Date.now();

  return [
    {
      id: randomUUID(),
      email: 'sarah.chen@mentor.local',
      name: '陈思雅',
      google_id: null,
      cv_url: 'https://storage.example.com/cv/sarah-chen-cv.pdf',
      cv_filename: 'sarah-chen-cv.pdf',
      cv_uploaded_at: now - 7 * 24 * 60 * 60 * 1000, // 7 days ago
      created_at: now,
      updated_at: now,
    },
    {
      id: randomUUID(),
      email: 'david.wang@mentor.local',
      name: '王大卫',
      google_id: null,
      cv_url: 'https://storage.example.com/cv/david-wang-cv.pdf',
      cv_filename: 'david-wang-cv.pdf',
      cv_uploaded_at: now - 14 * 24 * 60 * 60 * 1000, // 14 days ago
      created_at: now,
      updated_at: now,
    },
  ];
}

function generateMentorProfiles(users: User[]): MentorProfile[] {
  const now = Date.now();

  return [
    {
      id: randomUUID(),
      user_id: users[0].id,
      nick_name: 'TechLeadSarah',
      bio: '我是一名资深软件工程师和技术领导，拥有10年在硅谷顶尖科技公司的工作经验。我专注于帮助工程师进行职业转型、提升技术领导力，以及准备技术面试。我曾带领多个跨职能团队，深入理解如何从IC（Individual Contributor）成长为Tech Lead和Engineering Manager。',
      mentoring_levels: MentoringLevel.Senior | MentoringLevel.Staff | MentoringLevel.Management,
      availability: '周一、三、五晚上 7:00-9:00 PM PST',
      hourly_rate: 150,
      payment_types: PaymentType.Venmo | PaymentType.Paypal | PaymentType.Zelle,
      expertise_domains: ExpertiseDomain.TechnicalDevelopment | ExpertiseDomain.CareerDevelopment,
      expertise_topics_preset: ExpertiseTopic.CareerTransition | ExpertiseTopic.TechnicalSkills | ExpertiseTopic.Leadership | ExpertiseTopic.InterviewPrep,
      linkedin_url: 'https://www.linkedin.com/in/sarah-chen-tech',
      allow_reviews: true,
      allow_recording: true,
      created_at: now,
      updated_at: now,
    },
    {
      id: randomUUID(),
      user_id: users[1].id,
      nick_name: 'ProductDavid',
      bio: '作为一名产品管理专家和创业导师，我拥有12年的产品开发和战略规划经验。我曾在3家初创公司担任产品负责人，成功带领团队从MVP到产品市场契合(PMF)，并参与了两轮融资。我热衷于分享产品思维、用户研究方法，以及如何构建数据驱动的产品决策流程。',
      mentoring_levels: MentoringLevel.Entry | MentoringLevel.Senior | MentoringLevel.Staff,
      availability: '周末灵活安排，工作日晚上 8:00-10:00 PM EST',
      hourly_rate: 120,
      payment_types: PaymentType.Paypal | PaymentType.Zelle | PaymentType.Alipay | PaymentType.Wechat,
      expertise_domains: ExpertiseDomain.ProductProjectManagement | ExpertiseDomain.ManagementStrategy | ExpertiseDomain.CareerDevelopment,
      expertise_topics_preset: ExpertiseTopic.CareerTransition | ExpertiseTopic.Leadership | ExpertiseTopic.Communication | ExpertiseTopic.StrategicPlanning | ExpertiseTopic.Fundraising,
      linkedin_url: 'https://www.linkedin.com/in/david-wang-product',
      allow_reviews: true,
      allow_recording: false,
      created_at: now,
      updated_at: now,
    },
  ];
}

function buildSQL(users: User[], profiles: MentorProfile[]): string {
  let sql = '-- Clear existing data (idempotent)\n';
  sql += '-- Delete all dependent data first to avoid foreign key conflicts\n';
  sql += 'DELETE FROM blog_comments;\n';
  sql += 'DELETE FROM blog_likes;\n';
  sql += 'DELETE FROM blogs;\n';
  sql += 'DELETE FROM post_comments;\n';
  sql += 'DELETE FROM post_likes;\n';
  sql += 'DELETE FROM posts;\n';
  sql += 'DELETE FROM point_actions_log;\n';
  sql += 'DELETE FROM matches;\n';
  sql += 'DELETE FROM user_points;\n';
  sql += 'DELETE FROM user_roles;\n';
  sql += 'DELETE FROM mentor_profiles;\n';
  sql += 'DELETE FROM users;\n\n';

  sql += '-- Insert users\n';
  for (const user of users) {
    sql += `INSERT INTO users (id, email, name, google_id, cv_url, cv_filename, cv_uploaded_at, created_at, updated_at) VALUES (`;
    sql += `'${user.id}', `;
    sql += `'${user.email}', `;
    sql += `'${user.name.replace(/'/g, "''")}', `;
    sql += `${user.google_id ? `'${user.google_id}'` : 'NULL'}, `;
    sql += `${user.cv_url ? `'${user.cv_url}'` : 'NULL'}, `;
    sql += `${user.cv_filename ? `'${user.cv_filename}'` : 'NULL'}, `;
    sql += `${user.cv_uploaded_at || 'NULL'}, `;
    sql += `${user.created_at}, `;
    sql += `${user.updated_at}`;
    sql += `);\n`;
  }

  sql += '\n-- Insert mentor profiles\n';
  for (const profile of profiles) {
    sql += `INSERT INTO mentor_profiles (id, user_id, nick_name, bio, mentoring_levels, availability, hourly_rate, payment_types, expertise_domains, expertise_topics_preset, linkedin_url, allow_reviews, allow_recording, created_at, updated_at) VALUES (`;
    sql += `'${profile.id}', `;
    sql += `'${profile.user_id}', `;
    sql += `'${profile.nick_name.replace(/'/g, "''")}', `;
    sql += `'${profile.bio.replace(/'/g, "''")}', `;
    sql += `${profile.mentoring_levels}, `;
    sql += `'${profile.availability.replace(/'/g, "''")}', `;
    sql += `${profile.hourly_rate}, `;
    sql += `${profile.payment_types}, `;
    sql += `${profile.expertise_domains}, `;
    sql += `${profile.expertise_topics_preset}, `;
    sql += `${profile.linkedin_url ? `'${profile.linkedin_url}'` : 'NULL'}, `;
    sql += `${profile.allow_reviews ? 1 : 0}, `;
    sql += `${profile.allow_recording ? 1 : 0}, `;
    sql += `${profile.created_at}, `;
    sql += `${profile.updated_at}`;
    sql += `);\n`;
  }

  return sql;
}

async function executeSQL(sql: string): Promise<void> {
  const tempFile = `${tmpdir()}/.seed-${Date.now()}.sql`;

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
  console.log('🌱 Seeding 2 mentors locally...\n');

  try {
    // Generate data
    console.log('📝 Generating mentor data...');
    const users = generateUsers();
    const profiles = generateMentorProfiles(users);
    console.log(`✅ Generated ${users.length} users and ${profiles.length} mentor profiles\n`);

    // Build and execute SQL
    console.log('💾 Executing database migration...');
    const sql = buildSQL(users, profiles);
    await executeSQL(sql);
    console.log('✅ Database seeded successfully\n');

    // Summary
    console.log('📊 Seed Summary:');
    console.log(`   - Users created: ${users.length}`);
    console.log(`     • Sarah Chen (TechLeadSarah) - Tech Lead & Career Coach`);
    console.log(`     • David Wang (ProductDavid) - Product Manager & Startup Mentor`);
    console.log(`   - Mentor profiles created: ${profiles.length}`);
    console.log(`   - All mentors have:`);
    console.log(`     • CV uploaded ✓`);
    console.log(`     • LinkedIn profile ✓`);
    console.log(`     • Expertise domains & topics ✓`);
    console.log(`     • Payment methods configured ✓`);
    console.log('');
    console.log('🎉 Seeding complete! You can now run:');
    console.log('   npm run dev');
    console.log('   Then visit http://localhost:5173/mentors/browse to see the mentors');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

main();
