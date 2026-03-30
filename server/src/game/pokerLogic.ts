/**
 * Логика покера: колода, раздача, оценка рук (Texas Hold'em).
 */

import type { Card, Suit, Rank } from '../types/index.js';

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

const RANK_VALUES: Record<Rank, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
  'J': 11, 'Q': 12, 'K': 13, 'A': 14,
};

export function createDeck(): Card[] {
  const deck: Card[] = [];
  let id = 0;
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank, id: `card-${id++}` });
    }
  }
  return shuffle(deck);
}

function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function dealCards(deck: Card[], count: number): { cards: Card[]; rest: Card[] } {
  const cards = deck.slice(0, count);
  const rest = deck.slice(count);
  return { cards, rest };
}

export function rankValue(rank: Rank): number {
  return RANK_VALUES[rank];
}

/** Оценка силы руки: чем больше, тем лучше. Упрощенная версия для бота и шоудауна. */
export type HandRank =
  | { type: 'high'; value: number }
  | { type: 'pair'; value: number; kicker: number }
  | { type: 'twopair'; high: number; low: number; kicker: number }
  | { type: 'trips'; value: number; kicker: number }
  | { type: 'straight'; high: number }
  | { type: 'flush'; high: number }
  | { type: 'fullhouse'; trips: number; pair: number }
  | { type: 'quads'; value: number; kicker: number }
  | { type: 'straightflush'; high: number };

export type HandRankType = HandRank['type'];

function getValues(cards: Card[]): number[] {
  return cards.map((c) => rankValue(c.rank)).sort((a, b) => b - a);
}

function countByValue(cards: Card[]): Map<number, number> {
  const m = new Map<number, number>();
  for (const c of cards) {
    const v = rankValue(c.rank);
    m.set(v, (m.get(v) ?? 0) + 1);
  }
  return m;
}

function isFlush(cards: Card[]): boolean {
  const suits = new Set(cards.map((c) => c.suit));
  return suits.size === 1;
}

function isStraight(values: number[]): { is: boolean; high: number } {
  const uniq = [...new Set(values)].sort((a, b) => b - a);
  for (let i = 0; i <= uniq.length - 5; i++) {
    const slice = uniq.slice(i, i + 5);
    if (slice[0] - slice[4] === 4) return { is: true, high: slice[0] };
  }
  if (uniq.includes(14)) {
    const low = uniq.filter((v) => v !== 14).concat([1]);
    if (low.length >= 4 && low[0] === 5 && low.includes(2) && low.includes(3) && low.includes(4)) {
      return { is: true, high: 5 };
    }
  }
  return { is: false, high: 0 };
}

/** Оценивает лучшую руку из 5-7 карт (2 свои + до 5 общих). */
export function evaluateHand(playerCards: Card[], communityCards: Card[]): HandRank {
  const all = [...playerCards, ...communityCards];
  if (all.length < 5) return { type: 'high', value: Math.max(...all.map((c) => rankValue(c.rank))) };

  const values = getValues(all);
  const bySuit = new Map<Suit, Card[]>();
  for (const c of all) {
    const arr = bySuit.get(c.suit) ?? [];
    arr.push(c);
    bySuit.set(c.suit, arr);
  }

  for (const [, suitCards] of bySuit) {
    if (suitCards.length >= 5) {
      const suitValues = getValues(suitCards);
      const str = isStraight(suitValues);
      if (str.is) return { type: 'straightflush', high: str.high };
      return { type: 'flush', high: Math.max(...suitValues) };
    }
  }

  const counts = countByValue(all);
  const entries = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  const quads = entries.find(([, n]) => n === 4);
  if (quads) {
    const kicker = entries.find(([v]) => v !== quads[0])?.[0] ?? 0;
    return { type: 'quads', value: quads[0], kicker };
  }
  const trips = entries.find(([, n]) => n === 3);
  const pairEntry = entries.find(([v, n]) => n >= 2 && v !== trips?.[0]);
  if (trips && pairEntry) {
    return { type: 'fullhouse', trips: trips[0], pair: pairEntry[0] };
  }
  const str = isStraight(values);
  if (str.is) return { type: 'straight', high: str.high };
  if (trips) {
    const kicker = entries.find(([v]) => v !== trips[0])?.[0] ?? 0;
    return { type: 'trips', value: trips[0], kicker };
  }
  const twoPairs = entries.filter(([, n]) => n === 2);
  if (twoPairs.length >= 2) {
    const [high, low] = twoPairs.map(([v]) => v).sort((a, b) => b - a);
    const kicker = entries.find(([v]) => v !== high && v !== low)?.[0] ?? 0;
    return { type: 'twopair', high, low, kicker };
  }
  if (pairEntry) {
    const kicker = entries.find(([v]) => v !== pairEntry[0])?.[0] ?? 0;
    return { type: 'pair', value: pairEntry[0], kicker };
  }
  return { type: 'high', value: values[0] };
}

