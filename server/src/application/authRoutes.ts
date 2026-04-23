import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../db.js';
import { authMiddleware, AuthRequest } from './auth.middleware.js';
import { sendVerificationEmail } from '../utils/mailer.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-replace-me-in-production';

// Регистрация (заглушка для email)
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, username, password } = req.body;

    if (!email || !username || !password) {
      return res.status(400).json({ error: 'Все поля обязательны для заполнения' });
    }

    // Проверка существующего пользователя
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }]
      }
    });

    if (existingUser) {
      if (existingUser.email === email) {
        return res.status(400).json({ error: 'Email уже занят' });
      }
      return res.status(400).json({ error: 'Имя пользователя уже занято' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    
    // Генерация токена подтверждения
    const verificationToken = jwt.sign({ email }, JWT_SECRET, { expiresIn: '24h' });

    const newUser = await prisma.user.create({
      data: {
        email,
        username,
        passwordHash,
        verificationToken,
        isEmailVerified: false,
      }
    });

    // Отправляем реальное письмо
    await sendVerificationEmail(email, verificationToken);

    res.status(201).json({ message: 'Пользователь успешно зарегистрирован. Проверьте почту.' });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера при регистрации' });
  }
});

// Подтверждение почты
router.post('/verify-email', async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: 'Токен отсутствует' });
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (e) {
      return res.status(400).json({ error: 'Неверный или просроченный токен' });
    }

    const email = decoded.email;
    const user = await prisma.user.findFirst({ where: { email, verificationToken: token } });

    if (!user) {
      return res.status(400).json({ error: 'Неверный токен или пользователь не найден' });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        verificationToken: null,
      }
    });

    res.json({ message: 'Email успешно подтвержден' });
  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({ error: 'Ошибка сервера при подтверждении' });
  }
});

// Вход (Login)
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email и пароль обязательны' });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    if (!user.isEmailVerified) {
      return res.status(403).json({ error: 'Пожалуйста, подтвердите email перед входом' });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email }, 
      JWT_SECRET, 
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        chips: user.chips,
        rating: user.rating,
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Ошибка сервера при авторизации' });
  }
});

// Получение профиля (Me)
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Необходима авторизация' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    res.json({
      id: user.id,
      email: user.email,
      username: user.username,
      chips: user.chips,
      rating: user.rating,
    });
  } catch (error) {
    console.error('Me endpoint error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получение бесплатных фишек
router.post('/add-chips', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Необходима авторизация' });
    }

    const { amount } = req.body;
    const chipsToAdd = amount ? Number(amount) : 1000;

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        chips: { increment: chipsToAdd }
      }
    });

    res.json({
      message: 'Фишки успешно начислены',
      chips: user.chips
    });
  } catch (error) {
    console.error('Add chips error:', error);
    res.status(500).json({ error: 'Ошибка сервера при начислении фишек' });
  }
});

export default router;
