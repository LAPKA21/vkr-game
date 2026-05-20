/**
 * Оценка силы руки для бота на основе карт игрока и общих карт.
 * Использует простую эвристику для категоризации силы руки.
 */

import type { Card, GameState, Suit, Rank } from '../../types/index.js';
import { evaluateHand, type HandRank, getHandRankNameRu } from '../../game/pokerLogic.js';

/**
 * Категории силы руки для Марковской модели
 */
export type HandStrength = 'WEAK' | 'MEDIUM' | 'STRONG';

export interface HandAdviceInfo {
  currentHandNameRu: string;
  strength: HandStrength;
  phase: GameState;
  draws: { name: string; outs: number; percentage: number }[];
  advice: string;
}

/**
 * Порядок типов рук от слабых к сильным
 */
const HAND_ORDER: HandRank['type'][] = [
  'high',
  'pair',
  'twopair',
  'trips',
  'straight',
  'flush',
  'fullhouse',
  'quads',
  'straightflush',
];

const RANK_VALUES: Record<Rank, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
  'J': 11, 'Q': 12, 'K': 13, 'A': 14,
};

/**
 * Вычисляет числовую силу руки для сравнения
 */
function calculateHandScore(rank: HandRank): number {
  const typeScore = HAND_ORDER.indexOf(rank.type) * 100;
  let valueScore = 0;

  switch (rank.type) {
    case 'high':
      valueScore = rank.value;
      break;
    case 'pair':
      valueScore = rank.value * 10 + rank.kicker;
      break;
    case 'twopair':
      valueScore = rank.high * 10 + rank.low;
      break;
    case 'trips':
      valueScore = rank.value * 10 + rank.kicker;
      break;
    case 'straight':
    case 'flush':
    case 'straightflush':
      valueScore = rank.high;
      break;
    case 'fullhouse':
      valueScore = rank.trips * 10 + rank.pair;
      break;
    case 'quads':
      valueScore = rank.value * 10 + rank.kicker;
      break;
  }

  return typeScore + valueScore;
}

/**
 * Оценивает силу руки с учетом стадии игры и вероятности улучшения
 *
 * @param playerCards - карты игрока (2 карты)
 * @param communityCards - общие карты на столе
 * @param phase - текущая фаза игры
 * @returns категория силы руки: WEAK, MEDIUM или STRONG
 */
export function evaluateHandStrength(
  playerCards: Card[],
  communityCards: Card[],
  phase: GameState
): HandStrength {
  if (playerCards.length < 2) {
    return 'WEAK';
  }

  // Оценка текущей руки
  const rank = evaluateHand(playerCards, communityCards);
  const score = calculateHandScore(rank);

  // Базовые пороги для разных фаз
  let weakThreshold: number;
  let mediumThreshold: number;

  switch (phase) {
    case 'PRE_FLOP':
      // На префлопе учитываем потенциал карт
      const highCard = Math.max(
        ...playerCards.map((c) => RANK_VALUES[c.rank] || 0)
      );
      const isPair = playerCards[0].rank === playerCards[1].rank;
      const suited = playerCards[0].suit === playerCards[1].suit;

      // Сильные пары
      if ((isPair && highCard >= 10) || (highCard >= 13 && playerCards.some(c => ['A', 'K'].includes(c.rank)))) {
        if ((isPair && highCard >= 10) || (highCard === 14 && playerCards.some(c => c.rank === 'K'))) {
          return 'STRONG';
        }
        return 'MEDIUM';
      }

      // Если есть пара или старшая карта до 10 то, ставится medium и weak
      if (isPair || highCard >= 10) {
        return highCard >= 12 || isPair ? 'MEDIUM' : 'WEAK';
      }
      return 'WEAK';

    case 'FLOP':
      weakThreshold = 50; // Старшая карта или слабая пара
      mediumThreshold = 150; // Пара или две пары
      break;

    case 'TURN':
    case 'RIVER':
      weakThreshold = 100; // Слабая пара
      mediumThreshold = 200; // Две пары или тройка
      break;

    default:
      weakThreshold = 50;
      mediumThreshold = 150;
  }

  if (score < weakThreshold) {
    return 'WEAK';
  } else if (score < mediumThreshold) {
    return 'MEDIUM';
  } else {
    return 'STRONG';
  }
}

/**
 * Рассчитывает подробную подсказку и математический прогноз для игрока.
 */
