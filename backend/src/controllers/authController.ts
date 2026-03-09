import { Request, Response, Router } from 'express';
import crypto from 'crypto';
import prisma from '../config/database';
import { hashPassword, comparePassword } from '../utils/password';
import { generateToken } from '../utils/jwt';
import { successResponse, errorResponse, createdResponse } from '../utils/response';
import { authMiddleware } from '../middleware/auth';
import { isValidEmail } from '../utils/helpers';
import { 
  initEmailTransporter, 
  sendEmail, 
  generateVerificationEmail, 
  generatePasswordResetEmail 
} from '../utils/email';

const router = Router();

// 初始化邮件服务
initEmailTransporter();

// Mock data for development without database
const dbAvailable = process.env.DB_AVAILABLE !== 'false';
interface MockUser {
  id: number;
  username: string;
  email: string;
  passwordHash: string;
  avatarUrl?: string;
  phone?: string;
  isActive: boolean;
  isEmailVerified: boolean;
  role: string;
  createdAt?: Date;
}
const mockUsers: MockUser[] = [
  {
    id: 1,
    username: 'admin',
    email: 'admin@example.com',
    passwordHash: '$2b$10$abcdefghijklmnopqrstuv',
    avatarUrl: '',
    phone: '',
    isActive: true,
    isEmailVerified: true,
    role: 'admin',
    createdAt: new Date(),
  },
];

// 模拟的验证令牌存储
const verificationTokens = new Map<string, {
  userId: number;
  type: 'verify' | 'reset';
  expiresAt: Date;
}>();

function sanitizeUser(user: any) {
  const { passwordHash, ...sanitized } = user;
  // 处理 BigInt 类型（PostgreSQL 的 bigint 会被 prisma 转为 BigInt）
  if (sanitized.id && typeof sanitized.id === 'bigint') {
    sanitized.id = Number(sanitized.id);
  }
  return sanitized;
}

// 生成验证令牌
function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

router.post('/register', async (req: Request, res: Response) => {
  try {
    const { username, email, password, avatarUrl, phone } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json(errorResponse(400, '用户名、邮箱和密码为必填项'));
    }

    if (!isValidEmail(email)) {
      return res.status(400).json(errorResponse(400, '邮箱格式不正确'));
    }

    if (password.length < 6) {
      return res.status(400).json(errorResponse(400, '密码长度至少为6位'));
    }

    if (dbAvailable) {
      const existingUser = await prisma.user.findFirst({
        where: { OR: [{ username }, { email }] }
      });

      if (existingUser) {
        if (existingUser.username === username) {
          return res.status(400).json(errorResponse(400, '用户名已存在'));
        }
        return res.status(400).json(errorResponse(400, '邮箱已被注册'));
      }

      const hashedPassword = await hashPassword(password);

      const user = await prisma.user.create({
        data: {
          username,
          email,
          passwordHash: hashedPassword,
          avatarUrl,
          phone,
          isActive: true,
          isEmailVerified: false,
          role: 'user'
        }
      });

      // 生成验证令牌
      const token = generateVerificationToken();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 小时

      await prisma.emailVerificationToken.create({
        data: {
          userId: Number(user.id),
          token,
          expiresAt,
          type: 'verify'
        }
      });

      // 发送验证邮件
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const verificationUrl = `${frontendUrl}/verify-email?token=${token}`;
      const emailContent = generateVerificationEmail(username, verificationUrl);
      
      await sendEmail({
        to: email,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text
      });

      const authToken = generateToken({
        userId: Number(user.id),
        username: user.username,
        email: user.email,
        role: user.role
      });

      return res.status(201).json(createdResponse({
        user: sanitizeUser(user),
        token: authToken,
        message: '注册成功，请检查邮箱验证'
      }, '注册成功'));
    } else {
      // 使用模拟数据
      const existingMockUser = mockUsers.find(user => user.username === username || user.email === email);
      if (existingMockUser) {
        if (existingMockUser.username === username) {
          return res.status(400).json(errorResponse(400, '用户名已存在'));
        }
        return res.status(400).json(errorResponse(400, '邮箱已被注册'));
      }

      const hashedPassword = await hashPassword(password);
      const newUser = {
        id: mockUsers.length + 1,
        username,
        email,
        passwordHash: hashedPassword,
        avatarUrl,
        phone,
        isActive: true,
        isEmailVerified: false,
        role: 'user'
      };

      mockUsers.push(newUser);

      // 生成验证令牌
      const token = generateVerificationToken();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      
      verificationTokens.set(token, {
        userId: newUser.id,
        type: 'verify',
        expiresAt
      });

      // 发送验证邮件
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const verificationUrl = `${frontendUrl}/verify-email?token=${token}`;
      const emailContent = generateVerificationEmail(username, verificationUrl);
      
      await sendEmail({
        to: email,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text
      });

      const authToken = generateToken({
        userId: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role
      });

      return res.status(201).json(createdResponse({
        user: sanitizeUser(newUser),
        token: authToken,
        message: '注册成功（使用模拟数据），请检查邮箱验证'
      }, '注册成功'));
    }
  } catch (error) {
    console.error('注册错误:', error);
    return res.status(500).json(errorResponse(500, '注册失败'));
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json(errorResponse(400, '邮箱和密码为必填项'));
    }

    let user: any = null;

    if (dbAvailable) {
      user = await prisma.user.findFirst({ where: { email } });
    } else {
      // 使用模拟数据
      user = mockUsers.find(user => user.email === email);
    }

    if (!user) {
      return res.status(401).json(errorResponse(401, '邮箱或密码错误'));
    }

    if (!user.isActive) {
      return res.status(403).json(errorResponse(403, '账户已被禁用'));
    }

    const passwordMatch = await comparePassword(password, user.passwordHash);

    if (!passwordMatch) {
      return res.status(401).json(errorResponse(401, '邮箱或密码错误'));
    }

    const token = generateToken({
      userId: Number(user.id),
      username: user.username,
      email: user.email,
      role: user.role
    });

    return res.json(successResponse({
      user: sanitizeUser(user),
      token
    }, dbAvailable ? '登录成功' : '登录成功（使用模拟数据）'));
  } catch (error) {
    console.error('登录错误:', error);
    return res.status(500).json(errorResponse(500, '登录失败'));
  }
});

