import nodemailer from 'nodemailer';

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '465');
const SMTP_USER = process.env.SMTP_USER || 'your-email@gmail.com';
const SMTP_PASS = process.env.SMTP_PASS || 'your-app-password';
const SMTP_FROM = process.env.SMTP_FROM || '"Poker FSM" <your-email@gmail.com>';

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465, // true for 465, false for other ports
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});

/**
 * Отправляет письмо с ссылкой для подтверждения.
 * В режиме разработки (без пароля) выведет в консоль.
 */
export async function sendVerificationEmail(email: string, token: string) {
  // Заменяем localhost на реальный домен при деплое
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const verificationLink = `${clientUrl}/verify-email?token=${token}`;

  const mailOptions = {
    from: SMTP_FROM,
    to: email,
    subject: 'Подтверждение аккаунта Poker-FSM',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Добро пожаловать в Poker-FSM!</h2>
        <p>Для завершения регистрации, пожалуйста, подтвердите ваш email.</p>
        <a href="${verificationLink}" style="display:inline-block; padding:10px 20px; background:#10b981; color:#fff; text-decoration:none; border-radius:5px;">
          Подтвердить Email
        </a>
        <p style="margin-top:20px; color:#666; font-size:12px;">Если кнопка не работает, перейдите по ссылке: <br/>${verificationLink}</p>
      </div>
    `,
  };

  try {
    if (SMTP_PASS === 'your-app-password') {
      console.warn('[MAILER] SMTP пароль не настроен! Имитация отправки.');
      console.warn(`[MAILER] Ссылка для: ${email} -> ${verificationLink}`);
      return;
    }
    
    await transporter.sendMail(mailOptions);
    console.log(`[MAILER] Письмо отправлено на ${email}`);
  } catch (error) {
    console.error(`[MAILER] Ошибка отправки на ${email}`, error);
    throw new Error('Failed to send email');
  }
}
