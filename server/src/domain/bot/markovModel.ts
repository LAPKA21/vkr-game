/**
 * Марковская цепь для принятия решений ботом в покере.
 *
 * Состояние Марковской цепи:
 * - phase: фаза игры (PRE_FLOP, FLOP, TURN, RIVER)
 * - handStrength: сила руки (WEAK, MEDIUM, STRONG)
 * - opponentLastAction: последнее действие оппонента
 *
 * Переходы: вероятности выбора действий (FOLD, CHECK, CALL, RAISE, ALL_IN)
 *
 * Выбор действия происходит через weighted random selection:
 * 1. Получаем вероятности для текущего состояния
 * 2. Нормализуем их (сумма = 1)
 * 3. Генерируем случайное число [0, 1)
 * 4. Выбираем действие по кумулятивному распределению
 */

import type { GameState, PlayerActionType } from '../../types/index.js';
import type { HandStrength } from './handStrengthEvaluator.js';

/**
 * Действия, которые может выбрать бот
 */
export type BotAction = 'FOLD' | 'CHECK' | 'CALL' | 'RAISE' | 'ALL_IN';

export type OpponentStyle = 'NORMAL' | 'TIGHT' | 'AGGRESSIVE';

/**
 * Состояние Марковской цепи
 */
export interface MarkovState {
  phase: GameState;
  handStrength: HandStrength;
  opponentLastAction: PlayerActionType | 'NONE';
}

/**
 * Матрица вероятностей переходов: [ключ состояния][действие] -> вероятность
 */
type TransitionMatrix = Map<string, Record<BotAction, number>>;

/**
 * Уровни сложности бота
 */
export enum BotDifficulty {
  EASY = 'EASY',
  NORMAL = 'NORMAL',
  HARD = 'HARD',
}

/**
 * Марковская модель для принятия решений ботом
 */
export class MarkovModel {
  private transitionMatrix: TransitionMatrix;
  private difficulty: BotDifficulty;
  private opponentActionHistory: PlayerActionType[] = [];

  constructor(difficulty: BotDifficulty = BotDifficulty.NORMAL) {
    this.difficulty = difficulty;
    this.transitionMatrix = new Map();
    this.initializeMatrix();
  }

  /**
   * Инициализирует матрицу переходов с базовыми вероятностями
   */
  private initializeMatrix(): void {
    // Базовые вероятности для каждого уровня сложности
    const baseProbabilities = this.getBaseProbabilities();

    // Генерируем все возможные состояния
    const phases: GameState[] = ['PRE_FLOP', 'FLOP', 'TURN', 'RIVER'];
    const strengths: HandStrength[] = ['WEAK', 'MEDIUM', 'STRONG'];
    const opponentActions: (PlayerActionType | 'NONE')[] = ['NONE', 'check', 'call', 'raise', 'allin'];

    for (const phase of phases) {
      for (const strength of strengths) {
        for (const oppAction of opponentActions) {
          const stateKey = this.getStateKey(phase, strength, oppAction);
          this.transitionMatrix.set(stateKey, { ...baseProbabilities[strength] });
        }
      }
    }
  }

  /**
   * Возвращает базовые вероятности для каждого уровня сложности и силы руки
   */
  private getBaseProbabilities(): Record<HandStrength, Record<BotAction, number>> {
    switch (this.difficulty) {
      case BotDifficulty.EASY:
        return {
          WEAK: { FOLD: 0.5, CHECK: 0.3, CALL: 0.15, RAISE: 0.04, ALL_IN: 0.01 },
          MEDIUM: { FOLD: 0.2, CHECK: 0.4, CALL: 0.25, RAISE: 0.13, ALL_IN: 0.02 },
          STRONG: { FOLD: 0.05, CHECK: 0.2, CALL: 0.25, RAISE: 0.4, ALL_IN: 0.1 },
        };
      case BotDifficulty.NORMAL:
        return {
          // Reduced blind folding; more checks/calls
          WEAK: { FOLD: 0.25, CHECK: 0.45, CALL: 0.25, RAISE: 0.04, ALL_IN: 0.01 },
          MEDIUM: { FOLD: 0.1, CHECK: 0.35, CALL: 0.35, RAISE: 0.17, ALL_IN: 0.03 },
          STRONG: { FOLD: 0.02, CHECK: 0.15, CALL: 0.2, RAISE: 0.5, ALL_IN: 0.13 },
        };
      case BotDifficulty.HARD:
        return {
          WEAK: { FOLD: 0.15, CHECK: 0.45, CALL: 0.35, RAISE: 0.04, ALL_IN: 0.01 },
          MEDIUM: { FOLD: 0.05, CHECK: 0.3, CALL: 0.4, RAISE: 0.2, ALL_IN: 0.05 },
          STRONG: { FOLD: 0.01, CHECK: 0.1, CALL: 0.15, RAISE: 0.55, ALL_IN: 0.19 },
        };
      default:
        return this.getBaseProbabilities();
    }
  }

  /**
   * Генерирует ключ состояния для матрицы переходов
   */
  private getStateKey(phase: GameState, strength: HandStrength, opponentAction: PlayerActionType | 'NONE'): string {
    return `${phase}_${strength}_${opponentAction}`;
  }

