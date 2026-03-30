/**
 * Конечный автомат (FSM) для управления состоянием покерной игры.
 *
 * Состояния:
 * - WAITING_FOR_PLAYERS: ожидание игроков, минимум 2 для старта
 * - PRE_FLOP: раздача карт, первый круг ставок
 * - FLOP: три общие карты, второй круг ставок
 * - TURN: четвертая общая карта, третий круг ставок
 * - RIVER: пятая общая карта, четвертый круг ставок
 * - SHOWDOWN: вскрытие карт, определение победителя
 * - ROUND_END: конец раунда, подготовка к следующему
 *
 * События и переходы описаны в TRANSITIONS.
 * Проверки проверяют возможность перехода.
 */

import type { GameState, GameEvent, GameContext } from '../types/index.js';

export type { GameState, GameEvent };

/** Матрица переходов: [текущее состояние][событие] -> новое состояние | null (переход запрещен) */
const TRANSITIONS: Record<GameState, Partial<Record<GameEvent, GameState>>> = {
  WAITING_FOR_PLAYERS: {
    PLAYER_JOINED: 'WAITING_FOR_PLAYERS',
    START_GAME: 'PRE_FLOP',
    PLAYER_DISCONNECTED: 'WAITING_FOR_PLAYERS',
    RESTART_ROUND: 'WAITING_FOR_PLAYERS',
  },
  PRE_FLOP: {
    ALL_BET: 'FLOP',
    PLAYER_DISCONNECTED: 'PRE_FLOP',
    TIMEOUT_ACTION: 'PRE_FLOP',
  },
  FLOP: {
    ALL_BET: 'TURN',
    PLAYER_DISCONNECTED: 'FLOP',
    TIMEOUT_ACTION: 'FLOP',
  },
  TURN: {
    ALL_BET: 'RIVER',
    PLAYER_DISCONNECTED: 'TURN',
    TIMEOUT_ACTION: 'TURN',
  },
  RIVER: {
    ALL_BET: 'SHOWDOWN',
    PLAYER_DISCONNECTED: 'RIVER',
    TIMEOUT_ACTION: 'RIVER',
  },
  SHOWDOWN: {
    SHOWDOWN: 'ROUND_END',
    PLAYER_DISCONNECTED: 'SHOWDOWN',
  },
  ROUND_END: {
    ROUND_END: 'WAITING_FOR_PLAYERS',
    RESTART_ROUND: 'PRE_FLOP',
    PLAYER_DISCONNECTED: 'ROUND_END',
  },
};

/** Проверяет, допустим ли переход из state по событию event.
 * Возвращает новое состояние или null, если переход запрещен.*/
export function getNextState(state: GameState, event: GameEvent): GameState | null {
  const next = TRANSITIONS[state]?.[event];
  return next ?? null;
}

/**Проверка можно ли начать игру (минимум 2 игрока, не все боты)*/
export function canStartGame(ctx: GameContext, playerCount: number): boolean {
  return playerCount >= 2 && ctx.state === 'WAITING_FOR_PLAYERS';
}

/** Проверка все ли активные игроки поставили одинаково в текущем раунде*/
export function allPlayersBetEqual(
  ctx: GameContext,
  players: { currentBet: number; folded: boolean; allIn: boolean; lastAction?: string | undefined }[]
): boolean {
  const active = players.filter((p) => !p.folded);
  if (active.length <= 1) return true;
  const targetBet = ctx.currentBet;
  return active.every((p) => p.allIn || (p.currentBet === targetBet && p.lastAction !== undefined));
}

/**Проверка остался ли один не сбросивший карты (победа без шоудауна)*/
export function onlyOnePlayerLeft(players: { folded: boolean }[]): boolean {
  return players.filter((p) => !p.folded).length <= 1;
}

/**Выполнение перехода FSM возвращает новое состояние или текущее, если переход невозможен*/
export function transition(state: GameState, event: GameEvent): GameState {
  const next = getNextState(state, event);
  return next ?? state;
}

/** Состояния, в которых идет торговля (ожидаем действия игроков) */
export const BETTING_STATES: GameState[] = ['PRE_FLOP', 'FLOP', 'TURN', 'RIVER'];

export function isBettingState(state: GameState): boolean {
  return BETTING_STATES.includes(state);
}
