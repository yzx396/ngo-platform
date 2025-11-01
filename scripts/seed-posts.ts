import { randomUUID } from 'crypto';
import { spawn } from 'child_process';
import { writeFileSync, unlinkSync, existsSync } from 'fs';
import { tmpdir } from 'os';

interface Post {
  id: string;
  user_id: string;
  content: string;
  post_type: 'announcement' | 'discussion' | 'general';
  likes_count: number;
  comments_count: number;
  created_at: number;
  updated_at: number;
}

interface PostLike {
  id: string;
  post_id: string;
  user_id: string;
  created_at: number;
}

interface PostComment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  parent_comment_id: string | null;
  created_at: number;
  updated_at: number;
}

// High-quality post content for community engagement (Chinese)
const POST_TEMPLATES = [
  {
    type: 'announcement' as const,
    content: '平台更新：我们刚刚推出了新的排行榜功能！看看我们社区中的顶级贡献者，了解如何提升你的排名。每一次互动都很重要——从发布帖子到指导他人，都能帮助你获得积分。',
  },
  {
    type: 'discussion' as const,
    content: '讨论：在职业转变过程中，你收到过的最好的建议是什么？我正在考虑从工程转向产品管理，希望能听到那些做过类似转变的人的经验。我应该专注于什么才能让这个转变顺利进行？',
  },
  {
    type: 'general' as const,
    content: '刚刚完成了我的第一次导师指导课程！🎉 非常感谢有一位了解科技行业的导师。他关于团队动态和沟通的见解非常宝贵。如果你刚入行，我强烈建议你找一位导师——这真的能改变你的职业轨迹。',
  },
  {
    type: 'discussion' as const,
    content: '问题：你是如何在日常工作中平衡持续学习的？我在全职工作的同时想要提升我的AI/ML技能，但很难找到时间。我很想听听你们关于时间管理和学习效率的策略。',
  },
  {
    type: 'general' as const,
    content: '今天庆祝一个大胜利！🚀 终于完成并发布了我花了一个月来开发的功能。特别感谢我的导师帮助我思考设计上的挑战。导师关系对我的职业发展影响深远。',
  },
  {
    type: 'announcement' as const,
    content: '活动公告：加入我们本周五晚上7点的社区线上交流会吧！我们将讨论职业战略、与导师建立联系，以及分享机会。欢迎所有社区成员参加！',
  },
  {
    type: 'discussion' as const,
    content: '热门话题：正规教育和实践经验在科技行业中的重要性相比如何？我在我们的社区中看到许多自学成才的优秀开发者，但也看到了结构化学习的价值。你怎么看？',
  },
  {
    type: 'general' as const,
    content: '兴高采烈地宣布我晋升为高级工程师！🎊 没有这个社区中导师们的指导，这一切都不可能实现。如果你在寻找职业方向，一定要找一位导师——这对我的职业生涯改变巨大。',
  },
  {
    type: 'discussion' as const,
    content: '资源分享：我发现了一门关于系统设计的精妙免费课程。有人学过吗？我很想听听有哪些类似的资源帮助你提升技术技能。',
  },
  {
    type: 'general' as const,
    content: '下个月我要开始我的创业之旅了！🚀 在公司工作5年之后，我准备好创建属于自己的事业。这个社区的导师给了我信心去迈出这一步。如果有人有创业经验，我很想和你们交流！',
  },
];

const COMMENT_TEMPLATES = [
  '这个观点真的很有见地！感谢分享。',
  '我完全赞同这个看法。说得非常好！',
  '这对我帮助很大。非常感谢！',
  '很喜欢看社区成员分享他们的经历。',
  '我一定会尝试这个方法。谢谢建议！',
  '这和我的经历也很相符。',
  '好问题！期待看到更多的回答。',
  '你的经历很鼓舞人心。继续加油！',
  '这正是我今天需要听到的。',
  '说得再同意不过了！',
];

