export interface Molecule {
  id: string;
  name: string;
  image: string;
  details?: string;
}

export interface Theme {
  id: string;
  name: string;
  description?: string;
}

export interface UserProgress {
  totalCards: number;
  masteredCards: number;
  currentBatchSize: number;
  newCards: number;
  reviewCards: number;
}
