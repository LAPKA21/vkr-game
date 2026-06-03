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
 * Получает URL клиента, заменяя http на https в продакшене и удаляя порт 80
 */
function getClientUrl(): string {
  let clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const isLocal = clientUrl.includes('localhost') || clientUrl.includes('127.0.0.1');
  if (!isLocal) {
    // Если ссылка начинается с http:// или содержит сырой IP-адрес, принудительно заменяем на домен с https
    if (clientUrl.startsWith('http://') || /^(https?:\/\/)?\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(clientUrl)) {
      return 'https://vkr-game.ru';
    }
  }
  return clientUrl;
}

/**
 * Отправляет письмо с ссылкой для подтверждения.
 * В режиме разработки (без пароля) выведет в консоль.
 */
export async function sendVerificationEmail(email: string, token: string) {
  // Заменяем localhost на реальный домен при деплое
  const clientUrl = getClientUrl();
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

export async function sendStatsEmail(
  email: string,
  stats: {
    username: string;
    chips: number;
    rating: number;
    totalGamesPlayed: number;
    totalChipsWon: number;
  }
) {
  const { username, chips, rating, totalGamesPlayed, totalChipsWon } = stats;
  const clientUrl = getClientUrl();

  // Определение рекомендаций на основе показателей игрока
  let adviceBg = 'rgba(201, 162, 39, 0.08)';
  let adviceBorder = 'rgba(201, 162, 39, 0.3)';
  let adviceColor = '#c9a227';
  let adviceText = '';

  if (rating < 900 || (totalGamesPlayed >= 5 && chips < 300)) {
    // Проигрывающий игрок
    adviceBg = 'rgba(239, 68, 68, 0.08)';
    adviceBorder = 'rgba(239, 68, 68, 0.3)';
    adviceColor = '#fca5a5';
    adviceText = `Мы заметили, что ваши последние результаты снизились. Покер — игра стратегического мышления и дисциплины. Рекомендуем подходить к процессу более вдумчиво:<br/><br/>
    🎯 <strong>Контролируйте эмоции (тильт):</strong> Не пытайтесь мгновенно отыграться после обидного проигрыша. Сделайте перерыв.<br/>
    📚 <strong>Сузьте диапазон рук:</strong> Не разыгрывайте «мусорные» карты на префлопе. Сбрасывайте слабые руки до флопа — это сбережет ваши фишки.<br/>
    🔮 <strong>Используйте Помощника:</strong> Наш новый Ассистент тактики прямо за игровым столом покажет точный расчет аутов и шансов улучшить комбинацию на флопе и терне. Пользуйтесь им активнее для принятия математически взвешенных решений!`;
  } else if (rating >= 1100 || chips >= 1500) {
    // Выигрывающий игрок
    adviceBg = 'rgba(16, 185, 129, 0.08)';
    adviceBorder = 'rgba(16, 185, 129, 0.3)';
    adviceColor = '#86efac';
    adviceText = `Поздравляем! Вы демонстрируете выдающиеся результаты за покерным столом!<br/><br/>
    🌟 Вы отлично понимаете динамику игры, искусно управляете размером банка и принимаете математически верные решения. Вы настоящий молодец, продолжайте играть в таком же духе!<br/>
    🚀 Для дополнительного вызова рекомендуем сразиться с нашими продвинутыми ботами на максимальном уровне сложности в Тренировочной комнате, чтобы оттачивать мастерство блефа и чтения соперников. Новые высоты рейтинга ждут вас!`;
  } else {
    // Стабильный игрок
    adviceText = `Вы показываете стабильную и взвешенную игру. Это отличная основа для долгосрочного роста!<br/><br/>
    📈 В покере стабильность ценится превыше всего. Продолжайте накапливать опыт, анализировать раздачи соперников и развивать чтение игрового поля. Помните: дисциплинированные фолды на поздних улицах экономят миллионы фишек на дистанции. Удачи в следующих раздачах!`;
  }

  const mailOptions = {
    from: SMTP_FROM,
    to: email,
    subject: '📊 Ваш игровой отчет и рекомендации - Poker-FSM',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background-color: #0c1a12; color: #ffffff; padding: 30px 20px; border-radius: 16px; border: 2px solid #c9a227;">
        
        <div style="text-align: center; border-bottom: 2px solid rgba(201, 162, 39, 0.3); padding-bottom: 20px; margin-bottom: 25px;">
          <h1 style="color: #c9a227; font-size: 24px; margin: 0; text-transform: uppercase; letter-spacing: 1.5px;">✨ Ваш игровой отчет ✨</h1>
          <p style="color: #a7f3d0; font-size: 14px; margin: 5px 0 0 0;">Индивидуальная игровая статистика от Poker-FSM</p>
        </div>
        
        <p style="font-size: 16px; line-height: 1.6; color: #e2e8f0; margin-bottom: 20px;">
          Приветствуем вас, <strong>${username}</strong>! Мы подготовили свежий анализ вашей игровой активности. Ознакомьтесь со своими достижениями и персональными стратегическими рекомендациями ниже.
        </p>

        <div style="background: rgba(0,0,0,0.4); border-radius: 12px; border: 1.5px solid rgba(255,255,255,0.08); padding: 20px; margin-bottom: 25px;">
          <h3 style="color: #c9a227; margin-top: 0; margin-bottom: 15px; font-size: 18px; border-left: 3px solid #c9a227; padding-left: 10px;">📊 Игровые показатели</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
              <td style="padding: 10px 0; color: #a0aec0; font-size: 14px;">Текущий баланс фишек:</td>
              <td style="padding: 10px 0; text-align: right; color: #fbbf24; font-weight: bold; font-size: 16px;">💰 ${chips}</td>
            </tr>
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
              <td style="padding: 10px 0; color: #a0aec0; font-size: 14px;">Рейтинг (MMR):</td>
              <td style="padding: 10px 0; text-align: right; color: #60a5fa; font-weight: bold; font-size: 16px;">🏆 ${rating}</td>
            </tr>
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
              <td style="padding: 10px 0; color: #a0aec0; font-size: 14px;">Всего сыграно раздач:</td>
              <td style="padding: 10px 0; text-align: right; color: #ffffff; font-weight: bold; font-size: 15px;">🎮 ${totalGamesPlayed}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #a0aec0; font-size: 14px;">Всего выиграно фишек:</td>
              <td style="padding: 10px 0; text-align: right; color: #10b981; font-weight: bold; font-size: 15px;">📈 +${totalChipsWon}</td>
            </tr>
          </table>
        </div>

        <div style="background: ${adviceBg}; border-radius: 12px; border: 1.5px solid ${adviceBorder}; padding: 20px; margin-bottom: 25px;">
          <h3 style="color: ${adviceColor}; margin-top: 0; margin-bottom: 15px; font-size: 18px;">
            💡 Персональный разбор & Советы
          </h3>
          <p style="font-size: 14px; line-height: 1.6; color: #e2e8f0; margin: 0;">
            ${adviceText}
          </p>
        </div>

        <div style="text-align: center; margin-top: 30px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 20px;">
          <p style="color: #a0aec0; font-size: 12px; margin-bottom: 15px;">Хотите улучшить показатели или проверить новые стратегии?</p>
          <a href="${clientUrl}" style="display: inline-block; padding: 12px 25px; background: linear-gradient(180deg, #c9a227 0%, #a8841f 100%); color: #0c1a12; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; box-shadow: 0 4px 15px rgba(201, 162, 39, 0.3);">
            🚀 Играть в Poker-FSM
          </a>
        </div>
        
      </div>
    `,
  };

  try {
    if (SMTP_PASS === 'your-app-password') {
      console.warn('[MAILER] SMTP пароль не настроен! Имитация отправки статистики.');
      console.log(`[MAILER] Отчет для: ${email}`);
      return;
    }

    await transporter.sendMail(mailOptions);
    console.log(`[MAILER] Письмо со статистикой отправлено на ${email}`);
  } catch (error) {
    console.error(`[MAILER] Ошибка отправки статистики на ${email}`, error);
    throw new Error('Failed to send stats email');
  }
}
