import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

// Constants for the learning algorithm
const MIN_BATCH_SIZE = 15; // Minimum cards to study at once
const MAX_NEW_CARDS = 5;  // Maximum new cards to introduce at once

// Calculate the priority score for a card
const getCardPriority = (card, now = Date.now()) => {
  if (!card.lastReview) return 100; // New cards get high priority
  
  const daysSinceReview = (now - card.lastReview) / (1000 * 60 * 60 * 24);
  const recentRatings = card.ratings?.slice(-3) || [];
  const lastRating = recentRatings[recentRatings.length - 1] || 0;
  
  // Base priority on last rating
  let priority = 0;
  if (lastRating <= 2) {
    // Low ratings need quick review
    priority = 90 + (daysSinceReview * 2);
  } else if (lastRating === 3) {
    // Medium ratings need moderate review
    priority = 70 + daysSinceReview;
  } else {
    // High ratings need less frequent review
    priority = 50 + (daysSinceReview / 2);
  }
  
  // Boost priority for cards with inconsistent ratings
  if (recentRatings.length >= 2) {
    const variance = Math.variance(recentRatings);
    priority += variance * 10;
  }
  
  // Boost priority for cards that haven't been seen much
  if (card.ratings?.length < 3) {
    priority += 20;
  }
  
  return priority;
};

// Get cards for the current study session
export const getStudyCards = async (userId, theme, allCards) => {
  try {
    // Get user's learning progress
    const learningDoc = await getDoc(doc(db, 'moleculeLearning', userId));
    const learningData = learningDoc.exists() ? learningDoc.data()[theme] || {} : {};

    // Prepare cards with their learning data
    const now = Date.now();
    const cardsWithData = allCards.map(card => {
      const progress = learningData[card.id] || {};
      return {
        ...card,
        lastReview: progress.lastReview || null,
        ratings: progress.ratings || [],
        priority: getCardPriority({ ...progress, lastReview: progress.lastReview }, now)
      };
    });

    // Sort cards by priority (highest first)
    const sortedCards = cardsWithData.sort((a, b) => b.priority - a.priority);

    // Select cards for the current batch
    let currentBatch = [];
    let newCardCount = 0;

    // First, add high-priority cards (low ratings or need review)
    const highPriorityCards = sortedCards.filter(card => card.priority >= 70);
    currentBatch.push(...highPriorityCards);

    // Then add some new cards if we have room
    const newCards = sortedCards.filter(card => !card.lastReview);
    if (newCards.length > 0 && currentBatch.length < MIN_BATCH_SIZE) {
      const newToAdd = Math.min(
        MAX_NEW_CARDS,
        MIN_BATCH_SIZE - currentBatch.length,
        newCards.length
      );
      currentBatch.push(...newCards.slice(0, newToAdd));
      newCardCount = newToAdd;
    }

    // Finally, add medium-priority cards to reach minimum batch size
    if (currentBatch.length < MIN_BATCH_SIZE) {
      const mediumPriorityCards = sortedCards
        .filter(card => card.priority < 70 && !currentBatch.includes(card))
        .slice(0, MIN_BATCH_SIZE - currentBatch.length);
      currentBatch.push(...mediumPriorityCards);
    }

    // Shuffle the batch to prevent predictable order
    currentBatch = currentBatch
      .map(value => ({ value, sort: Math.random() }))
      .sort((a, b) => a.sort - b.sort)
      .map(({ value }) => value);

    // Calculate progress statistics
    const totalCards = allCards.length;
    const masteredCards = cardsWithData.filter(card => {
      const recentRatings = card.ratings.slice(-2);
      return recentRatings.length > 0 && recentRatings.every(r => r >= 4);
    });

    return {
      currentBatch,
      progress: {
        totalCards,
        masteredCards: masteredCards.length,
        currentBatchSize: currentBatch.length,
        newCards: newCardCount,
        reviewCards: currentBatch.length - newCardCount
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
    const cardData = themeData[cardId] || {};

    // Get existing ratings or initialize
    const existingRatings = cardData.ratings || [];
    
    // Calculate review interval based on rating and history
    let reviewInterval;
    if (rating <= 2) {
      // Poor rating - review very soon and more frequently
      const consecutivePoor = existingRatings
        .slice()
        .reverse()
        .takeWhile(r => r <= 2)
        .length;
      // More frequent reviews for consistently poor ratings
      reviewInterval = 1000 * 60 * Math.max(2, 5 - consecutivePoor); // 2-5 minutes
    } else if (rating === 3) {
      // Medium rating - review in moderate time
      const consecutiveMedium = existingRatings
        .slice()
        .reverse()
        .takeWhile(r => r === 3)
        .length;
      // Gradually increase interval for consistent medium ratings
      reviewInterval = 1000 * 60 * 15 * (consecutiveMedium + 1); // 15+ minutes
    } else {
      // Good rating - increase interval exponentially
      const consecutiveGood = existingRatings
        .slice()
        .reverse()
        .takeWhile(r => r >= 4)
        .length;
      // Start at 30 minutes, double each time (30m, 1h, 2h, 4h, etc.)
      reviewInterval = 1000 * 60 * 30 * Math.pow(2, consecutiveGood);
    }

    // Cap maximum interval at 2 days to ensure regular review
    const maxInterval = 1000 * 60 * 60 * 48;
    reviewInterval = Math.min(reviewInterval, maxInterval);

    // Calculate priority boost based on historical performance
    const avgRating = existingRatings.length > 0
      ? existingRatings.reduce((a, b) => a + b, 0) / existingRatings.length
      : 0;
    const priorityBoost = avgRating < 3 ? 20 : 0; // Boost priority for struggling cards

    // Update learning data
    await setDoc(learningRef, {
      ...learningData,
      [theme]: {
        ...themeData,
        [cardId]: {
          ...cardData,
          ratings: [...existingRatings, rating],
          lastRating: rating,
          lastReview: Date.now(),
          nextReview: Date.now() + reviewInterval,
          reviewInterval,
          priorityBoost,
          consecutiveCorrect: rating >= 4 ? (cardData.consecutiveCorrect || 0) + 1 : 0,
          attempts: (cardData.attempts || 0) + 1,
          userId,
          cardId,
          theme
        }
      }
    }, { merge: true });

    return { reviewInterval, nextReview: Date.now() + reviewInterval };
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
