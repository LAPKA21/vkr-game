//Менеджер комнат: создание, поиск, подключение/отключение игроков.

import type { Room, Player, GameContext, Card } from '../types/index.js';
import { createDeck, dealCards, evaluateHand, getHandRankNameRu } from '../game/pokerLogic.js';
import {
  transition,
  canStartGame,
  allPlayersBetEqual,
  onlyOnePlayerLeft,
  isBettingState,
} from '../game/gameStateMachine.js';
import { getWinnerIndices, compareHandRanks, type HandRankType } from '../game/pokerLogic.js';
import { trainingGameService } from '../application/trainingGameService.js';
import { evaluateHandStrength } from '../domain/bot/handStrengthEvaluator.js';
import { prisma } from '../db.js';

const SMALL_BLIND = 10;
const BIG_BLIND = 20;
const INITIAL_CHIPS = 1000;
const MAX_PLAYERS = 6;
const TURN_TIMEOUT_MS = 30000;

function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function createEmptyContext(): GameContext {
  return {
    state: 'WAITING_FOR_PLAYERS',
    communityCards: [],
    pot: 0,
    currentBet: 0,
    dealerIndex: 0,
    currentPlayerIndex: 0,
    smallBlind: SMALL_BLIND,
    bigBlind: BIG_BLIND,
    minRaise: BIG_BLIND,
  };
}

function createPlayer(id: string, name: string, isBot = false, initialChips = 1000, dbUserId?: string, deviceId?: string): Player {
  return {
    id,
    name,
    chips: initialChips,
    currentBet: 0,
    cards: [],
    folded: false,
    allIn: false,
    isBot: isBot || undefined,
    connected: !isBot,
    dbUserId,
    deviceId
  };
}

const rooms = new Map<string, Room>();
const playerToRoom = new Map<string, string>();
const turnTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

function clearTurnTimeout(roomId: string): void {
  const t = turnTimeouts.get(roomId);
  if (t) {
    clearTimeout(t);
    turnTimeouts.delete(roomId);
  }
}

function postToRoom(roomId: string, emit: (event: string, data: unknown) => void, event: string, data: unknown): void {
  emit(event, data);
}

export function createRoom(name: string, isTraining = false): Room {
  const id = generateId();
  const room: Room = {
    id,
    name,
    players: [],
    maxPlayers: isTraining ? 2 : MAX_PLAYERS,
    gameContext: createEmptyContext(),
    deck: [],
    isTraining: isTraining || undefined,
  };
  rooms.set(id, room);
  if (isTraining) {
    const bot = createPlayer(`bot-${id}`, 'Бот', true);
    room.players.push(bot);
  }
  return room;
}

export function getRoom(roomId: string): Room | undefined {
  return rooms.get(roomId);
}

export function listRooms(): Room[] {
  return [...rooms.values()].filter((r) => !r.isTraining && r.players.length < r.maxPlayers);
}

export function joinRoom(roomId: string, playerId: string, playerName: string, initialChips = 1000, dbUserId?: string, deviceId?: string): { room: Room; player: Player } | null {
  const room = rooms.get(roomId);
  if (!room || room.players.length >= room.maxPlayers) return null;

  // Ищем существующего игрока по сессии: dbUserId (авторизованные) или deviceId (анонимы) или socketId
  const existing = room.players.find((p) =>
    (dbUserId && p.dbUserId === dbUserId) ||
    (p.deviceId && deviceId && p.deviceId === deviceId) ||
    (p.id === playerId)
  );

  if (existing) {
    existing.connected = true;
    existing.name = playerName;

    // Если игрок реконнектнулся с новой вкладки (новый socket.id), обновляем socket.id, чтобы сервер пересылал ответы правильно
    if (existing.id !== playerId) {
      playerToRoom.delete(existing.id);
      existing.id = playerId;
      playerToRoom.set(playerId, roomId);
    }

    // We do NOT reset their chips if they are reconnecting
    return { room, player: existing };
  }

  const player = createPlayer(playerId, playerName, false, initialChips, dbUserId, deviceId);
  room.players.push(player);
  playerToRoom.set(playerId, roomId);
  return { room, player };
}

