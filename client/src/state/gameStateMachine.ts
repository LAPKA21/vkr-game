/**
 * Конечный автомат на клиенте: синхронизация с сервером и отображение состояний.
 * Состояния и переходы соответствуют серверному gameStateMachine.
 */

import type { GameState } from '../types';

export const GAME_STATES: GameState[] = [
  'WAITING_FOR_PLAYERS',
  'PRE_FLOP',
  'FLOP',
  'TURN',
  'RIVER',
  'SHOWDOWN',
  'ROUND_END',
];

export const BETTING_STATES: GameState[] = ['PRE_FLOP', 'FLOP', 'TURN', 'RIVER'];

export function isBettingState(state: GameState): boolean {
  return BETTING_STATES.includes(state);
}

export function getStateLabel(state: GameState): string {
  const labels: Record<GameState, string> = {
    WAITING_FOR_PLAYERS: 'Ожидание игроков',
    PRE_FLOP: 'Пре-флоп',
    FLOP: 'Флоп',
    TURN: 'Тёрн',
    RIVER: 'Ривер',
    SHOWDOWN: 'Вскрытие',
    ROUND_END: 'Конец раунда',
  };
  return labels[state] ?? state;
}
