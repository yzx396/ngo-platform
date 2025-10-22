import { faker } from '@faker-js/faker/locale/zh_CN';
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

interface User {
  id: string;
  email: string;
  name: string;
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
  allow_reviews: boolean;
  allow_recording: boolean;
  created_at: number;
  updated_at: number;
}

// Helper functions for bit flags
function getRandomLevels(): number {
  const levels = [
    MentoringLevel.Entry,
    MentoringLevel.Senior,
    MentoringLevel.Staff,
    MentoringLevel.Management,
  ];

  // Randomly select 1-3 levels
  let result = 0;
  const count = faker.number.int({ min: 1, max: 3 });
  const selected = faker.helpers.shuffle(levels).slice(0, count);

  for (const level of selected) {
    result |= level;
  }

  return result;
}

function getRandomPaymentTypes(): number {
  const types = [
    PaymentType.Venmo,
    PaymentType.Paypal,
    PaymentType.Zelle,
    PaymentType.Alipay,
    PaymentType.Wechat,
    PaymentType.Crypto,
  ];

  // Randomly select 1-4 payment types
  let result = 0;
  const count = faker.number.int({ min: 1, max: 4 });
  const selected = faker.helpers.shuffle(types).slice(0, count);

  for (const type of selected) {
    result |= type;
  }

  return result;
}

const MENTOR_BIOS = [
  '我是一名资深的职业发展顾问，拥有10年的行业经验。我专注于帮助职业转换者和初创企业创始人实现他们的目标。我的方法强调实践性和以结果为导向，相信每个人都有实现梦想的潜力。',
  '作为一名企业家和产品经理，我热爱分享如何从零开始构建成功的产品。我曾创办过两家初创公司，参与过融资和快速扩展的完整过程。欢迎各位创业者向我请教！',
  '我在科技行业工作了8年，具有深厚的技术和管理背景。我特别擅长领导跨职能团队、战略规划和组织文化建设。我相信良好的沟通和同理心是优秀领导者的核心素质。',
  '作为一名财务和商业分析师，我帮助企业优化运营效率和财务表现。我拥有CPA认证，并在财务咨询和商业规划方面有7年的经验。我喜欢用数据驱动的方式解决实际业务问题。',
  '我是一名市场营销专家，专注于B2B和B2C营销策略。我曾帮助多家企业从初创阶段发展到A轮融资。我的专长包括品牌建设、用户获取和增长黑客技巧。',
  '拥有20年人力资源管理经验，我在人才招聘、组织发展和员工保留方面有深入的专业知识。我帮助过许多初创公司建立高效的HR系统和强大的企业文化。',
  '我是一名全栈工程师和技术创业者。我在云计算、微服务架构和DevOps方面有专业知识。我喜欢指导年轻工程师，帮助他们快速成长并避免技术陷阱。',
  '作为一名UX/UI设计师和产品设计师，我专注于创造用户友好的产品体验。我拥有设计思维和用户研究的深厚背景，曾在多个知名科技公司工作过。',
  '我在国际贸易和全球化战略方面有10年的经验。我帮助企业进入新的市场并优化国际供应链。我也是一名语言爱好者，能够用中英文流利沟通。',
  '作为一名教育技术顾问和学习体验设计师，我热衷于使用技术改善教育。我曾创办过在线教育平台，并与多所高校合作。',
  '我在数据科学和机器学习领域有6年的经验。我使用Python和R进行数据分析，并帮助企业实现数据驱动的决策。我特别感兴趣的是如何将AI应用到实际商业问题。',
  '作为一名法律顾问和创业律师，我专注于初创公司法律和知识产权保护。我帮助许多创业者处理融资协议、公司治理和合规问题。',
  '我是一名品牌咨询师和创意总监。我帮助公司建立强大的品牌形象和创意策略。我的客户包括财富500强公司和快速增长的初创企业。',
  '拥有15年的项目管理经验，我在敏捷开发、Scrum和Kanban方面是认证专家。我帮助团队提高效率和交付质量。',
  '我是一名可持续发展专家和ESG顾问。我帮助企业实现环保目标并建立社会责任计划。我相信商业可以成为积极社会变革的力量。',
];

function generateBio(): string {
  return faker.helpers.arrayElement(MENTOR_BIOS);
}

function generateAvailability(): string {
  const options = [
    '工作日晚上（周一到周五19:00-21:00）',
    '周末灵活（请联系协商）',
    '周一、三、五19:00-21:30',
    '周末上午10:00-12:00',
    '根据需求灵活安排',
    '工作日午休时间12:00-13:00',
    '晚上和周末可协商',
    '每周两次，具体时间待定',
  ];

  return faker.helpers.arrayElement(options);
}

function generateUsers(count: number): User[] {
  const users: User[] = [];
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();

    users.push({
      id: randomUUID(),
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@mentor.local`,
      name: `${lastName}${firstName}`,
      created_at: now,
      updated_at: now,
    });
  }

  return users;
}

function generateMentorProfiles(users: User[]): MentorProfile[] {
  const profiles: MentorProfile[] = [];
  const now = Date.now();
  const usedNicknames = new Set<string>();

  for (const user of users) {
    let nickname = faker.person.firstName() + faker.person.lastName();

    // Ensure unique nicknames
    while (usedNicknames.has(nickname)) {
      nickname = faker.person.firstName() + faker.person.lastName();
    }
    usedNicknames.add(nickname);

    profiles.push({
      id: randomUUID(),
      user_id: user.id,
      nick_name: nickname,
      bio: generateBio(),
      mentoring_levels: getRandomLevels(),
      availability: generateAvailability(),
      hourly_rate: faker.number.int({ min: 50, max: 200 }),
      payment_types: getRandomPaymentTypes(),
      allow_reviews: faker.datatype.boolean(),
      allow_recording: faker.datatype.boolean(),
      created_at: now,
      updated_at: now,
    });
  }

  return profiles;
}

function buildSQL(users: User[], profiles: MentorProfile[]): string {
  let sql = '-- Clear existing data (idempotent)\n';
  sql += 'DELETE FROM mentor_profiles;\n';
  sql += 'DELETE FROM users;\n\n';

  sql += '-- Insert users\n';
  for (const user of users) {
    sql += `INSERT INTO users (id, email, name, created_at, updated_at) VALUES ('${user.id}', '${user.email}', '${user.name.replace(/'/g, "''")}', ${user.created_at}, ${user.updated_at});\n`;
  }

  sql += '\n-- Insert mentor profiles\n';
  for (const profile of profiles) {
    sql += `INSERT INTO mentor_profiles (id, user_id, nick_name, bio, mentoring_levels, availability, hourly_rate, payment_types, allow_reviews, allow_recording, created_at, updated_at) VALUES (`;
    sql += `'${profile.id}', `;
    sql += `'${profile.user_id}', `;
    sql += `'${profile.nick_name.replace(/'/g, "''")}', `;
    sql += `'${profile.bio.replace(/'/g, "''")}', `;
    sql += `${profile.mentoring_levels}, `;
    sql += `'${profile.availability.replace(/'/g, "''")}', `;
    sql += `${profile.hourly_rate}, `;
    sql += `${profile.payment_types}, `;
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
  console.log('🌱 Seeding 15 mentors locally...\n');

  try {
    // Generate data
    console.log('📝 Generating mentor data...');
    const users = generateUsers(15);
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
    console.log(`   - Mentor profiles created: ${profiles.length}`);
    console.log(`   - Mentoring levels: 1-3 per mentor`);
    console.log(`   - Payment types: 1-4 per mentor`);
    console.log(`   - Hourly rates: $50-$200`);
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