export function leaveRoom(playerId: string): Room | null {
  const roomId = playerToRoom.get(playerId);
  if (!roomId) return null;
  const room = rooms.get(roomId);
  if (!room) return null;
  const player = room.players.find((p) => p.id === playerId);
  if (player) {
    player.connected = false;

    // Синхронизируем фишки обратно в БД при выходе, чтобы они не пропали
    if (player.dbUserId && player.chips >= 0) {
      prisma.user.update({
        where: { id: player.dbUserId },
        data: { chips: { increment: player.chips } }
      }).catch(err => console.error('Error saving chips on leave:', err));
      player.chips = 0; // Предотвращаем повторное сохранение
    }

    if (room.gameContext.state === 'WAITING_FOR_PLAYERS') {
      room.players = room.players.filter((p) => p.id !== playerId);
      playerToRoom.delete(playerId);
    } else {
      // Если игра идет, игрок остается за столом, но помечается как отключенный (авто-фолд)
      if (!player.folded && !player.allIn) {
        // Мы не фолдим его тут принудительно, это сделает движок и таймер.
      }
    }

    // Если в комнате не осталось ни одного подключенного живого человека
    const hasConnectedHumans = room.players.some((p) => !p.isBot && p.connected);
    if (!hasConnectedHumans) {
      rooms.delete(roomId);
      if (room.isTraining) {
        trainingGameService.removeBot(roomId);
      }
      clearTurnTimeout(roomId);
    }
  }
  return room;
}

/**
 * Периодическое сохранение всех фишек игроков в БД для защиты от падений сервера
 */
function syncRoomDbChips(room: Room) {
  if (room.isTraining) return; // В тренировке фишки виртуальные

  for (const p of room.players) {
    if (p.dbUserId && p.chips >= 0) {
      // Это действие ОБНОВЛЯЕТ фишки в БД до текущего значения на столе 
      // (но мы обнулили их при входе, поэтому мы просто возвращаем их обратно? 
      // Нет! При входе мы делали chips: 0. Если мы будем постоянно делать increment, фишки будут удваиваться!
      // Поэтому при периодическом сохранении мы просто перезаписываем значение в БД!)
      prisma.user.update({
        where: { id: p.dbUserId },
        data: { chips: p.chips }
      }).catch(err => console.error('Error syncing chips:', err));
    }
  }
}

/**
 * Обновление рейтинга игроков в конце раунда в онлайн-сражениях
 */
function updateRatings(room: Room, winners: number[]) {
  if (room.isTraining) return; // В тренировке рейтинг не меняется

  for (let i = 0; i < room.players.length; i++) {
    const p = room.players[i];
    // Обновляем рейтинг только реальным игрокам, которые вложили фишки в банк
    if (p.dbUserId && (p.invested || 0) > 0) {
      const isWinner = winners.includes(i);
      const ratingChange = isWinner ? 25 : -10;

      prisma.user.update({
        where: { id: p.dbUserId },
        data: { rating: { increment: ratingChange } }
      }).catch(err => console.error('Error updating rating:', err));
    }
  }
}

export function startGame(roomId: string): boolean {
  const room = rooms.get(roomId);
  if (!room) return false;
  const ctx = room.gameContext;
  const humanCount = room.players.filter((p) => !p.isBot).length;
  if (!canStartGame(ctx, room.players.length) || humanCount < 1) return false;

  room.deck = createDeck();
  ctx.state = transition(ctx.state, 'START_GAME');
  ctx.communityCards = [];
  ctx.pot = 0;
  ctx.currentBet = BIG_BLIND;
  ctx.minRaise = BIG_BLIND;
  room.players.forEach((p) => {
    p.currentBet = 0;
    p.folded = false;
    p.allIn = false;
    p.cards = [];
    p.lastAction = undefined;
    p.invested = 0;
  });

  ctx.dealerIndex = ctx.dealerIndex % room.players.length;
  const sbIndex = (ctx.dealerIndex + 1) % room.players.length;
  const bbIndex = (ctx.dealerIndex + 2) % room.players.length;

  const sb = room.players[sbIndex];
  const bb = room.players[bbIndex];
  const sbAmount = Math.min(SMALL_BLIND, sb.chips);
  const bbAmount = Math.min(BIG_BLIND, bb.chips);
  sb.chips -= sbAmount;
  sb.currentBet = sbAmount;
  sb.invested = sbAmount;
  sb.lastAction = 'small_blind';
  if (sb.chips === 0) sb.allIn = true;

  bb.chips -= bbAmount;
  bb.currentBet = bbAmount;
  bb.invested = bbAmount;
  bb.lastAction = 'big_blind';
  if (bb.chips === 0) bb.allIn = true;

  ctx.pot = sbAmount + bbAmount;

  let deck = room.deck;
  for (const p of room.players) {
    const { cards, rest } = dealCards(deck, 2);
    p.cards = cards;
    deck = rest;
  }
  room.deck = deck;

  ctx.currentPlayerIndex = (bbIndex + 1) % room.players.length;
  advanceToNextActivePlayer(room);
  ctx.roundStartedAt = Date.now();
  ctx.turnEndsAt = Date.now() + TURN_TIMEOUT_MS;
  return true;
}

