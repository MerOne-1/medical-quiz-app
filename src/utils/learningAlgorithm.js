import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

// Constants for the learning algorithm
const INITIAL_BATCH_SIZE = 10;
const NEW_CARDS_PER_BATCH = 5;
const MASTERY_THRESHOLD = 0.8; // 80% of cards must be mastered to proceed

// Get the mastery level of a card based on its history
const getCardMastery = (cardProgress) => {
  if (!cardProgress || !cardProgress.ratings || cardProgress.ratings.length === 0) {
    return 0;
  }

  // Card is mastered if:
  // 1. Last rating was 4 or 5
  // 2. OR last two ratings were 3
  const recentRatings = cardProgress.ratings.slice(-2);
  const lastRating = recentRatings[recentRatings.length - 1];

  if (lastRating >= 4) return 1;
  if (recentRatings.length >= 2 && recentRatings.every(r => r >= 3)) return 1;
  
  // Partial mastery for rating 3
  if (lastRating === 3) return 0.5;
  
  return 0;
};

// Get cards for the current study session
export const getStudyCards = async (userId, theme, allCards) => {
  try {
    // Get user's learning progress
    const learningDoc = await getDoc(doc(db, 'moleculeLearning', userId));
    const learningData = learningDoc.exists() ? learningDoc.data()[theme] || {} : {};

    // Calculate mastery for all cards
    const cardsWithMastery = allCards.map(card => ({
      ...card,
      mastery: getCardMastery(learningData[card.id]),
      attempts: (learningData[card.id]?.ratings || []).length
    }));

    // Find current batch
    const batches = [];
    let currentCards = [];
    let remainingCards = [...cardsWithMastery];

    // Create batches of cards
    while (remainingCards.length > 0) {
      const batchSize = batches.length === 0 ? INITIAL_BATCH_SIZE : NEW_CARDS_PER_BATCH;
      const batch = remainingCards.slice(0, batchSize);
      batches.push(batch);
      remainingCards = remainingCards.slice(batchSize);
    }

    // Find the current batch (first non-mastered batch)
    let currentBatchIndex = 0;
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const masteredCount = batch.filter(card => card.mastery === 1).length;
      if (masteredCount / batch.length < MASTERY_THRESHOLD) {
        currentBatchIndex = i;
        break;
      }
    }

    return {
      currentBatch: batches[currentBatchIndex] || [],
      masteredCards: cardsWithMastery.filter(card => card.mastery === 1),
      progress: {
        currentBatch: currentBatchIndex + 1,
        totalBatches: batches.length,
        cardsInBatch: batches[currentBatchIndex]?.length || 0,
        masteredInBatch: (batches[currentBatchIndex] || []).filter(card => card.mastery === 1).length
      }
    };
  } catch (error) {
    console.error('Error getting study cards:', error);
    return { currentBatch: [], masteredCards: [], progress: null };
  }
};

// Update card progress after rating
export const updateCardProgress = async (userId, theme, cardId, rating) => {
  try {
    const learningRef = doc(db, 'moleculeLearning', userId);
    const learningDoc = await getDoc(learningRef);
    const learningData = learningDoc.exists() ? learningDoc.data() : {};
    const themeData = learningData[theme] || {};
    const cardData = themeData[cardId] || { ratings: [] };

    // Add new rating to history
    const newRatings = [...(cardData.ratings || []), rating];

    // Update learning data
    await setDoc(learningRef, {
      ...learningData,
      [theme]: {
        ...themeData,
        [cardId]: {
          ...cardData,
          ratings: newRatings,
          lastRating: rating,
          lastAttempt: new Date().toISOString(),
          attempts: (cardData.attempts || 0) + 1
        }
      }
    }, { merge: true });

    return getCardMastery({ ratings: newRatings });
  } catch (error) {
    console.error('Error updating card progress:', error);
    throw error;
  }
};

// Get study statistics
export const getStudyStats = async (userId, theme) => {
  try {
    const learningDoc = await getDoc(doc(db, 'moleculeLearning', userId));
    const learningData = learningDoc.exists() ? learningDoc.data()[theme] || {} : {};

    const stats = {
      totalCards: 0,
      masteredCards: 0,
      inProgressCards: 0,
      averageAttempts: 0,
      averageRating: 0
    };

    let totalAttempts = 0;
    let totalRatings = 0;
    let ratingCount = 0;

    Object.values(learningData).forEach(progress => {
      stats.totalCards++;
      const mastery = getCardMastery(progress);
      
      if (mastery === 1) {
        stats.masteredCards++;
      } else if (progress.attempts > 0) {
        stats.inProgressCards++;
      }

      if (progress.attempts) {
        totalAttempts += progress.attempts;
      }

      if (progress.ratings) {
        progress.ratings.forEach(rating => {
          totalRatings += rating;
          ratingCount++;
        });
      }
    });

    stats.averageAttempts = totalAttempts / (stats.totalCards || 1);
    stats.averageRating = ratingCount > 0 ? totalRatings / ratingCount : 0;

    return stats;
  } catch (error) {
    console.error('Error getting study stats:', error);
    return null;
  }
};