export function getDetailedHandAdvice(
  playerCards: Card[],
  communityCards: Card[],
  phase: GameState
): HandAdviceInfo {
  if (playerCards.length < 2) {
    return {
      currentHandNameRu: 'Нет карт',
      strength: 'WEAK',
      phase,
      draws: [],
      advice: 'Ожидайте раздачи карт.',
    };
  }

  // 1. Префлоп: Оценка карманных карт
  if (phase === 'PRE_FLOP') {
    const highCard = Math.max(...playerCards.map(c => RANK_VALUES[c.rank] || 0));
    const isPair = playerCards[0].rank === playerCards[1].rank;
    const suited = playerCards[0].suit === playerCards[1].suit;
    const rankDiff = Math.abs((RANK_VALUES[playerCards[0].rank] || 0) - (RANK_VALUES[playerCards[1].rank] || 0));
    const isConnector = rankDiff === 1;

    let strength: HandStrength = 'WEAK';
    let advice = '';

    if (isPair && highCard >= 11) {
      strength = 'STRONG';
      advice = `⚡ Премиум-пара (${playerCards[0].rank}${playerCards[1].rank})! Сильнейшая стартовая рука. Отличный потенциал. Рекомендуется агрессивная тактика: делайте уверенный рейз или 3-бет для защиты банка.`;
    } else if (isPair && highCard >= 8) {
      strength = 'MEDIUM';
      advice = `🚀 Средняя пара (${playerCards[0].rank}${playerCards[1].rank}). Хороший потенциал для сбора сета (тройки) на флопе (шанс ~12%). Рекомендуется колл или умеренный рейз.`;
    } else if (isPair) {
      strength = 'MEDIUM';
      advice = `🥚 Малая пара (${playerCards[0].rank}${playerCards[1].rank}). Главная цель — дешево зайти коллом на флоп и поймать сет (шанс ~12%). Если на флопе сета не будет, лучше сбросить.`;
    } else if (highCard === 14 && suited) {
      strength = 'STRONG';
      advice = `💎 Одномастный туз (A${playerCards.find(c => c.rank !== 'A')?.rank}s). Сильная стартовая рука с отличным потенциалом собрать натсовый флеш. Смело коллируйте или делайте рейз.`;
    } else if (highCard >= 13 && suited && isConnector) {
      strength = 'STRONG';
      advice = `🎨 Одномастные коннекторы. Превосходная играбельность. Высокий шанс собрать сильный стрит или флеш на флопе. Рекомендуется заходить в раздачу рейзом.`;
    } else if (highCard >= 12 && isConnector) {
      strength = 'MEDIUM';
      advice = `🛣️ Бродвейные коннекторы. Хороший потенциал для сбора старшей пары или стрита. Рекомендуется играть коллом в позиции.`;
    } else if (suited && isConnector) {
      strength = 'MEDIUM';
      advice = `🎨 Одномастные коннекторы. Хороший скрытый потенциал для флеша или стрита. Рекомендуется дешевый колл для просмотра флопа.`;
    } else if (highCard >= 12) {
      strength = 'MEDIUM';
      advice = `🔍 Высокие карты. Есть рабочий шанс собрать топ-пару на флопе. Можно сыграть коллом в поздней позиции, но будьте аккуратны при агрессии соперников.`;
    } else {
      strength = 'WEAK';
      advice = `💤 Слабая стартовая рука (${playerCards[0].rank} и ${playerCards[1].rank}). Высокий риск проиграть фишки. Наиболее математически верное действие — Сброс (Фолд).`;
    }

    return {
      currentHandNameRu: isPair ? 'Карманная пара' : 'Карманные карты',
      strength,
      phase,
      draws: [],
      advice,
    };
  }

  // 2. Постфлоп (Flop, Turn, River, Showdown)
  const currentRank = evaluateHand(playerCards, communityCards);
  const currentScore = calculateHandScore(currentRank);
  const currentStrength = evaluateHandStrength(playerCards, communityCards, phase);
  const handNameRu = getHandRankNameRu(currentRank.type);

  // Если это Ривер или Шоудаун — карт больше нет, расчёт вероятностей не нужен
  if (phase === 'RIVER' || phase === 'SHOWDOWN' || phase === 'ROUND_END') {
    let advice = '';
    if (currentScore >= 500) {
      advice = `👑 У вас монстр-рука (${handNameRu})! Вы абсолютно доминируете. Старайтесь наращивать банк: делайте крупные ставки или олл-ин, чтобы собрать максимум фишек!`;
    } else if (currentScore >= 400) {
      advice = `⚡ Отличная готовая комбинация (${handNameRu}). Крайне высокая вероятность победы. Рекомендуются активные ставки (рейз/колл), чтобы заставить оппонента платить.`;
    } else if (currentScore >= 200) {
      advice = `💪 Надежная рука (${handNameRu}). Превосходные шансы. Делайте уверенные ставки для защиты от возможных флеш- или стрит-дро соперника.`;
    } else if (currentRank.type === 'pair') {
      advice = `👀 Готовая пара. Средняя сила руки на ривере. Рекомендуется Чек или аккуратный Колл небольших ставок. Избегайте крупных трат фишек без уверенности.`;
    } else {
      advice = `⚠️ Слабая рука (${handNameRu}). Высокий риск поражения на вскрытии. Не коллируйте ставки оппонента. Рекомендуется Чек, а при агрессии — Фолд.`;
    }

    return {
      currentHandNameRu: handNameRu.charAt(0).toUpperCase() + handNameRu.slice(1),
      strength: currentStrength,
      phase,
      draws: [],
      advice,
    };
  }

  // 3. Симуляция неразданных карт для FLOP и TURN (точное вычисление аутов)
  const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
  const ranks: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  const deck: Card[] = [];
  let id = 0;
  for (const s of suits) {
    for (const r of ranks) {
      deck.push({ suit: s, rank: r, id: `sim-${id++}` });
    }
  }

  // Фильтруем уже увиденные карты
  const dealtKeys = new Set([...playerCards, ...communityCards].map(c => `${c.rank}-${c.suit}`));
  const unseenCards = deck.filter(c => !dealtKeys.has(`${c.rank}-${c.suit}`));
  const N = unseenCards.length; // 47 на флопе, 46 на терне

  const outsMap: Record<string, Set<string>> = {
    flush: new Set(),
    straight: new Set(),
    setFullHouse: new Set(),
  };

  for (const unseenCard of unseenCards) {
    const tempCommunity = [...communityCards, unseenCard];
    const tempRank = evaluateHand(playerCards, tempCommunity);
    const tempScore = calculateHandScore(tempRank);

    // Только если карта действительно улучшает комбинацию
    if (tempScore > currentScore) {
      const cardKey = `${unseenCard.rank}-${unseenCard.suit}`;
      if (tempRank.type === 'straightflush' || tempRank.type === 'flush') {
        outsMap.flush.add(cardKey);
      } else if (tempRank.type === 'straight') {
        outsMap.straight.add(cardKey);
      } else if (tempRank.type === 'quads' || tempRank.type === 'fullhouse' || tempRank.type === 'trips') {
        outsMap.setFullHouse.add(cardKey);
      }
    }
  }

  const draws: { name: string; outs: number; percentage: number }[] = [];

  const addDraw = (name: string, outs: number) => {
    if (outs > 0) {
      let pct = 0;
      if (phase === 'FLOP') {
        // Вероятность собрать к Риверу (2 карты)
        pct = (1 - ((N - outs) / N) * ((N - 1 - outs) / (N - 1))) * 100;
      } else {
        // Вероятность собрать на Ривере (1 карта)
        pct = (outs / N) * 100;
      }
      draws.push({ name, outs, percentage: Math.round(pct * 10) / 10 });
    }
  };

  addDraw('Флеш-дро', outsMap.flush.size);
  addDraw('Стрит-дро', outsMap.straight.size);
  addDraw('Сет / Фулл-Хаус', outsMap.setFullHouse.size);

  // Сортируем дро-комбинации по количеству аутов
  draws.sort((a, b) => b.outs - a.outs);

  // Генерируем тактический совет
  let advice = '';
  const hasFlushDraw = outsMap.flush.size > 0;
  const hasStraightDraw = outsMap.straight.size > 0;
  const hasSetDraw = outsMap.setFullHouse.size > 0;

  if (currentScore >= 200) { // Две пары или лучше уже готовы
    advice = `💪 У вас сильная готовая рука (${handNameRu}). Вы в отличной позиции. Делайте уверенные ставки для защиты от флеш/стрит-дро оппонента и наращивания банка.`;
  } else if (currentRank.type === 'pair') {
    if (hasFlushDraw || hasStraightDraw) {
      advice = `🎭 Пара + Дро-комбинация! У вас колоссальное число аутов на сбор монстр-руки. Рекомендуется полублеф: делайте умеренные рейзы или уверенный колл ставок соперника.`;
    } else {
      advice = `👀 Готовая пара (${handNameRu}). Средняя сила руки. Контролируйте размер банка: играйте через Чек или Колл средних ставок оппонента. Не рискуйте на все фишки.`;
    }
  } else {
    // Нет готовой руки (старшая карта)
    if (hasFlushDraw && hasStraightDraw) {
      advice = `💥 Двойное комбо-дро (Флеш + Стрит)! Потрясающий потенциал: у вас огромное число аутов. Вы фаворит раздачи по математическому ожиданию, смело повышайте ставки!`;
    } else if (hasFlushDraw) {
      const flushSize = outsMap.flush.size;
      advice = `🎨 Флеш-дро (${flushSize} аутов). Отличный шанс закрыть флеш к риверу. Стоит продолжать игру коллом умеренных ставок, чтобы выгодно увидеть следующую карту.`;
    } else if (hasStraightDraw) {
      const strSize = outsMap.straight.size;
      if (strSize >= 8) {
        advice = `🛣️ Двустороннее стрит-дро (8 аутов). Прекрасный шанс достроить стрит. Выгодно коллировать стандартные ставки оппонента в надежде закрыть комбинацию.`;
      } else {
        advice = `🎯 Гатшот (внутреннее стрит-дро, 4 аута). Низкий шанс закрыть стрит. Рекомендуется заходить только бесплатно (чек) или коллировать копеечные ставки.`;
      }
    } else if (hasSetDraw) {
      advice = `🔍 Слабая рука без явных дро. Избегайте трат фишек: играйте Чек, а при любой ставке соперника смело нажимайте Сброс (Фолд).`;
    } else {
      advice = `⚠️ Пустая рука. Дро-комбинаций нет. Наиболее математически верное действие — Сброс (Фолд) при любой активности соперника. Сберегите ваши фишки.`;
    }
  }

  return {
    currentHandNameRu: handNameRu.charAt(0).toUpperCase() + handNameRu.slice(1),
    strength: currentStrength,
    phase,
    draws,
    advice,
  };
}