// Create high-quality posts
function generatePosts(userIds: string[]): Post[] {
  const posts: Post[] = [];
  const now = Math.floor(Date.now() / 1000); // Unix timestamp in seconds

  // Distribute posts over the last 30 days
  for (let i = 0; i < POST_TEMPLATES.length; i++) {
    const template = POST_TEMPLATES[i];
    const daysAgo = Math.floor(Math.random() * 30);
    const createdAt = now - (daysAgo * 24 * 60 * 60);

    // Vary likes count based on post quality and freshness
    const baseLikes = Math.floor(Math.random() * 15) + 3;
    const likeDecay = Math.max(1, Math.floor(baseLikes / (daysAgo + 1)));
    const likesCount = Math.max(0, likeDecay);

    // Comments are less frequent than likes
    const commentsCount = Math.floor(likesCount * 0.3) + (Math.random() > 0.7 ? 1 : 0);

    posts.push({
      id: randomUUID(),
      user_id: userIds[i % userIds.length],
      content: template.content,
      post_type: template.type,
      likes_count: likesCount,
      comments_count: commentsCount,
      created_at: createdAt,
      updated_at: createdAt,
    });
  }

  return posts;
}

// Generate realistic likes
function generateLikes(posts: Post[], userIds: string[]): PostLike[] {
  const likes: PostLike[] = [];
  const likedPairs = new Set<string>();

  for (const post of posts) {
    // Generate likes for this post
    const likeCount = post.likes_count;
    const availableUsers = userIds.filter(uid => uid !== post.user_id);

    // Randomly select users to like this post
    const likingUsers = new Set<string>();
    for (let i = 0; i < Math.min(likeCount, availableUsers.length); i++) {
      const randomIdx = Math.floor(Math.random() * availableUsers.length);
      likingUsers.add(availableUsers[randomIdx]);
    }

    // Create like records
    for (const userId of likingUsers) {
      const pair = `${post.id}:${userId}`;
      if (!likedPairs.has(pair)) {
        likedPairs.add(pair);
        likes.push({
          id: randomUUID(),
          post_id: post.id,
          user_id: userId,
          created_at: post.created_at + Math.floor(Math.random() * 86400),
        });
      }
    }
  }

  return likes;
}

// Generate realistic comments
function generateComments(posts: Post[], userIds: string[]): PostComment[] {
  const comments: PostComment[] = [];

  for (const post of posts) {
    // Generate comments for this post
    const commentCount = post.comments_count;
    const availableUsers = userIds.filter(uid => uid !== post.user_id);

    for (let i = 0; i < commentCount && availableUsers.length > 0; i++) {
      const commenterId = availableUsers[Math.floor(Math.random() * availableUsers.length)];
      const template = COMMENT_TEMPLATES[Math.floor(Math.random() * COMMENT_TEMPLATES.length)];

      comments.push({
        id: randomUUID(),
        post_id: post.id,
        user_id: commenterId,
        content: template,
        parent_comment_id: null,
        created_at: post.created_at + (i + 1) * 3600, // Space comments 1 hour apart
        updated_at: post.created_at + (i + 1) * 3600,
      });
    }
  }

  return comments;
}