function advanceToNextActivePlayer(room: Room): void {
  const ctx = room.gameContext;
  const start = ctx.currentPlayerIndex;
  do {
    ctx.currentPlayerIndex = (ctx.currentPlayerIndex + 1) % room.players.length;
    const p = room.players[ctx.currentPlayerIndex];
    if (!p.folded && !p.allIn) break;
  } while (ctx.currentPlayerIndex !== start);
}

function collectBets(room: Room): void {
  const ctx = room.gameContext;
  let maxBet = 0;
  for (const p of room.players) {
    if (!p.folded) maxBet = Math.max(maxBet, p.currentBet);
  }
  ctx.currentBet = maxBet;
  for (const p of room.players) {
    ctx.pot += p.currentBet;
    p.currentBet = 0;
  }
}

function dealCommunityCards(room: Room, count: number): void {
  const { cards, rest } = dealCards(room.deck, count);
  room.gameContext.communityCards.push(...cards);
  room.deck = rest;
}

function runBotTurn(room: Room, emit: (event: string, data: unknown) => void): void {
  // Используем новый бот с Марковской цепью
  // Передаем applyPlayerAction как параметр для избежания циклических зависимостей
  trainingGameService.executeBotTurn(room, emit, applyPlayerAction);
}

export function applyPlayerAction(
  room: Room,
  playerId: string,
  action: 'fold' | 'check' | 'call' | 'raise' | 'allin',
  amount: number | undefined,
  emit: (event: string, data: unknown) => void
): boolean {
  const ctx = room.gameContext;
  if (!isBettingState(ctx.state)) return false;
  const playerIndex = room.players.findIndex((p) => p.id === playerId);
  if (playerIndex === -1 || ctx.currentPlayerIndex !== playerIndex) return false;
  const player = room.players[playerIndex];
  if (player.folded || player.allIn) return false;

  const toCall = ctx.currentBet - player.currentBet;
  let valid = false;
  switch (action) {
    case 'fold':
      player.folded = true;
      player.lastAction = 'fold';
      valid = true;
      break;
    case 'check':
      if (toCall > 0) return false;
      player.lastAction = 'check';
      valid = true;
      break;
    case 'call': {
      const callAmount = Math.min(toCall, player.chips);
      player.chips -= callAmount;
      player.currentBet += callAmount;
      player.invested = (player.invested || 0) + callAmount;
      player.lastAction = 'call';
      if (player.chips === 0) player.allIn = true;
      valid = true;
      break;
    }
    case 'raise':
    case 'allin': {
      const raiseTo = amount ?? player.chips;
      const totalBet = player.currentBet + Math.min(raiseTo, player.chips);
      if (totalBet <= ctx.currentBet && action === 'raise') return false;
      const add = Math.min(totalBet - player.currentBet, player.chips);
      player.chips -= add;
      player.currentBet += add;
      player.invested = (player.invested || 0) + add;
      ctx.currentBet = player.currentBet;
      ctx.minRaise = Math.max(ctx.minRaise, add);
      player.lastAction = action === 'allin' ? 'allin' : 'raise';
      if (player.chips === 0) player.allIn = true;
      valid = true;
      break;
    }
  }
  if (!valid) return false;

  clearTurnTimeout(room.id);

  if (onlyOnePlayerLeft(room.players)) {
    const winnerIndex = room.players.findIndex((p) => !p.folded);
    const winner = room.players[winnerIndex];
    winner.chips += ctx.pot;
    ctx.state = 'ROUND_END';

    updateRatings(room, [winnerIndex]);
    syncRoomDbChips(room); // Сохраняем в БД

    emit('game:state', serializeRoom(room));
    scheduleNextRound(room, emit);
    return true;
  }

  advanceToNextActivePlayer(room);
  if (allPlayersBetEqual(ctx, room.players)) {
    collectBets(room);
    const activeWithChips = room.players.filter(p => !p.folded && !p.allIn);
    const autoForward = activeWithChips.length <= 1;

    while (true) {
      if (ctx.state === 'PRE_FLOP') {
        dealCommunityCards(room, 3);
        ctx.state = transition(ctx.state, 'ALL_BET');
      } else if (ctx.state === 'FLOP' || ctx.state === 'TURN') {
        dealCommunityCards(room, 1);
        ctx.state = transition(ctx.state, 'ALL_BET');
      } else if (ctx.state === 'RIVER') {
        ctx.state = transition(ctx.state, 'ALL_BET');
        if (ctx.state === 'SHOWDOWN') {
          const winners = doShowdown(room);
          ctx.state = 'ROUND_END';

          updateRatings(room, winners);
          syncRoomDbChips(room); // Сохраняем в БД

          // Описания выигрышных рук для отображения на клиенте
          const winnerHands: { playerIndex: number; handType: HandRankType; handNameRu: string }[] =
            winners.map((wi) => {
              const rank = evaluateHand(room.players[wi].cards, room.gameContext.communityCards);
              const handType = rank.type;
              const handNameRu = getHandRankNameRu(handType);
              return { playerIndex: wi, handType, handNameRu };
            });

          emit('game:state', { ...serializeRoom(room), winners, winnerHands });
          scheduleNextRound(room, emit);
          return true;
        }
      }

      if (!autoForward) break;
    }
    ctx.currentBet = 0;
    ctx.minRaise = BIG_BLIND;
    room.players.forEach((p) => {
      p.currentBet = 0;
      p.lastAction = undefined;
    });
    const start = ctx.dealerIndex;
    do {
      advanceToNextActivePlayer(room);
    } while (ctx.currentPlayerIndex !== start && room.players[ctx.currentPlayerIndex].folded);
  }

  ctx.turnEndsAt = Date.now() + TURN_TIMEOUT_MS;
  emit('game:state', serializeRoom(room));

  const current = room.players[ctx.currentPlayerIndex];
  if (current?.isBot) {
    runBotTurn(room, emit);
  } else {
    scheduleTurnTimeout(room, emit);
  }
  return true;
}