/** Сравнение двух HandRank для определения победителя. Возвращает >0 если a лучше, <0 если b лучше, 0 ничья. */
export function compareHandRanks(a: HandRank, b: HandRank): number {
  const order: HandRank['type'][] = ['high', 'pair', 'twopair', 'trips', 'straight', 'flush', 'fullhouse', 'quads', 'straightflush'];
  const ia = order.indexOf(a.type);
  const ib = order.indexOf(b.type);
  if (ia !== ib) return ia - ib;
  switch (a.type) {
    case 'high':
      return (a as { value: number }).value - (b as { value: number }).value;
    case 'pair':
      const ap = a as { value: number; kicker: number };
      const bp = b as { value: number; kicker: number };
      return ap.value !== bp.value ? ap.value - bp.value : ap.kicker - bp.kicker;
    case 'twopair': {
      const at = a as { high: number; low: number; kicker: number };
      const bt = b as { high: number; low: number; kicker: number };
      if (at.high !== bt.high) return at.high - bt.high;
      if (at.low !== bt.low) return at.low - bt.low;
      return at.kicker - bt.kicker;
    }
    case 'trips': {
      const at = a as { value: number; kicker: number };
      const bt = b as { value: number; kicker: number };
      return at.value !== bt.value ? at.value - bt.value : at.kicker - bt.kicker;
    }
    case 'straight':
    case 'flush':
    case 'straightflush':
      return (a as { high: number }).high - (b as { high: number }).high;
    case 'fullhouse': {
      const af = a as { trips: number; pair: number };
      const bf = b as { trips: number; pair: number };
      return af.trips !== bf.trips ? af.trips - bf.trips : af.pair - bf.pair;
    }
    case 'quads': {
      const aq = a as { value: number; kicker: number };
      const bq = b as { value: number; kicker: number };
      return aq.value !== bq.value ? aq.value - bq.value : aq.kicker - bq.kicker;
    }
    default:
      return 0;
  }
}

/** Вернуть индекс победителя (или несколько при ничьей). */
export function getWinnerIndices(
  players: { folded: boolean; cards: Card[] }[],
  communityCards: Card[]
): number[] {
  const active = players
    .map((p, i) => ({ ...p, index: i }))
    .filter((p) => !p.folded && p.cards.length >= 2);
  if (active.length === 0) return [];
  if (active.length === 1) return [active[0].index];
  const evaluated = active.map((p) => ({
    index: p.index,
    rank: evaluateHand(p.cards, communityCards),
  }));
  let best = evaluated[0];
  const winners = [best.index];
  for (let i = 1; i < evaluated.length; i++) {
    const cmp = compareHandRanks(evaluated[i].rank, best.rank);
    if (cmp > 0) {
      best = evaluated[i];
      winners.length = 0;
      winners.push(best.index);
    } else if (cmp === 0) {
      winners.push(evaluated[i].index);
    }
  }
  return winners;
}

/** русское название комбинации для вывода по типу HandRank. */
export function getHandRankNameRu(type: HandRankType): string {
  switch (type) {
    case 'high':
      return 'старшая карта';
    case 'pair':
      return 'пара';
    case 'twopair':
      return 'две пары';
    case 'trips':
      return 'сет (тройка)';
    case 'straight':
      return 'стрит';
    case 'flush':
      return 'флеш';
    case 'fullhouse':
      return 'фул-хаус';
    case 'quads':
      return 'каре';
    case 'straightflush':
      return 'стрит-флеш';
    default:
      return 'рука';
  }
}
