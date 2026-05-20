import { prisma } from '../db.js';

export interface AchievementDef {
  key: string;
  title: string;
  description: string;
  icon: string;
  category: 'combinations' | 'rounds' | 'ranks' | 'chips';
  threshold?: number;
}

export const ACHIEVEMENTS_LIST: AchievementDef[] = [
  // Combinations (Сбор комбинаций)
  { key: 'comb_pair', title: 'Первая пара', description: 'Соберите комбинацию Пара', icon: '🤝', category: 'combinations' },
  { key: 'comb_twopair', title: 'Две пары', description: 'Соберите комбинацию Две пары', icon: '✌️', category: 'combinations' },
  { key: 'comb_trips', title: 'Тройной удар', description: 'Соберите сет (тройку)', icon: '🎯', category: 'combinations' },
  { key: 'comb_straight', title: 'Порядок во всём', description: 'Соберите стрит', icon: '📈', category: 'combinations' },
  { key: 'comb_flush', title: 'Одноцветный мир', description: 'Соберите флеш', icon: '🌈', category: 'combinations' },
  { key: 'comb_fullhouse', title: 'Полный дом', description: 'Соберите фулл-хаус', icon: '🏡', category: 'combinations' },
  { key: 'comb_quads', title: 'Каре!', description: 'Соберите каре', icon: '👑', category: 'combinations' },
  { key: 'comb_straightflush', title: 'Чистый блеск', description: 'Соберите стрит-флеш', icon: '⚡', category: 'combinations' },
  { key: 'comb_royalflush', title: 'Королевский флеш', description: 'Соберите легендарный Роял-флеш!', icon: '💎', category: 'combinations' },

  // Rounds (Раунды)
  { key: 'rounds_10', title: 'Покерный дебют', description: 'Сыграйте 10 раундов в игре', icon: '🃏', category: 'rounds', threshold: 10 },
  { key: 'rounds_50', title: 'Завсегдатай клуба', description: 'Сыграйте 50 раундов в игре', icon: '🕶️', category: 'rounds', threshold: 50 },
  { key: 'rounds_100', title: 'Акула покера', description: 'Сыграйте 100 раундов в игре', icon: '🦈', category: 'rounds', threshold: 100 },

  // Ranks (Ранги)
  { key: 'rank_amateur', title: 'Серьёзный любитель', description: 'Достигните рейтинга 1000+', icon: '🥉', category: 'ranks', threshold: 1000 },
  { key: 'rank_pro', title: 'Настоящий профи', description: 'Достигните рейтинга 1200+', icon: '🥈', category: 'ranks', threshold: 1200 },
  { key: 'rank_grandmaster', title: 'Великий гроссмейстер', description: 'Достигните рейтинга 1500+', icon: '🥇', category: 'ranks', threshold: 1500 },
  { key: 'rank_legend', title: 'Легенда покера', description: 'Достигните рейтинга 1800+', icon: '🏆', category: 'ranks', threshold: 1800 },

  // Chips (Скопленные фишки)
  { key: 'chips_5k', title: 'Начальный капитал', description: 'Накопите баланс в 5 000 фишек', icon: '💰', category: 'chips', threshold: 5000 },
  { key: 'chips_25k', title: 'Успешный игрок', description: 'Накопите баланс в 25 000 фишек', icon: '💼', category: 'chips', threshold: 25000 },
  { key: 'chips_100k', title: 'Золотой сейф', description: 'Накопите баланс в 100 000 фишек', icon: '🏦', category: 'chips', threshold: 100000 },
  { key: 'chips_1m', title: 'Покерный олигарх', description: 'Накопите баланс в 1 000 000 фишек!', icon: '💸', category: 'chips', threshold: 1000000 },
];

/**
 * Проверяет и выдает достижения, зависящие от числовой статистики пользователя.
 */
export async function checkAndAwardStatsAchievements(userId: string): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { achievements: true }
    });
    if (!user) return;

    const unlockedKeys = new Set(user.achievements.map(a => a.key));
    const newAchievements: { userId: string; key: string }[] = [];

    // Проверяем сыгранные раунды
    const roundsPlayed = user.totalGamesPlayed;
    for (const ach of ACHIEVEMENTS_LIST.filter(a => a.category === 'rounds')) {
      if (roundsPlayed >= ach.threshold! && !unlockedKeys.has(ach.key)) {
        newAchievements.push({ userId, key: ach.key });
      }
    }

    // Проверяем рейтинг / ранг
    const rating = user.rating;
    for (const ach of ACHIEVEMENTS_LIST.filter(a => a.category === 'ranks')) {
      if (rating >= ach.threshold! && !unlockedKeys.has(ach.key)) {
        newAchievements.push({ userId, key: ach.key });
      }
    }

    // Проверяем текущее количество фишек
    const chips = user.chips;
    for (const ach of ACHIEVEMENTS_LIST.filter(a => a.category === 'chips')) {
      if (chips >= ach.threshold! && !unlockedKeys.has(ach.key)) {
        newAchievements.push({ userId, key: ach.key });
      }
    }

    if (newAchievements.length > 0) {
      await prisma.userAchievement.createMany({
        data: newAchievements,
        skipDuplicates: true
      });
      console.log(`[Achievements] Awarded ${newAchievements.length} stats achievements to user ${userId}`);
    }
  } catch (error) {
    console.error(`Error in checkAndAwardStatsAchievements:`, error);
  }
}

/**
 * Проверяет и выдает достижение за собранную комбинацию.
 */
export async function checkAndAwardCombinationAchievements(
  userId: string, 
  handType: string, 
  highCardValue?: number
): Promise<void> {
  let key: string | null = null;
  
  // Straight Flush с тузом на вершине (high = 14) — это Royal Flush
  if (handType === 'straightflush' && highCardValue === 14) {
    key = 'comb_royalflush';
  } else {
    switch (handType) {
      case 'pair': key = 'comb_pair'; break;
      case 'twopair': key = 'comb_twopair'; break;
      case 'trips': key = 'comb_trips'; break;
      case 'straight': key = 'comb_straight'; break;
      case 'flush': key = 'comb_flush'; break;
      case 'fullhouse': key = 'comb_fullhouse'; break;
      case 'quads': key = 'comb_quads'; break;
      case 'straightflush': key = 'comb_straightflush'; break;
    }
  }

  if (!key) return;

  try {
    await prisma.userAchievement.create({
      data: {
        userId,
        key
      }
    });
    console.log(`[Achievements] Awarded combination achievement ${key} to user ${userId}`);
  } catch (e: any) {
    // Код P2002 — это ошибка дублирования уникального ограничения Prisma, игнорируем его
    if (e.code !== 'P2002') {
      console.error(`Error awarding combination achievement ${key} to user ${userId}:`, e);
    }
  }
}

/**
 * Получает список достижений пользователя.
 */
export async function getUserAchievements(userId: string) {
  return await prisma.userAchievement.findMany({
    where: { userId },
    orderBy: { unlockedAt: 'asc' }
  });
}