export function scheduleTurnTimeout(room: Room, emit: (event: string, data: unknown) => void): void {
  clearTurnTimeout(room.id);
  const t = setTimeout(() => {
    const ctx = room.gameContext;
    const p = room.players[ctx.currentPlayerIndex];
    if (p && !p.isBot && !p.folded && !p.allIn) {
      const toCall = ctx.currentBet - p.currentBet;
      const defaultAction = toCall === 0 ? 'check' : 'fold';
      applyPlayerAction(room, p.id, defaultAction, undefined, emit);
    }
    turnTimeouts.delete(room.id);
  }, TURN_TIMEOUT_MS);
  turnTimeouts.set(room.id, t);
}

function scheduleNextRound(room: Room, emit: (event: string, data: unknown) => void): void {
  setTimeout(() => {
    if (room.gameContext.state !== 'ROUND_END') return;
    room.gameContext.dealerIndex = (room.gameContext.dealerIndex + 1) % room.players.length;
    room.gameContext.state = transition(room.gameContext.state, 'ROUND_END');
    const humanCount = room.players.filter((p) => !p.isBot && p.connected).length;
    const withChips = room.players.filter((p) => p.chips > 0).length;
    if (humanCount >= 1 && withChips >= 2) {
      startGame(room.id);
      emit('game:state', serializeRoom(room));
      const current = room.players[room.gameContext.currentPlayerIndex];
      if (current?.isBot) {
        runBotTurn(room, emit);
      } else {
        scheduleTurnTimeout(room, emit);
      }
    } else {
      room.gameContext.state = 'WAITING_FOR_PLAYERS';
      room.gameContext.communityCards = [];
      room.gameContext.pot = 0;
      room.players.forEach((p) => {
        p.cards = [];
        p.currentBet = 0;
        p.folded = false;
        p.allIn = false;
      });
      emit('game:state', serializeRoom(room));
    }
  }, 5000);
}

