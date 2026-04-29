import { useState, useEffect } from 'react';
import { addGameChips } from '../services/socket';
import Card from './Card';
import { getStateLabel } from '../state/gameStateMachine';
import type { RoomState } from '../types';
import styles from './GameTable.module.css';

const ACTION_NAMES_RU: Record<string, string> = {
  fold: 'Сброс',
  check: 'Чек',
  call: 'Колл',
  raise: 'Рейз',
  allin: 'Ва-банк',
  small_blind: 'М. Блайнд',
  big_blind: 'Б. Блайнд',
};

interface Props {
  room: RoomState;
  myId: string;
  onAction: (action: string, amount?: number) => void;
  onStart?: () => void;
  onRestart?: () => void;
  isTraining?: boolean;
}

export default function GameTable({ room, myId, onAction, onStart, onRestart }: Props) {
  const [raiseAmount, setRaiseAmount] = useState(room.gameContext.minRaise ?? room.gameContext.bigBlind);
  const [showHint, setShowHint] = useState(false);
  const ctx = room.gameContext;
  const players = room.players;
  const myIndex = players.findIndex((p) => p.id === myId);
  const isMyTurn = myIndex >= 0 && ctx.currentPlayerIndex === myIndex && !players[myIndex]?.folded && !players[myIndex]?.allIn;
  const toCall = Math.max(0, ctx.currentBet - (players[myIndex]?.currentBet ?? 0));
  const canCheck = toCall === 0;
  const minRaise = ctx.minRaise ?? ctx.bigBlind;

  useEffect(() => {
    setRaiseAmount(minRaise);
  }, [minRaise]);

  const orderedPlayers = [...players];
  if (myIndex > 0) {
    const tail = orderedPlayers.splice(0, myIndex);
    orderedPlayers.push(...tail);
  }

  const showOtherCards = ctx.state === 'SHOWDOWN' || ctx.state === 'ROUND_END';

  const activePlayers = players.filter((p) => !p.folded);
  const hasShowdownWinners = Array.isArray(room.winners) && room.winners.length > 0;
  const winnerHands = room.winnerHands ?? [];

  return (
    <div className={styles.table}>
      <div className={styles.stateBar}>
        <span className={styles.stateLabel}>{getStateLabel(ctx.state)}</span>
        <span className={styles.pot}>Банк: {ctx.pot}</span>
        {ctx.turnEndsAt && isMyTurn && <TurnTimer endsAt={ctx.turnEndsAt} />}
      </div>

      {ctx.state === 'ROUND_END' && (
        <div className={styles.winnerBanner}>
          {hasShowdownWinners && winnerHands.length > 0 ? (
            <>
              {winnerHands.map((w) => {
                const player = players[w.playerIndex];
                if (!player) return null;
                return (
                  <div key={w.playerIndex}>
                    Победил {player.name} с комбинацией <strong>{w.handNameRu}</strong>
                  </div>
                );
              })}
            </>
          ) : activePlayers.length === 1 ? (
            <div>
              Победил {activePlayers[0].name} без вскрытия — остальные сбросили карты
            </div>
          ) : null}
        </div>
      )}

      <div className={styles.community}>
        {ctx.communityCards.map((c, i) => (
          <Card key={c.id} card={c} index={i} small />
        ))}
      </div>

<div className={styles.playersCircle}>
  {orderedPlayers.map((p, index) => {
    const isMe = p.id === myId;
    const isDealer = ctx.dealerIndex === players.indexOf(p);
    const isCurrent = ctx.currentPlayerIndex === players.indexOf(p);

    const SEAT_POSITIONS: React.CSSProperties[] = [
      { bottom: '110px', left: '35%', transform: 'translateX(-50%)' }, // 0: User Bottom Left-ish
      { bottom: '110px', left: '65%', transform: 'translateX(-50%)' }, // 1: User Bottom Right-ish
      { top: '50%', left: '2%', transform: 'translateY(-50%)' },     // 2: Left Middle
      { top: '90px', left: '25%' },                                   // 3: Top Left
      { top: '90px', right: '25%' },                                  // 4: Top Right
      { top: '50%', right: '2%', transform: 'translateY(-50%)' }     // 5: Right Middle
    ];

    const pos = SEAT_POSITIONS[index] || SEAT_POSITIONS[0]; // fallback to safe position


    return (
      <div
        key={p.id}
        className={`${styles.player} 
        ${isMe ? styles.me : ''} 
        ${p.folded ? styles.folded : ''} 
        ${isCurrent ? styles.current : ''}`}
        style={pos}
      >
        <div className={styles.playerInfo}>
          <span className={styles.playerName}>
            {p.name}
            {p.isBot && ' (бот)'}
            {isDealer && ' [D]'}
            {p.isBot && (
              <BotThoughtPopup 
                botLogs={room.botLogs}
                alignRight={index === 0 || index === 2 || index === 3}
              />
            )}
          </span>

          <span className={styles.chips}>{p.chips} фишек</span>

          {p.currentBet > 0 && (
            <span className={styles.bet}>Ставка: {p.currentBet}</span>
          )}

          {p.lastAction && (
            <div className={`${styles.actionBadge} ${styles['action_' + p.lastAction]}`}>
              {ACTION_NAMES_RU[p.lastAction] || p.lastAction}
            </div>
          )}

          {p.chips === 0 && p.isBot && (
            <button 
              className={styles.reloadChipsBtn} 
              onClick={() => addGameChips(room.roomId, p.id, 1000)}
              title="Добавить фишки"
            >
              + Фишки
            </button>
          )}
        </div>

        <div className={styles.playerCards}>
          {p.cards.map((c, j) => (
            <Card
              key={c.id}
              card={c}
              faceDown={!isMe && !showOtherCards}
              index={j}
            />
          ))}
        </div>

        {isMe && p.cards.length >= 2 && p.currentHandNameRu && (
          <div className={styles.hintContainer}>
            {showHint && (
              <div className={`${styles.hintText} ${styles[`strength-${p.currentHandStrength || 'WEAK'}`]}`}>
                {p.currentHandNameRu}
              </div>
            )}
            <button
              className={styles.hintToggleBtn}
              onClick={() => setShowHint(!showHint)}
            >
              {showHint ? 'Скрыть подсказку' : 'Подсказка'}
            </button>
          </div>
        )}
      </div>
    );
  })}
</div>

      {ctx.state === 'WAITING_FOR_PLAYERS' && onStart && (
        <div className={styles.actions}>
          <button className={styles.primaryBtn} onClick={onStart} disabled={players.length < 2}>
            Начать игру ({players.length}/2+)
          </button>
        </div>
      )}

      {ctx.state === 'ROUND_END' && onRestart && (
        <div className={styles.actions}>
          <button className={styles.primaryBtn} onClick={onRestart}>
            Следующий раунд
          </button>
        </div>
      )}

      {isMyTurn && ctx.state !== 'WAITING_FOR_PLAYERS' && ctx.state !== 'ROUND_END' && (
        <div className={styles.actions}>
          <button className={styles.foldBtn} onClick={() => onAction('fold')}>
            Сброс
          </button>
          {canCheck ? (
            <button className={styles.checkBtn} onClick={() => onAction('check')}>
              Чек
            </button>
          ) : (
            <button className={styles.callBtn} onClick={() => onAction('call')}>
              Колл {toCall > 0 ? `(${toCall})` : ''}
            </button>
          )}
          <div className={styles.raiseRow}>
            <div className={styles.sliderContainer}>
              <input
                type="range"
                className={styles.slider}
                min={minRaise}
                max={players[myIndex]?.chips ?? minRaise}
                value={raiseAmount}
                onChange={(e) => setRaiseAmount(Number(e.target.value) || minRaise)}
              />
              <div className={styles.sliderValues}>
                <span>Мин: {minRaise}</span>
                <span className={styles.sliderCurrent}>
                  Ставка: 
                  <input
                    type="number"
                    className={styles.raiseInput}
                    min={minRaise}
                    max={players[myIndex]?.chips ?? minRaise}
                    value={raiseAmount}
                    onChange={(e) => setRaiseAmount(Number(e.target.value) || minRaise)}
                  />
                </span>
                <span>Всего: {players[myIndex]?.chips ?? minRaise}</span>
              </div>
            </div>
            <button className={styles.raiseBtn} onClick={() => onAction('raise', raiseAmount)}>
              Рейз
            </button>
          </div>
          <button className={styles.allinBtn} onClick={() => onAction('allin', players[myIndex]?.chips ?? 0)}>
            Ва-банк
          </button>
        </div>
      )}
    </div>
  );
}

