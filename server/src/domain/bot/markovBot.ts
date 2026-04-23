/**
 * Основной класс бота, использующего Марковскую цепь для принятия решений.
 *
 * Логика работы:
 * 1. Получает текущее состояние игры из FSM
 * 2. Оценивает силу руки через handStrengthEvaluator
 * 3. Определяет последнее действие оппонента
 * 4. Формирует состояние Марковской цепи
 * 5. Получает решение от MarkovModel
 * 6. Возвращает действие с учетом игровых ограничений
 */

import type { Player, GameContext, Card, PlayerActionType } from '../../types/index.js';
import { MarkovModel, type BotAction, BotDifficulty, type MarkovState } from './markovModel.js';
import { evaluateHandStrength, type HandStrength } from './handStrengthEvaluator.js';

/**
 * Решение бота с действием и опциональной суммой ставки
 */
export interface BotDecision {
  action: 'fold' | 'check' | 'call' | 'raise' | 'allin';
  amount?: number;
}

/**
 * Бот на основе Марковской цепи
 */
export class MarkovBot {
  private markov: MarkovModel;
  private difficulty: BotDifficulty;

  constructor(difficulty: BotDifficulty = BotDifficulty.NORMAL) {
    this.difficulty = difficulty;
    this.markov = new MarkovModel(difficulty);
  }

  /**
   * Принимает решение на основе текущего состояния игры
   *
   * @param bot - игрок-бот
   * @param gameContext - контекст игры (FSM состояние, общие карты и т.д.)
   * @param opponent - оппонент (реальный игрок)
   * @param pot - размер банка
   * @param minRaise - минимальная сумма рейза
   * @returns решение бота
   */
  decideAction(
    bot: Player,
    gameContext: GameContext,
    opponent: Player | null,
    pot: number,
    minRaise: number
  ): BotDecision {
    // 1. Получаем текущую фазу из FSM
    const phase = gameContext.state;

    // Проверяем, что мы в состоянии торговли
    if (phase !== 'PRE_FLOP' && phase !== 'FLOP' && phase !== 'TURN' && phase !== 'RIVER') {
      return { action: 'check' };
    }

    // 2. Оцениваем силу руки
    const handStrength = evaluateHandStrength(bot.cards, gameContext.communityCards, phase);

    // 3. Получаем последнее действие оппонента
    const opponentLastAction: PlayerActionType | 'NONE' = (opponent?.lastAction ?? 'NONE') as PlayerActionType | 'NONE';

    // 4. Записываем действие оппонента для сбора статистики и стиля
    this.markov.recordOpponentAction(opponentLastAction);
    const opponentStyle = this.markov.getOpponentStyle();

    // 5. Формируем состояние Марковской цепи
    const markovState: MarkovState = {
      phase,
      handStrength,
      opponentLastAction,
    };

    // 5. Получаем решение от MarkovModel
    const botAction = this.markov.getNextAction(markovState);

    // 6. Преобразуем действие бота в игровое действие с учетом ограничений
    const decision = this.convertToGameAction(botAction, bot, gameContext, pot, minRaise);

    // Логирование решения
    console.log('Bot decision:', {
      state: markovState,
      opponentStyle,
      action: botAction,
      decision,
      botChips: bot.chips,
      currentBet: gameContext.currentBet,
      pot,
    });

    return decision;
  }

  /**
   * Преобразует действие Марковской модели в игровое действие с учетом ограничений
   */
  private convertToGameAction(
    botAction: BotAction,
    bot: Player,
    gameContext: GameContext,
    pot: number,
    minRaise: number
  ): BotDecision {
    const toCall = Math.max(0, gameContext.currentBet - bot.currentBet);
    const canCheck = toCall === 0;
    const botChips = bot.chips;

    switch (botAction) {
      case 'FOLD':
        // Если можно чекнуть, не фолдим
        if (canCheck) {
          return { action: 'check' };
        }
        return { action: 'fold' };

      case 'CHECK':
        if (canCheck) {
          return { action: 'check' };
        }
        // Если нельзя чекнуть, делаем колл
        return { action: 'call' };

      case 'CALL':
        if (canCheck) {
          return { action: 'check' };
        }
        if (toCall >= botChips) {
          return { action: 'allin' };
        }
        return { action: 'call' };

      case 'RAISE':
        if (canCheck) {
          // Если можно чекнуть, но хотим рейз, делаем минимальный рейз
          const raiseAmount = Math.min(botChips, Math.max(minRaise, Math.floor(pot * 0.3)));
          if (raiseAmount >= botChips) {
            return { action: 'allin' };
          }
          return { action: 'raise', amount: raiseAmount };
        }
        // Если нужно коллить, но хотим рейз, делаем рейз поверх колла
        const totalRaise = Math.min(botChips, toCall + Math.max(minRaise, Math.floor(pot * 0.3)));
        if (totalRaise >= botChips) {
          return { action: 'allin' };
        }
        return { action: 'raise', amount: totalRaise };

      case 'ALL_IN':
        return { action: 'allin' };

      default:
        return { action: canCheck ? 'check' : 'call' };
    }
  }

  /**
   * Устанавливает уровень сложности бота
   */
  setDifficulty(difficulty: BotDifficulty): void {
    this.difficulty = difficulty;
    this.markov.setDifficulty(difficulty);
  }

  /**
   * Получает текущий уровень сложности
   */
  getDifficulty(): BotDifficulty {
    return this.difficulty;
  }

  /**
   * Получает распознанный стиль оппонента
   */
  getOpponentStyle(): string {
    return this.markov.getOpponentStyle();
  }
}

