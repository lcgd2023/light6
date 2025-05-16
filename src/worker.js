import { Hono } from 'hono';
import { jwt } from 'hono/jwt';
import { cors } from 'hono/cors';
import { bcrypt } from 'hono/bcrypt';

const app = new Hono();

// 中间件
app.use('*', cors());
app.use('/api/*', jwt({
  secret: 'your-jwt-secret',
  cookie: 'token'
}));

// 用户注册
app.post('/api/register', async (c) => {
  const { email, nickname, password } = await c.req.json();
  
  try {
    // 检查邮箱是否已存在
    const existingUser = await c.env.DB.prepare(
      'SELECT id FROM users WHERE email = ?'
    ).bind(email).first();
    
    if (existingUser) {
      return c.json({ error: '邮箱已被注册' }, 400);
    }
    
    // 加密密码
    const hashedPassword = await bcrypt.hash(password);
    
    // 创建用户
    const result = await c.env.DB.prepare(
      'INSERT INTO users (email, nickname, password) VALUES (?, ?, ?)'
    ).bind(email, nickname, hashedPassword).run();
    
    return c.json({ message: '注册成功' });
  } catch (error) {
    return c.json({ error: '注册失败' }, 500);
  }
});

// 用户登录
app.post('/api/login', async (c) => {
  const { email, password } = await c.req.json();
  
  try {
    const user = await c.env.DB.prepare(
      'SELECT * FROM users WHERE email = ?'
    ).bind(email).first();
    
    if (!user) {
      return c.json({ error: '用户不存在' }, 400);
    }
    
    const validPassword = await bcrypt.verify(password, user.password);
    if (!validPassword) {
      return c.json({ error: '密码错误' }, 400);
    }
    
    // 更新最后登录时间
    await c.env.DB.prepare(
      'UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind(user.id).run();
    
    // 生成 JWT token
    const token = await jwt.sign({ userId: user.id, email: user.email }, 'your-jwt-secret');
    
    return c.json({ token, user: { id: user.id, email: user.email, nickname: user.nickname } });
  } catch (error) {
    return c.json({ error: '登录失败' }, 500);
  }
});

// 发送消息
app.post('/api/messages', async (c) => {
  const { receiverId, content } = await c.req.json();
  const userId = c.get('jwtPayload').userId;
  
  try {
    await c.env.DB.prepare(
      'INSERT INTO messages (sender_id, receiver_id, content) VALUES (?, ?, ?)'
    ).bind(userId, receiverId, content).run();
    
    return c.json({ message: '发送成功' });
  } catch (error) {
    return c.json({ error: '发送失败' }, 500);
  }
});

// 获取消息历史
app.get('/api/messages/:contactId', async (c) => {
  const userId = c.get('jwtPayload').userId;
  const contactId = c.req.param('contactId');
  
  try {
    const messages = await c.env.DB.prepare(`
      SELECT m.*, u.nickname as sender_nickname 
      FROM messages m 
      JOIN users u ON m.sender_id = u.id 
      WHERE (m.sender_id = ? AND m.receiver_id = ?) 
         OR (m.sender_id = ? AND m.receiver_id = ?)
      ORDER BY m.created_at ASC
    `).bind(userId, contactId, contactId, userId).all();
    
    return c.json(messages.results);
  } catch (error) {
    return c.json({ error: '获取消息失败' }, 500);
  }
});

// 获取联系人列表
app.get('/api/contacts', async (c) => {
  const userId = c.get('jwtPayload').userId;
  
  try {
    const contacts = await c.env.DB.prepare(`
      SELECT DISTINCT u.id, u.nickname, u.email,
        (SELECT content FROM messages 
         WHERE (sender_id = ? AND receiver_id = u.id) 
            OR (sender_id = u.id AND receiver_id = ?)
         ORDER BY created_at DESC LIMIT 1) as last_message,
        (SELECT created_at FROM messages 
         WHERE (sender_id = ? AND receiver_id = u.id) 
            OR (sender_id = u.id AND receiver_id = ?)
         ORDER BY created_at DESC LIMIT 1) as last_message_time
      FROM users u
      JOIN messages m ON (m.sender_id = ? AND m.receiver_id = u.id) 
                     OR (m.sender_id = u.id AND m.receiver_id = ?)
      WHERE u.id != ?
      ORDER BY last_message_time DESC
    `).bind(userId, userId, userId, userId, userId, userId, userId).all();
    
    return c.json(contacts.results);
  } catch (error) {
    return c.json({ error: '获取联系人失败' }, 500);
  }
});

// 忘记密码
app.post('/api/forgot-password', async (c) => {
  const { email } = await c.req.json();
  
  try {
    const user = await c.env.DB.prepare(
      'SELECT id FROM users WHERE email = ?'
    ).bind(email).first();
    
    if (!user) {
      return c.json({ error: '用户不存在' }, 400);
    }
    
    // 生成6位随机验证码
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // 保存验证码
    await c.env.DB.prepare(
      'INSERT INTO password_reset_codes (email, code, expires_at) VALUES (?, ?, datetime("now", "+5 minutes"))'
    ).bind(email, code).run();
    
    // 这里应该调用邮件服务发送验证码
    // 为了演示，直接返回验证码
    return c.json({ code });
  } catch (error) {
    return c.json({ error: '发送验证码失败' }, 500);
  }
});

// 重置密码
app.post('/api/reset-password', async (c) => {
  const { email, code, newPassword } = await c.req.json();
  
  try {
    const validCode = await c.env.DB.prepare(
      'SELECT * FROM password_reset_codes WHERE email = ? AND code = ? AND expires_at > datetime("now") ORDER BY created_at DESC LIMIT 1'
    ).bind(email, code).first();
    
    if (!validCode) {
      return c.json({ error: '验证码无效或已过期' }, 400);
    }
    
    // 更新密码
    const hashedPassword = await bcrypt.hash(newPassword);
    await c.env.DB.prepare(
      'UPDATE users SET password = ? WHERE email = ?'
    ).bind(hashedPassword, email).run();
    
    // 删除已使用的验证码
    await c.env.DB.prepare(
      'DELETE FROM password_reset_codes WHERE email = ?'
    ).bind(email).run();
    
    return c.json({ message: '密码重置成功' });
  } catch (error) {
    return c.json({ error: '重置密码失败' }, 500);
  }
});

// 修改密码
app.post('/api/change-password', async (c) => {
  const { currentPassword, newPassword } = await c.req.json();
  const userId = c.get('jwtPayload').userId;
  
  try {
    const user = await c.env.DB.prepare(
      'SELECT password FROM users WHERE id = ?'
    ).bind(userId).first();
    
    const validPassword = await bcrypt.verify(currentPassword, user.password);
    if (!validPassword) {
      return c.json({ error: '当前密码错误' }, 400);
    }
    
    const hashedPassword = await bcrypt.hash(newPassword);
    await c.env.DB.prepare(
      'UPDATE users SET password = ? WHERE id = ?'
    ).bind(hashedPassword, userId).run();
    
    return c.json({ message: '密码修改成功' });
  } catch (error) {
    return c.json({ error: '修改密码失败' }, 500);
  }
});

export default app; 