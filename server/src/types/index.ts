//Общие типы для покерного сервера

export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  suit: Suit;
  rank: Rank;
  id: string;
}

export interface Player {
  id: string;
  name: string;
  chips: number;
  currentBet: number;
  cards: Card[];
  folded: boolean;
  allIn: boolean;
  isBot?: boolean;
  connected: boolean;
  lastAction?: PlayerActionType;
  currentHandStrength?: 'WEAK' | 'MEDIUM' | 'STRONG';
  currentHandNameRu?: string;
  invested?: number;
  dbUserId?: string;
  deviceId?: string;
}

export type PlayerActionType = 'fold' | 'check' | 'call' | 'raise' | 'allin';

export interface PlayerAction {
  type: PlayerActionType;
  amount?: number;
  playerId: string;
}

/** Состояния конечного автомата игры */
export type GameState =
  | 'WAITING_FOR_PLAYERS'
  | 'PRE_FLOP'
  | 'FLOP'
  | 'TURN'
  | 'RIVER'
  | 'SHOWDOWN'
  | 'ROUND_END';

/** События, вызывающие переходы FSM */
export type GameEvent =
  | 'PLAYER_JOINED'
  | 'START_GAME'
  | 'ALL_BET'
  | 'DEAL_FLOP'
  | 'DEAL_TURN'
  | 'DEAL_RIVER'
  | 'SHOWDOWN'
  | 'ROUND_END'
  | 'PLAYER_DISCONNECTED'
  | 'RESTART_ROUND'
  | 'TIMEOUT_ACTION';

export interface GameContext {
  state: GameState;
  communityCards: Card[];
  pot: number;
  currentBet: number;
  dealerIndex: number;
  currentPlayerIndex: number;
  smallBlind: number;
  bigBlind: number;
  minRaise: number;
  roundStartedAt?: number;
  turnEndsAt?: number;
}

export interface Room {
  id: string;
  name: string;
  players: Player[];
  maxPlayers: number;
  gameContext: GameContext;
  deck: Card[];
  isTraining?: boolean;
  botLogs?: string[];
}