router.post('/logout', authMiddleware, (req: Request, res: Response) => {
  return res.json(successResponse(null, '登出成功'));
});

router.get('/profile', authMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json(errorResponse(401, '未认证'));
    }

    let user: any = null;

    if (dbAvailable) {
      user = await prisma.user.findUnique({
        where: { id: BigInt(req.user.userId) }
      });
    } else {
      user = mockUsers.find(u => u.id === req.user.userId);
    }

    if (!user) {
      return res.status(404).json(errorResponse(404, '用户不存在'));
    }

    return res.json(successResponse(sanitizeUser(user), '获取用户资料成功'));
  } catch (error) {
    console.error('获取用户资料错误:', error);
    return res.status(500).json(errorResponse(500, '获取用户资料失败'));
  }
});

router.put('/profile', authMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json(errorResponse(401, '未认证'));
    }

    const { username, avatarUrl, phone } = req.body;

    const updateData: any = {};
    if (username) updateData.username = username;
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;
    if (phone !== undefined) updateData.phone = phone;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json(errorResponse(400, '未提供更新数据'));
    }

    let existingUser: any = null;

    if (username) {
      if (dbAvailable) {
        existingUser = await prisma.user.findFirst({
          where: { username, NOT: { id: BigInt(req.user.userId) } }
        });
      } else {
        existingUser = mockUsers.find(u => u.username === username && u.id !== req.user.userId);
      }
      
      if (existingUser) {
        return res.status(400).json(errorResponse(400, '用户名已存在'));
      }
    }

    if (dbAvailable) {
      const user = await prisma.user.update({
        where: { id: BigInt(req.user.userId) },
        data: updateData
      });
      return res.json(successResponse(sanitizeUser(user), '更新用户资料成功'));
    } else {
      const userIndex = mockUsers.findIndex(u => u.id === req.user.userId);
      if (userIndex === -1) {
        return res.status(404).json(errorResponse(404, '用户不存在'));
      }
      Object.assign(mockUsers[userIndex], updateData);
      return res.json(successResponse(sanitizeUser(mockUsers[userIndex]), '更新用户资料成功'));
    }
  } catch (error) {
    console.error('更新用户资料错误:', error);
    return res.status(500).json(errorResponse(500, '更新用户资料失败'));
  }
});

