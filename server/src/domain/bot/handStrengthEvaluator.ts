/**
 * Оценка силы руки для бота на основе карт игрока и общих карт.
 * Использует простую эвристику для категоризации силы руки.
 */

import type { Card, GameState } from '../../types/index.js';
import { evaluateHand, type HandRank } from '../../game/pokerLogic.js';

/**
 * Категории силы руки для Марковской модели
 */
export type HandStrength = 'WEAK' | 'MEDIUM' | 'STRONG';

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
        ...playerCards.map((c) => {
          const rankMap: Record<string, number> = {
            '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
            'J': 11, 'Q': 12, 'K': 13, 'A': 14,
          };
          return rankMap[c.rank] || 0;
        })
      );
      const isPair = playerCards[0].rank === playerCards[1].rank;
      const suited = playerCards[0].suit === playerCards[1].suit;

      // Пара или высокие карты (10+) = MEDIUM
      if (isPair || highCard >= 10) {
        return highCard >= 12 || isPair ? 'MEDIUM' : 'WEAK';
      }
      // Остальное = WEAK
      return 'WEAK';

    case 'FLOP':
      // После флопа используем реальную оценку руки
      weakThreshold = 50; // Старшая карта или слабая пара
      mediumThreshold = 150; // Пара или две пары
      break;

    case 'TURN':
    case 'RIVER':
      // На поздних стадиях пороги выше
      weakThreshold = 100; // Слабая пара
      mediumThreshold = 200; // Две пары или тройка
      break;

    default:
      // Для других состояний используем средние пороги
      weakThreshold = 50;
      mediumThreshold = 150;
  }

  // Определение категории по порогам
  if (score < weakThreshold) {
    return 'WEAK';
  } else if (score < mediumThreshold) {
    return 'MEDIUM';
  } else {
    return 'STRONG';
  }
}
