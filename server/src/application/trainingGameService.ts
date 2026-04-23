/**
 * Сервис для режима обучения с ботом.
 *
 * Интегрирует бота с Марковской цепью в игровой процесс:
 * - Управляет жизненным циклом бота
 * - Обрабатывает действия бота через FSM
 * - Добавляет задержку для симуляции размышления
 */

import type { Room, Player, GameContext } from '../types/index.js';
import { MarkovBot } from '../domain/bot/markovBot.js';
import { BotDifficulty } from '../domain/bot/markovModel.js';
import { evaluateHandStrength } from '../domain/bot/handStrengthEvaluator.js';
import { evaluateHand, getHandRankNameRu } from '../game/pokerLogic.js';

const STAGE_RU = {
  WHAT: '', // Fallback
  WAITING_FOR_PLAYERS: 'Ожидание',
  PRE_FLOP: 'Пре-флоп',
  FLOP: 'Флоп',
  TURN: 'Терн',
  RIVER: 'Ривер',
  SHOWDOWN: 'Вскрытие',
  ROUND_END: 'Конец раунда',
};

/**
 * Генерирует случайную задержку перед действием бота (симуляция размышления)
 * @returns задержка в миллисекундах от 1 до 2 секунд
 */
function getBotThinkingDelay(): number {
  return 1000 + Math.random() * 1000; // 1-2 секунды
}

/**
 * Сервис для управления ботом в режиме обучения
 */
export class TrainingGameService {
  private bots: Map<string, MarkovBot> = new Map();

  /**
   * Получает или создает бота для комнаты
   */
  private getBot(roomId: string, difficulty: BotDifficulty = BotDifficulty.NORMAL): MarkovBot {
    let bot = this.bots.get(roomId);
    if (!bot) {
      bot = new MarkovBot(difficulty);
      this.bots.set(roomId, bot);
    }
    return bot;
  }

  /**
   * Выполняет ход бота в режиме обучения
   *
   * @param room - комната с игрой
   * @param emit - функция для отправки событий через Socket.io
   * @param applyAction - функция для применения действия игрока (избегает циклических зависимостей)
   */
  executeBotTurn(
    room: Room,
    emit: (event: string, data: unknown) => void,
    applyAction: (
      room: Room,
      playerId: string,
      action: 'fold' | 'check' | 'call' | 'raise' | 'allin',
      amount: number | undefined,
      emit: (event: string, data: unknown) => void
    ) => boolean
  ): void {
    const ctx = room.gameContext;
    const botPlayer = room.players[ctx.currentPlayerIndex];

    // Проверяем, что текущий игрок - бот
    if (!botPlayer?.isBot) {
      return;
    }

    // Находим оппонента (реального игрока)
    const opponent = room.players.find((p) => !p.isBot && !p.folded);

    // Получаем бота для этой комнаты
    const bot = this.getBot(room.id);

    // Получаем решение бота
    const decision = bot.decideAction(botPlayer, ctx, opponent || null, ctx.pot, ctx.minRaise);

    // Добавляем задержку для симуляции размышления
    setTimeout(() => {
      // Обновляем ссылки на текущий контекст и бота (за время ожидания они могли измениться)
      const currentCtx = room.gameContext;
      const currentBotIndex = room.players.findIndex((p) => p.id === botPlayer.id);

      // Проверяем, что всё ещё ход бота
      if (currentBotIndex === -1 || currentCtx.currentPlayerIndex !== currentBotIndex) {
        return;
      }

      // Пытаемся применить основное решение
      const ok = applyAction(room, botPlayer.id, decision.action, decision.amount, emit);

      // Если по каким‑то причинам действие оказалось невалидным — делаем безопасный fallback
      let finalAction = decision.action;
      let finalAmount = decision.amount;
      if (!ok) {
        const toCall = Math.max(0, currentCtx.currentBet - room.players[currentBotIndex].currentBet);
        const canCheck = toCall === 0;
        const fallbackAction: 'check' | 'call' | 'fold' =
          canCheck ? 'check' : toCall > 0 ? 'call' : 'fold';

        console.warn('Bot primary action was invalid, using fallback:', {
          primary: decision,
          fallback: fallbackAction,
        });

        finalAction = fallbackAction;
        finalAmount = undefined;
        applyAction(room, botPlayer.id, fallbackAction, undefined, emit);
      }
      
      // Записываем лог действия бота
      if (!room.botLogs) room.botLogs = [];
      const stageRu = STAGE_RU[currentCtx.state] || currentCtx.state;
      let strengthStr = 'Неизвестно';
      let handRu = 'Скрыто';
      
      const currentBotPlayer = room.players[currentBotIndex];
      if (currentBotPlayer.cards.length >= 2) {
         const strVal = evaluateHandStrength(currentBotPlayer.cards, currentCtx.communityCards, currentCtx.state);
         strengthStr = strVal === 'STRONG' ? 'СИЛЬНАЯ' : strVal === 'MEDIUM' ? 'СРЕДНЯЯ' : 'СЛАБАЯ';
         const rank = evaluateHand(currentBotPlayer.cards, currentCtx.communityCards);
         handRu = getHandRankNameRu(rank.type);
      }
      
      const actionRuMap: Record<string, string> = {
        fold: 'Сброс',
        check: 'Чек',
        call: 'Колл',
        raise: finalAmount ? `Рейз (${finalAmount})` : 'Рейз',
        allin: 'Ва-банк'
      };
      
      const actionRu = actionRuMap[finalAction] || finalAction;
      const currentStyle = bot.getOpponentStyle();
      const styleDesc = currentStyle === 'AGGRESSIVE' ? 'Агрессор' : currentStyle === 'TIGHT' ? 'Осторожный' : 'Нормальный';
      
      const logEntry = `[${new Date().toLocaleTimeString('ru-RU')}] Этап: ${stageRu}. Сила руки: ${handRu} (${strengthStr}). Стиль оппонента: ${styleDesc}. Действие: ${actionRu}`;
      
      room.botLogs.push(logEntry);
      if (room.botLogs.length > 50) room.botLogs.shift();
      
    }, getBotThinkingDelay());
  }

  /**
   * Устанавливает уровень сложности бота для комнаты
   */
  setBotDifficulty(roomId: string, difficulty: BotDifficulty): void {
    const bot = this.getBot(roomId, difficulty);
    bot.setDifficulty(difficulty);
  }

  /**
   * Удаляет бота при удалении комнаты
   */
  removeBot(roomId: string): void {
    this.bots.delete(roomId);
  }
}

// Singleton экземпляр сервиса
export const trainingGameService = new TrainingGameService();
