import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../db.js';
import { authMiddleware, AuthRequest } from './auth.middleware.js';
import { sendVerificationEmail, sendStatsEmail, sendResetPasswordEmail } from '../utils/mailer.js';
import { checkAndAwardStatsAchievements, checkAndAwardCombinationAchievements } from './achievementService.js';

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

// Запрос сброса пароля (Forgot Password)
router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email обязателен для заполнения' });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(404).json({ error: 'Пользователь с таким email не найден' });
    }

    // Генерация токена сброса (JWT на 1 час)
    const resetToken = jwt.sign({ email }, JWT_SECRET, { expiresIn: '1h' });
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 час от текущего момента

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: resetToken,
        resetPasswordExpires: expiresAt,
      }
    });

    await sendResetPasswordEmail(email, resetToken);

    res.json({ message: 'Ссылка для сброса пароля успешно отправлена на вашу почту.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера при запросе сброса пароля' });
  }
});

// Сброс пароля (Reset Password)
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Токен и новый пароль обязательны' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Пароль должен быть не менее 6 символов' });
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (e) {
      return res.status(400).json({ error: 'Неверный или просроченный токен' });
    }

    const email = decoded.email;
    const user = await prisma.user.findFirst({
      where: {
        email,
        resetPasswordToken: token,
        resetPasswordExpires: {
          gt: new Date() // Проверяем, что срок действия не истек
        }
      }
    });

    if (!user) {
      return res.status(400).json({ error: 'Неверный токен сброса или срок его действия истек' });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newPasswordHash,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      }
    });

    res.json({ message: 'Пароль успешно изменен' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера при смене пароля' });
  }
});

// Вход (Login)
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email и пароль обязательны' });
    }

    const user = await prisma.user.findUnique({ 
      where: { email },
      include: {
        botMatches: {
          orderBy: { createdAt: 'desc' },
          take: 10
        },
        achievements: true
      }
    });

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
        totalGamesPlayed: user.totalGamesPlayed,
        totalChipsWon: user.totalChipsWon,
        showHints: user.showHints,
        botMatches: user.botMatches,
        achievements: user.achievements,
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

    const user = await prisma.user.findUnique({ 
      where: { id: userId },
      include: {
        botMatches: {
          orderBy: { createdAt: 'desc' },
          take: 10
        },
        achievements: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    res.json({
      id: user.id,
      email: user.email,
      username: user.username,
      chips: user.chips,
      rating: user.rating,
      totalGamesPlayed: user.totalGamesPlayed,
      totalChipsWon: user.totalChipsWon,
      showHints: user.showHints,
      botMatches: user.botMatches,
      achievements: user.achievements,
    });
  } catch (error) {
    console.error('Me endpoint error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Отправка отчета и статистики на почту
router.post('/send-stats-email', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Необходима авторизация' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    await sendStatsEmail(user.email, {
      username: user.username,
      chips: user.chips,
      rating: user.rating,
      totalGamesPlayed: user.totalGamesPlayed,
      totalChipsWon: user.totalChipsWon,
    });

    res.json({ message: 'Статистика и рекомендации успешно отправлены на ваш email!' });
  } catch (error) {
    console.error('Send stats email error:', error);
    res.status(500).json({ error: 'Ошибка сервера при отправке статистики на почту' });
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

    await checkAndAwardStatsAchievements(userId);

    res.json({
      message: 'Фишки успешно начислены',
      chips: user.chips
    });
  } catch (error) {
    console.error('Add chips error:', error);
    res.status(500).json({ error: 'Ошибка сервера при начислении фишек' });
  }
});

// Сохранение статистики после игры
router.post('/save-stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Необходима авторизация' });
    }

    const { gamesPlayed, chipsWon, botMatch, botDifficulty, opponentStyle, botLogs, bestCombination } = req.body;
    
    await prisma.user.update({
      where: { id: userId },
      data: {
        totalGamesPlayed: { increment: gamesPlayed || 0 },
        totalChipsWon: { increment: chipsWon || 0 }
      }
    });

    if (botMatch && gamesPlayed > 0) {
      await prisma.botMatchHistory.create({
        data: {
          userId,
          botDifficulty: botDifficulty || 'NORMAL',
          gamesPlayed: gamesPlayed || 0,
          chipsWon: chipsWon || 0,
          opponentStyle: opponentStyle || 'NORMAL',
          botLogs: botLogs || []
        }
      });
    }

    if (bestCombination) {
      await checkAndAwardCombinationAchievements(userId, bestCombination);
    }

    await checkAndAwardStatsAchievements(userId);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        botMatches: {
          orderBy: { createdAt: 'desc' },
          take: 10
        },
        achievements: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    res.json({
      message: 'Статистика успешно сохранена',
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        chips: user.chips,
        rating: user.rating,
        totalGamesPlayed: user.totalGamesPlayed,
        totalChipsWon: user.totalChipsWon,
        showHints: user.showHints,
        botMatches: user.botMatches,
        achievements: user.achievements,
      }
    });
  } catch (error) {
    console.error('Save stats error:', error);
    res.status(500).json({ error: 'Ошибка сервера при сохранении статистики' });
  }
});

// Обновление настроек
router.post('/update-settings', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Необходима авторизация' });
    }

    const { showHints } = req.body;
    
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        showHints: showHints !== undefined ? Boolean(showHints) : undefined,
      }
    });

    res.json({
      message: 'Настройки успешно обновлены',
      showHints: user.showHints
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Ошибка сервера при обновлении настроек' });
  }
});

export default router;
