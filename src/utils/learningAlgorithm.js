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

    // Sort cards by mastery and attempts
    const sortedCards = cardsWithMastery.sort((a, b) => {
      // Prioritize cards that aren't mastered
      if (a.mastery !== b.mastery) return a.mastery - b.mastery;
      // Then cards with fewer attempts
      return (a.attempts || 0) - (b.attempts || 0);
    });

    // Get the current active cards (not fully mastered)
    const activeCards = sortedCards.filter(card => card.mastery < 1);
    const masteredCards = sortedCards.filter(card => card.mastery === 1);

    // Calculate how many cards should be in the current batch
    let currentBatchSize = INITIAL_BATCH_SIZE;
    let currentBatchIndex = Math.floor(masteredCards.length / NEW_CARDS_PER_BATCH);

    // Get cards for the current batch
    let currentBatch = [];
    
    // First, add cards that are partially learned (mastery > 0)
    const partiallyLearned = activeCards.filter(card => card.mastery > 0);
    currentBatch.push(...partiallyLearned);

    // Then add new cards until we reach the target batch size
    const newCards = activeCards.filter(card => card.mastery === 0);
    const remainingSlots = currentBatchSize - currentBatch.length;
    if (remainingSlots > 0) {
      currentBatch.push(...newCards.slice(0, remainingSlots));
    }

    // If we don't have enough active cards, add some mastered cards for review
    if (currentBatch.length < currentBatchSize && masteredCards.length > 0) {
      const reviewCards = masteredCards
        .sort((a, b) => (a.lastReview || 0) - (b.lastReview || 0))
        .slice(0, currentBatchSize - currentBatch.length);
      currentBatch.push(...reviewCards);
    }

    // Calculate total batches based on remaining cards
    const remainingNewCards = activeCards.length - currentBatch.filter(c => c.mastery === 0).length;
    const totalBatches = currentBatchIndex + Math.ceil(remainingNewCards / NEW_CARDS_PER_BATCH) + 1;

    return {
      currentBatch: currentBatch,
      masteredCards: masteredCards,
      progress: {
        currentBatch: currentBatchIndex + 1,
        totalBatches: totalBatches,
        cardsInBatch: currentBatch.length,
        masteredInBatch: currentBatch.filter(card => card.mastery === 1).length
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

    // Calculate mastery level
    let mastery = 0;
    if (rating >= 4) {
      mastery = 1; // Instant mastery for high ratings
    } else if (rating === 3 && newRatings.length >= 2 && newRatings.slice(-2)[0] === 3) {
      mastery = 1; // Mastery achieved with two consecutive 3s
    } else if (rating === 3) {
      mastery = 0.5; // Partial mastery for single 3
    }

    // Update learning data
    await setDoc(learningRef, {
      ...learningData,
      [theme]: {
        ...themeData,
        [cardId]: {
          mastery,
          lastReview: Date.now(),
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
