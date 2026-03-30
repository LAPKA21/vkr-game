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
  lastAction?: string;
  currentHandStrength?: 'WEAK' | 'MEDIUM' | 'STRONG';
  currentHandNameRu?: string;
  invested?: number;
}

export type GameState =
  | 'WAITING_FOR_PLAYERS'
  | 'PRE_FLOP'
  | 'FLOP'
  | 'TURN'
  | 'RIVER'
  | 'SHOWDOWN'
  | 'ROUND_END';

export interface GameContext {
  state: GameState;
  communityCards: Card[];
  pot: number;
  currentBet: number;
  dealerIndex: number;
  currentPlayerIndex: number;
  smallBlind: number;
  bigBlind: number;
  minRaise?: number;
  turnEndsAt?: number;
}

export interface WinnerHandInfo {
  playerIndex: number;
  handType: 'high' | 'pair' | 'twopair' | 'trips' | 'straight' | 'flush' | 'fullhouse' | 'quads' | 'straightflush';
  handNameRu: string;
}

export interface RoomState {
  roomId: string;
  name: string;
  isTraining?: boolean;
  players: Player[];
  gameContext: GameContext;
  winners?: number[];
  winnerHands?: WinnerHandInfo[];
}

export interface RoomListItem {
  id: string;
  name: string;
  playerCount: number;
  maxPlayers: number;
}