  /**
   * Получает следующее действие на основе текущего состояния
   *x
   * 1. Получаем вероятности для состояния
   * 2. Нормализуем (сумма = 1)
   * 3. Генерируем случайное число [0, 1)
   * 4. Выбираем действие по кумулятивному распределению
   */
  getNextAction(state: MarkovState): BotAction {
    const stateKey = this.getStateKey(state.phase, state.handStrength, state.opponentLastAction);
    const probabilities = this.transitionMatrix.get(stateKey);

    if (!probabilities) {
      // Fallback: если состояние не найдено, используем средние вероятности
      console.warn(`State not found: ${stateKey}, using default probabilities`);
      const defaultProbs = this.getBaseProbabilities()[state.handStrength];
      return this.selectActionByProbability(defaultProbs);
    }

    const style = this.getOpponentStyle();

    // Адаптация вероятностей в зависимости от действия и стиля оппонента
    const adaptedProbs = this.adaptProbabilities(probabilities, state.opponentLastAction, state.handStrength, style);

    return this.selectActionByProbability(adaptedProbs);
  }

  /**
   * Записывает действие оппонента для сбора статистики
   */
  recordOpponentAction(action: PlayerActionType | 'NONE'): void {
    if (action !== 'NONE') {
      this.opponentActionHistory.push(action);
      if (this.opponentActionHistory.length > 15) {
        this.opponentActionHistory.shift();
      }
    }
  }

  /**
   * Вычисляет стиль оппонента на основе истории действий
   */
  getOpponentStyle(): OpponentStyle {
    if (this.opponentActionHistory.length < 5) return 'NORMAL';

    const aggrCount = this.opponentActionHistory.filter(a => a === 'raise' || a === 'allin').length;
    const passiveCount = this.opponentActionHistory.filter(a => a === 'fold' || a === 'check').length;

    const aggrRatio = aggrCount / this.opponentActionHistory.length;
    const passiveRatio = passiveCount / this.opponentActionHistory.length;

    if (aggrRatio > 0.4) return 'AGGRESSIVE';
    if (passiveRatio > 0.5) return 'TIGHT';
    return 'NORMAL';
  }

  /**
   * Адаптирует вероятности в зависимости от стиля и действия оппонента
   */
  private adaptProbabilities(
    baseProbs: Record<BotAction, number>,
    opponentAction: PlayerActionType | 'NONE',
    handStrength: HandStrength,
    opponentStyle: OpponentStyle
  ): Record<BotAction, number> {
    const adapted = { ...baseProbs };

    // 1. Адаптация под долговременный стиль оппонента
    if (opponentStyle === 'TIGHT') {
      if (handStrength === 'WEAK' || handStrength === 'MEDIUM') {
        // Чаще блефуем против осторожных
        adapted.RAISE *= 1.5;
        adapted.CALL *= 1.2;
      }
    } else if (opponentStyle === 'AGGRESSIVE') {
      if (handStrength === 'WEAK') {
        // Меньше блефуем против маньяков
        adapted.RAISE *= 0.5;
        adapted.FOLD *= 1.5;
      } else if (handStrength === 'STRONG') {
        // Ловим в ловушку
        adapted.CALL *= 1.5;
        adapted.RAISE *= 1.2;
      }
    }

    // 2. Кратковременная адаптация к последнему ходу
    if (opponentAction === 'raise' || opponentAction === 'allin') {
      // Увеличиваем вероятность фолда при слабой руке
      if (handStrength === 'WEAK') {
        adapted.FOLD = Math.min(0.7, adapted.FOLD * 1.5);
        adapted.CALL = adapted.CALL * 0.7;
        adapted.RAISE = adapted.RAISE * 0.5;
      }
      // При сильной руке увеличиваем вероятность ответной агрессии
      else if (handStrength === 'STRONG') {
        adapted.RAISE = Math.min(0.6, adapted.RAISE * 1.3);
        adapted.ALL_IN = Math.min(0.25, adapted.ALL_IN * 1.5);
        adapted.CALL = adapted.CALL * 0.8;
      }
    }
    // Если оппонент сделал пассивное действие (check/call)
    else if (opponentAction === 'check' || opponentAction === 'call') {
      // При сильной руке увеличиваем вероятность рейза
      if (handStrength === 'STRONG' || handStrength === 'MEDIUM') {
        adapted.RAISE = Math.min(0.6, adapted.RAISE * 1.4);
        adapted.CALL = adapted.CALL * 0.9;
      }
    }

    // Нормализуем вероятности
    return this.normalizeProbabilities(adapted);
  }

  /**
   * Нормализует вероятности так, чтобы их сумма была равна 1
   */
  private normalizeProbabilities(probs: Record<BotAction, number>): Record<BotAction, number> {
    const sum = Object.values(probs).reduce((acc, val) => acc + val, 0);
    if (sum === 0) {
      // Если сумма равна 0, возвращаем равномерное распределение
      return {
        FOLD: 0.2,
        CHECK: 0.2,
        CALL: 0.2,
        RAISE: 0.2,
        ALL_IN: 0.2,
      };
    }
    const normalized: Record<BotAction, number> = {} as Record<BotAction, number>;
    for (const [action, prob] of Object.entries(probs) as [BotAction, number][]) {
      normalized[action] = prob / sum;
    }
    return normalized;
  }

  /**
   * Выбирает действие на основе вероятностей (weighted random selection)
   */
  private selectActionByProbability(probs: Record<BotAction, number>): BotAction {
    const random = Math.random();
    let cumulative = 0;

    const actions: BotAction[] = ['FOLD', 'CHECK', 'CALL', 'RAISE', 'ALL_IN'];

    for (const action of actions) {
      cumulative += probs[action];
      if (random < cumulative) {
        return action;
      }
    }

    // Fallback (не должно произойти при нормализованных вероятностях)
    return 'CHECK';
  }

  /**
   * Устанавливает уровень сложности и переинициализирует матрицу
   */
  setDifficulty(difficulty: BotDifficulty): void {
    this.difficulty = difficulty;
    this.initializeMatrix();
  }
}
