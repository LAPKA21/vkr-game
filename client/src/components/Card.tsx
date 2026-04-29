import { useState } from 'react';
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
  const [loaded, setLoaded] = useState(false);

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
  
  // Валеты, дамы, короли и туз пик у нас с цифрой 2 на конце (после удаления дубликатов)
  const isFaceCard = ['J', 'Q', 'K'].includes(card.rank) || (card.rank === 'A' && suitName === 'spades');
  const suffix = isFaceCard ? '2' : '';
  
  const imageSrc = `/PNG-cards-1.3/${rankName}_of_${suitName}${suffix}.png`;

  return (
    <div
      className={`${styles.card} ${styles.imageCard} ${small ? styles.small : ''}`}
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <img 
        src={imageSrc} 
        alt={`${card.rank} of ${card.suit}`} 
        className={styles.cardImage} 
        style={{ opacity: loaded ? 1 : 0, transition: 'opacity 0.2s ease-in' }}
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
}
