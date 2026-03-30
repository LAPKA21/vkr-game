import type { Card as CardType } from '../types';
import styles from './Card.module.css';

const RANK_COLUMNS: Record<string, number> = {
  'A': 0, '2': 1, '3': 2, '4': 3, '5': 4, '6': 5, '7': 6, '8': 7, '9': 8, '10': 9, 'J': 10, 'Q': 11, 'K': 12
};

const SUIT_ROWS: Record<string, number> = {
  'diamonds': 0,
  'clubs': 1,
  'hearts': 2,
  'spades': 3
};

function getSpritePosition(suit: string, rank: string) {
  const col = RANK_COLUMNS[rank] ?? 0;
  const row = SUIT_ROWS[suit] ?? 0;
  const x = col === 0 ? 0 : (col / 12) * 100;
  const y = row === 0 ? 0 : (row / 3) * 100;
  return `${x}% ${y}%`;
}

interface Props {
  card: CardType;
  faceDown?: boolean;
  small?: boolean;
  index?: number;
}

export default function Card({ card, faceDown, small, index = 0 }: Props) {
  if (faceDown) {
    return (
      <div
        className={`${styles.card} ${styles.faceDown} ${small ? styles.small : ''}`}
        style={{ animationDelay: `${index * 0.05}s` }}
      >
        <div className={styles.back} />
      </div>
    );
  }

  const spritePos = getSpritePosition(card.suit, card.rank);

  return (
    <div
      className={`${styles.card} ${styles.pixelCard} ${small ? styles.small : ''}`}
      style={{ 
        animationDelay: `${index * 0.05}s`,
        backgroundPosition: spritePos
      }}
    />
  );
}
