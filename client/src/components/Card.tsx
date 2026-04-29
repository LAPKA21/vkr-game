import type { Card as CardType } from '../types';
import styles from './Card.module.css';

const RANK_MAP: Record<string, string> = {
  'A': 'ace',
  'J': 'jack',
  'Q': 'queen',
  'K': 'king'
};

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

  const rankName = RANK_MAP[card.rank] || card.rank;
  const suitName = card.suit.toLowerCase();
  const imageSrc = `/PNG-cards-1.3/${rankName}_of_${suitName}.png`;

  return (
    <div
      className={`${styles.card} ${styles.imageCard} ${small ? styles.small : ''}`}
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <img src={imageSrc} alt={`${card.rank} of ${card.suit}`} className={styles.cardImage} />
    </div>
  );
}