function buildSQL(posts: Post[], likes: PostLike[], comments: PostComment[]): string {
  let sql = '-- Clear existing posts data (idempotent)\n';
  sql += 'DELETE FROM post_comments;\n';
  sql += 'DELETE FROM post_likes;\n';
  sql += 'DELETE FROM posts;\n\n';

  sql += '-- Insert posts\n';
  for (const post of posts) {
    sql += `INSERT INTO posts (id, user_id, content, post_type, likes_count, comments_count, created_at, updated_at) VALUES (`;
    sql += `'${post.id}', `;
    sql += `'${post.user_id}', `;
    sql += `'${post.content.replace(/'/g, "''")}', `;
    sql += `'${post.post_type}', `;
    sql += `${post.likes_count}, `;
    sql += `${post.comments_count}, `;
    sql += `${post.created_at}, `;
    sql += `${post.updated_at}`;
    sql += `);\n`;
  }

  sql += '\n-- Insert likes\n';
  for (const like of likes) {
    sql += `INSERT INTO post_likes (id, post_id, user_id, created_at) VALUES ('${like.id}', '${like.post_id}', '${like.user_id}', ${like.created_at});\n`;
  }

  sql += '\n-- Insert comments\n';
  for (const comment of comments) {
    const parentId = comment.parent_comment_id ? `'${comment.parent_comment_id}'` : 'NULL';
    sql += `INSERT INTO post_comments (id, post_id, user_id, content, parent_comment_id, created_at, updated_at) VALUES (`;
    sql += `'${comment.id}', `;
    sql += `'${comment.post_id}', `;
    sql += `'${comment.user_id}', `;
    sql += `'${comment.content.replace(/'/g, "''")}', `;
    sql += `${parentId}, `;
    sql += `${comment.created_at}, `;
    sql += `${comment.updated_at}`;
    sql += `);\n`;
  }

  return sql;
}

async function executeSQL(sql: string): Promise<void> {
  const tempFile = `${tmpdir()}/.seed-posts-${Date.now()}.sql`;

  writeFileSync(tempFile, sql, 'utf-8');

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

// Fetch existing users from database
async function getExistingUserIds(): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const proc = spawn('npx', [
      'wrangler',
      'd1',
      'execute',
      'platform-db',
      '--local',
      '--command',
      'SELECT id FROM users LIMIT 20;',
    ]);

    let stdout = '';
    let stderr = '';

    proc.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      if (code === 0) {
        try {
          // Parse JSON output from wrangler
          const jsonMatch = stdout.match(/\[\s*\{[\s\S]*\}\s*\]/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].results) {
              const userIds = parsed[0].results.map((r: Record<string, unknown>) => r.id as string);
              resolve(userIds);
            } else {
              reject(new Error('No users found in database. Please run seed:leaderboard first.'));
            }
          } else {
            reject(new Error('Failed to parse user IDs from output'));
          }
        } catch (err) {
          reject(new Error(`Failed to parse database output: ${err}`));
        }
      } else {
        reject(new Error(`Wrangler query failed with code ${code}\n${stderr}`));
      }
    });

    proc.on('error', (err) => {
      reject(err);
    });
  });
}

async function main(): Promise<void> {
  console.log('🌱 Seeding high-quality posts with engagement...\n');

  try {
    // Get existing users
    console.log('📝 Fetching existing users...');
    const userIds = await getExistingUserIds();
    console.log(`✅ Found ${userIds.length} users\n`);

    if (userIds.length === 0) {
      console.error('❌ No users found. Please run "npm run db:seed:leaderboard" first.');
      process.exit(1);
    }

    // Generate data
    console.log('📝 Generating high-quality posts...');
    const posts = generatePosts(userIds);
    const likes = generateLikes(posts, userIds);
    const comments = generateComments(posts, userIds);
    console.log(`✅ Generated ${posts.length} posts, ${likes.length} likes, ${comments.length} comments\n`);

    // Build and execute SQL
    console.log('💾 Executing database migration...');
    const sql = buildSQL(posts, likes, comments);
    await executeSQL(sql);
    console.log('✅ Database seeded successfully\n');

    // Summary
    console.log('📊 Seed Summary:');
    console.log(`   - Posts created: ${posts.length}`);
    console.log(`   - Post types:
     • Announcements: ${posts.filter(p => p.post_type === 'announcement').length}
     • Discussions: ${posts.filter(p => p.post_type === 'discussion').length}
     • General: ${posts.filter(p => p.post_type === 'general').length}`);
    console.log(`   - Total likes: ${likes.length}`);
    console.log(`   - Total comments: ${comments.length}`);
    console.log(`   - Average engagement per post: ${(likes.length + comments.length) / posts.length} interactions`);
    console.log('');
    console.log('🎉 Seeding complete! You can now run:');
    console.log('   npm run dev');
    console.log('   Then visit http://localhost:5173/feed to see the posts');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

main();