function doShowdown(room: Room): number[] {
  const players = room.players.map((p, i) => ({
    index: i,
    invested: p.invested || 0,
    originalInvested: p.invested || 0,
    folded: p.folded,
    rank: p.folded ? undefined : evaluateHand(p.cards, room.gameContext.communityCards)
  }));

  const uniqueInvested = Array.from(new Set(players.filter(p => p.invested > 0).map(p => p.invested))).sort((a, b) => a - b);
  let currentInvestedLevel = 0;
  const overallWinners = new Set<number>();

  for (const level of uniqueInvested) {
    const potLevel = level - currentInvestedLevel;
    if (potLevel <= 0) continue;

    let subPot = 0;
    for (const p of players) {
      if (p.invested > 0) {
        const contribution = Math.min(p.invested, potLevel);
        p.invested -= contribution;
        subPot += contribution;
      }
    }

    const eligiblePlayers = players.filter(p => !p.folded && p.originalInvested >= level);

    if (eligiblePlayers.length > 0 && subPot > 0) {
      let best = eligiblePlayers[0];
      const winners = [best.index];
      for (let i = 1; i < eligiblePlayers.length; i++) {
        // rank is guaranteed here because not folded
        const cmp = compareHandRanks(eligiblePlayers[i].rank!, best.rank!);
        if (cmp > 0) {
          best = eligiblePlayers[i];
          winners.length = 0;
          winners.push(best.index);
        } else if (cmp === 0) {
          winners.push(eligiblePlayers[i].index);
        }
      }

      const winAmount = Math.floor(subPot / winners.length);
      for (const wi of winners) {
        room.players[wi].chips += winAmount;
        overallWinners.add(wi);
      }
    } else if (eligiblePlayers.length === 0 && subPot > 0) {
      const anyActive = players.filter(p => !p.folded);
      if (anyActive.length > 0) {
        let bestActive = anyActive[0];
        for (const p of anyActive) {
          if (p.originalInvested > bestActive.originalInvested) bestActive = p;
        }
        room.players[bestActive.index].chips += subPot;
        overallWinners.add(bestActive.index);
      }
    }

    currentInvestedLevel = level;
  }

  room.gameContext.pot = 0;
  return Array.from(overallWinners);
}

export function serializeRoom(room: Room): Record<string, unknown> {
  return {
    roomId: room.id,
    name: room.name,
    isTraining: room.isTraining,
    players: room.players.map((p) => {
      let currentHandStrength;
      let currentHandNameRu;

      if (p.cards.length >= 2) {
        const rank = evaluateHand(p.cards, room.gameContext.communityCards);
        currentHandNameRu = getHandRankNameRu(rank.type);
        currentHandStrength = evaluateHandStrength(p.cards, room.gameContext.communityCards, room.gameContext.state);
      }

      return {
        id: p.id,
        name: p.name,
        chips: p.chips,
        currentBet: p.currentBet,
        cards: p.cards,
        folded: p.folded,
        allIn: p.allIn,
        isBot: p.isBot,
        connected: p.connected,
        lastAction: p.lastAction,
        currentHandStrength,
        currentHandNameRu,
      };
    }),
    gameContext: {
      state: room.gameContext.state,
      communityCards: room.gameContext.communityCards,
      pot: room.gameContext.pot,
      currentBet: room.gameContext.currentBet,
      dealerIndex: room.gameContext.dealerIndex,
      currentPlayerIndex: room.gameContext.currentPlayerIndex,
      smallBlind: room.gameContext.smallBlind,
      bigBlind: room.gameContext.bigBlind,
      minRaise: room.gameContext.minRaise,
      turnEndsAt: room.gameContext.turnEndsAt,
    },
    botLogs: room.botLogs,
  };
}

export function runShowdownIfNeeded(room: Room, emit: (event: string, data: unknown) => void): void {
  const ctx = room.gameContext;
  if (ctx.state !== 'SHOWDOWN') return;
  doShowdown(room);
  ctx.state = 'ROUND_END';
  emit('game:state', serializeRoom(room));
  scheduleNextRound(room, emit);
}

export function restartRound(roomId: string, emit: (event: string, data: unknown) => void): boolean {
  const room = rooms.get(roomId);
  if (!room) return false;
  const ctx = room.gameContext;
  if (ctx.state !== 'WAITING_FOR_PLAYERS' && ctx.state !== 'ROUND_END') return false;
  const started = startGame(roomId);
  if (started) {
    emit('game:state', serializeRoom(room));
    const current = room.players[ctx.currentPlayerIndex];
    if (current?.isBot) {
      runBotTurn(room, emit);
    } else {
      scheduleTurnTimeout(room, emit);
    }
  }
  return started;
}