router.put('/password', authMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json(errorResponse(401, '未认证'));
    }

    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json(errorResponse(400, '旧密码和新密码为必填项'));
    }

    if (newPassword.length < 6) {
      return res.status(400).json(errorResponse(400, '新密码长度至少为6位'));
    }

    let user: any = null;

    if (dbAvailable) {
      user = await prisma.user.findUnique({
        where: { id: BigInt(req.user.userId) }
      });
    } else {
      user = mockUsers.find(u => u.id === req.user.userId);
    }

    if (!user) {
      return res.status(404).json(errorResponse(404, '用户不存在'));
    }

    const passwordMatch = await comparePassword(oldPassword, user.passwordHash);

    if (!passwordMatch) {
      return res.status(401).json(errorResponse(401, '旧密码错误'));
    }

    const hashedPassword = await hashPassword(newPassword);

    if (dbAvailable) {
      await prisma.user.update({
        where: { id: BigInt(req.user.userId) },
        data: { passwordHash: hashedPassword }
      });
    } else {
      const userIndex = mockUsers.findIndex(u => u.id === req.user.userId);
      if (userIndex !== -1) {
        mockUsers[userIndex].passwordHash = hashedPassword;
      }
    }

    return res.json(successResponse(null, '修改密码成功'));
  } catch (error) {
    console.error('修改密码错误:', error);
    return res.status(500).json(errorResponse(500, '修改密码失败'));
  }
});

// 发送邮箱验证邮件
router.post('/send-verification-email', authMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json(errorResponse(401, '未认证'));
    }

    let user: any = null;

    if (dbAvailable) {
      user = await prisma.user.findUnique({
        where: { id: BigInt(req.user.userId) }
      });
    } else {
      user = mockUsers.find(u => u.id === req.user.userId);
    }

    if (!user) {
      return res.status(404).json(errorResponse(404, '用户不存在'));
    }

    if (user.isEmailVerified) {
      return res.status(400).json(errorResponse(400, '邮箱已验证'));
    }

    // 生成验证令牌
    const token = generateVerificationToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 小时

    if (dbAvailable) {
      // 删除旧的验证令牌
      await prisma.emailVerificationToken.deleteMany({
        where: { userId: Number(user.id), type: 'verify' }
      });

      await prisma.emailVerificationToken.create({
        data: {
          userId: Number(user.id),
          token,
          expiresAt,
          type: 'verify'
        }
      });
    } else {
      verificationTokens.set(token, {
        userId: user.id,
        type: 'verify',
        expiresAt
      });
    }

    // 发送验证邮件
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const verificationUrl = `${frontendUrl}/verify-email?token=${token}`;
    const emailContent = generateVerificationEmail(user.username, verificationUrl);
    
    const sent = await sendEmail({
      to: user.email,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text
    });

    if (!sent) {
      return res.status(500).json(errorResponse(500, '邮件发送失败，请稍后重试'));
    }

    return res.json(successResponse(null, '验证邮件已发送，请检查邮箱'));
  } catch (error) {
    console.error('发送验证邮件错误:', error);
    return res.status(500).json(errorResponse(500, '发送验证邮件失败'));
  }
});

// 验证邮箱
router.post('/verify-email', async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json(errorResponse(400, '验证令牌不能为空'));
    }

    let verificationData: any = null;

    if (dbAvailable) {
      verificationData = await prisma.emailVerificationToken.findFirst({
        where: { token, type: 'verify' }
      });
    } else {
      const data = verificationTokens.get(token);
      if (data && data.type === 'verify') {
        verificationData = data;
      }
    }

    if (!verificationData) {
      return res.status(400).json(errorResponse(400, '无效的验证令牌'));
    }

    if (new Date(verificationData.expiresAt) < new Date()) {
      if (dbAvailable) {
        await prisma.emailVerificationToken.delete({ where: { id: verificationData.id } });
      } else {
        verificationTokens.delete(token);
      }
      return res.status(400).json(errorResponse(400, '验证令牌已过期，请重新发送验证邮件'));
    }

    const userId = verificationData.userId;

    if (dbAvailable) {
      await prisma.user.update({
        where: { id: BigInt(userId) },
        data: { isEmailVerified: true }
      });

      await prisma.emailVerificationToken.delete({ where: { id: verificationData.id } });
    } else {
      const userIndex = mockUsers.findIndex(u => u.id === userId);
      if (userIndex !== -1) {
        mockUsers[userIndex].isEmailVerified = true;
      }
      verificationTokens.delete(token);
    }

    return res.json(successResponse(null, '邮箱验证成功'));
  } catch (error) {
    console.error('验证邮箱错误:', error);
    return res.status(500).json(errorResponse(500, '验证邮箱失败'));
  }
});