function TurnTimer({ endsAt }: { endsAt: number }) {
  const [left, setLeft] = useState(Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)));
  useEffect(() => {
    const t = setInterval(() => {
      setLeft(() => Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)));
    }, 500);
    return () => clearInterval(t);
  }, [endsAt]);
  return <span className={styles.timer}>Ход: {left}с</span>;
}

function BotThoughtPopup({ botLogs, alignRight }: { botLogs?: string[], alignRight?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={styles.botThoughtWrapper} onClick={(e) => e.stopPropagation()}>
      <button className={styles.botThoughtBtn} onClick={(e) => { e.preventDefault(); setOpen(!open); }} title="История действий бота">?</button>
      {open && (
        <div className={`${styles.botThoughtModal} ${alignRight ? styles.alignRight : ''}`}>
          <div className={styles.botThoughtHeader}>
            <strong>Логи действий бота</strong>
            <button className={styles.botThoughtClose} onClick={() => setOpen(false)}>×</button>
          </div>
          <div className={styles.botLogsList}>
            {botLogs && botLogs.length > 0 ? (
              // Reversing to show newest at top, or just show as is with scroll
              botLogs.slice().reverse().map((log, i) => (
                <div key={i} className={styles.botLogItem}>{log}</div>
              ))
            ) : (
              <div className={styles.botLogItem}>Бот еще не делал ходов в этой сессии.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
