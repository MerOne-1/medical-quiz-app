import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Simple learning algorithm - will be enhanced in future versions
 * @param {Array} cards - Array of cards to study
 * @param {number} count - Number of cards to return
 * @returns {Array} Selected cards for study
 */
export const getStudyCards = (cards, count = 10) => {
  // Return a random selection of cards for study
  const shuffled = [...cards].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, cards.length));
};

/**
 * Update card progress after rating
 * @param {string} userId - User ID
 * @param {string} theme - Theme name
 * @param {string} cardId - Card ID
 * @param {number} rating - Rating given by user
 * @returns {Promise<Object>} Updated progress data
 */
export const updateCardProgress = async (userId, theme, cardId, rating) => {
  try {
    const learningRef = doc(db, 'moleculeLearning', userId);
    const learningDoc = await getDoc(learningRef);
    const learningData = learningDoc.exists() ? learningDoc.data() : {};
    const themeData = learningData[theme] || {};
    const cardData = themeData[cardId] || {};

    // Get existing ratings or initialize
    const existingRatings = cardData.ratings || [];
    
    // Update learning data with simplified tracking
    await setDoc(learningRef, {
      ...learningData,
      [theme]: {
        ...themeData,
        [cardId]: {
          ...cardData,
          ratings: [...existingRatings, rating],
          lastRating: rating,
          lastReview: Date.now(),
          attempts: (cardData.attempts || 0) + 1
        }
      }
    }, { merge: true });

    return { success: true };
  } catch (error) {
    console.error('Error updating card progress:', error);
    return { success: false, error };
  }
};
