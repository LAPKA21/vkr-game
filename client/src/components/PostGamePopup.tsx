import React, { useRef } from 'react';
import styles from '../pages/GameRoom.module.css';

const FUNNY_PHRASES = [
  "Мама говорила, что покер - это математика. Она не знала про твои блефы.",
  "Ушли красиво! Ну или хотя бы ушли.",
  "Главное не победа, а вовремя унести ноги.",
  "Фишки - пыль, главное - эмоции!",
  "Казино всегда в выигрыше, но сегодня ты оказал сопротивление.",
  "Твой внутренний Фил Айви гордится тобой.",
  "Зато теперь можно спокойно попить чай."
];

export interface PostGameStats {
  gamesPlayed: number;
  chipsWon: number;
  initialChips: number;
  currentChips: number;
}

interface Props {
  stats: PostGameStats;
  onClose: () => void;
}

export default function PostGamePopup({ stats, onClose }: Props) {
  const randomPhrase = useRef(FUNNY_PHRASES[Math.floor(Math.random() * FUNNY_PHRASES.length)]);
  const balanceChange = stats.currentChips - stats.initialChips;

  return (
    <div className={styles.popupOverlay}>
      <div className={styles.popupContent}>
        <h2 className={styles.popupTitle}>Статистика сессии</h2>
        
        <div className={styles.statsList}>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Сыграно партий:</span>
            <span className={styles.statValue}>{stats.gamesPlayed}</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Выиграно фишек:</span>
            <span className={`${styles.statValue} ${styles.positive}`}>+{stats.chipsWon}</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Изменение баланса:</span>
            <span className={`${styles.statValue} ${balanceChange >= 0 ? styles.positive : styles.negative}`}>
              {balanceChange > 0 ? '+' : ''}{balanceChange}
            </span>
          </div>
        </div>

        <p className={styles.jokePhrase}>"{randomPhrase.current}"</p>

        <div className={styles.popupButtons}>
          <button className={styles.confirmExit} onClick={onClose}>
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}