// 请求密码重置
router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json(errorResponse(400, '邮箱不能为空'));
    }

    if (!isValidEmail(email)) {
      return res.status(400).json(errorResponse(400, '邮箱格式不正确'));
    }

    let user: any = null;

    if (dbAvailable) {
      user = await prisma.user.findFirst({ where: { email } });
    } else {
      user = mockUsers.find(u => u.email === email);
    }

    // 为了安全，无论用户是否存在都返回成功
    if (!user) {
      return res.json(successResponse(null, '如果该邮箱已注册，您将收到密码重置邮件'));
    }

    // 生成重置令牌
    const token = generateVerificationToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 小时

    if (dbAvailable) {
      // 删除旧的重置令牌
      await prisma.emailVerificationToken.deleteMany({
        where: { userId: Number(user.id), type: 'reset' }
      });

      await prisma.emailVerificationToken.create({
        data: {
          userId: Number(user.id),
          token,
          expiresAt,
          type: 'reset'
        }
      });
    } else {
      verificationTokens.set(token, {
        userId: user.id,
        type: 'reset',
        expiresAt
      });
    }

    // 发送重置邮件
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;
    const emailContent = generatePasswordResetEmail(user.username, resetUrl);
    
    const sent = await sendEmail({
      to: user.email,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text
    });

    if (!sent) {
      return res.status(500).json(errorResponse(500, '邮件发送失败，请稍后重试'));
    }

    return res.json(successResponse(null, '如果该邮箱已注册，您将收到密码重置邮件'));
  } catch (error) {
    console.error('请求密码重置错误:', error);
    return res.status(500).json(errorResponse(500, '请求密码重置失败'));
  }
});

// 重置密码
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json(errorResponse(400, '令牌和新密码不能为空'));
    }

    if (newPassword.length < 6) {
      return res.status(400).json(errorResponse(400, '密码长度至少为 6 位'));
    }

    let verificationData: any = null;

    if (dbAvailable) {
      verificationData = await prisma.emailVerificationToken.findFirst({
        where: { token, type: 'reset' }
      });
    } else {
      const data = verificationTokens.get(token);
      if (data && data.type === 'reset') {
        verificationData = data;
      }
    }

    if (!verificationData) {
      return res.status(400).json(errorResponse(400, '无效的重置令牌'));
    }

    if (new Date(verificationData.expiresAt) < new Date()) {
      if (dbAvailable) {
        await prisma.emailVerificationToken.delete({ where: { id: verificationData.id } });
      } else {
        verificationTokens.delete(token);
      }
      return res.status(400).json(errorResponse(400, '重置令牌已过期，请重新请求'));
    }

    const userId = verificationData.userId;
    const hashedPassword = await hashPassword(newPassword);

    if (dbAvailable) {
      await prisma.user.update({
        where: { id: BigInt(userId) },
        data: { passwordHash: hashedPassword }
      });

      await prisma.emailVerificationToken.delete({ where: { id: verificationData.id } });
    } else {
      const userIndex = mockUsers.findIndex(u => u.id === userId);
      if (userIndex !== -1) {
        mockUsers[userIndex].passwordHash = hashedPassword;
      }
      verificationTokens.delete(token);
    }

    return res.json(successResponse(null, '密码重置成功，请使用新密码登录'));
  } catch (error) {
    console.error('重置密码错误:', error);
    return res.status(500).json(errorResponse(500, '重置密码失败'));
  }
});

export default router;
