import { db, storage } from '../firebase';
import { collection, doc, setDoc, getDoc, updateDoc, deleteDoc, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

// Create or update a personal deck
export const saveUserDeck = async (userId, deckName, cards) => {
  try {
    if (!deckName || typeof deckName !== 'string') {
      throw new Error('Le nom du deck est requis');
    }

    if (deckName.length < 1 || deckName.length > 50) {
      throw new Error('Le nom du deck doit contenir entre 1 et 50 caractères');
    }

    // Sanitize deck name for use in document ID
    const sanitizedDeckName = deckName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const deckId = `${userId}_${sanitizedDeckName}_${Date.now()}`;

    // Check if deck already exists
    const decksRef = collection(db, 'userDecks');
    const decksSnapshot = await getDocs(decksRef);
    const exists = decksSnapshot.docs.some(doc => {
      const data = doc.data();
      return data.userId === userId && data.deckName.toLowerCase() === deckName.toLowerCase();
    });

    if (exists) {
      throw new Error('Un deck avec ce nom existe déjà');
    }

    const deckRef = doc(db, 'userDecks', deckId);
    await setDoc(deckRef, {
      userId,
      deckName,
      cards: cards || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    return true;
  } catch (error) {
    console.error('Error saving deck:', error);
    throw error;
  }
};

// Get all decks for a user
export const getUserDecks = async (userId) => {
  try {
    const decksRef = collection(db, 'userDecks');
    const decksSnapshot = await getDocs(decksRef);
    const decks = [];
    
    decksSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.userId === userId) {
        decks.push({
          id: doc.id,
          ...data
        });
      }
    });
    
    return decks;
  } catch (error) {
    console.error('Error getting decks:', error);
    throw error;
  }
};

// Upload a molecule image
export const uploadMoleculeImage = async (userId, file) => {
  try {
    const fileExtension = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExtension}`;
    const storageRef = ref(storage, `userMolecules/${userId}/${fileName}`);
    
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    
    return {
      fileName,
      url
    };
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
};

// Delete a molecule image
export const deleteMoleculeImage = async (userId, fileName) => {
  try {
    const storageRef = ref(storage, `userMolecules/${userId}/${fileName}`);
    await deleteObject(storageRef);
    return true;
  } catch (error) {
    console.error('Error deleting image:', error);
    throw error;
  }
};

// Add a card to a deck
export const addCardToDeck = async (userId, deckName, card) => {
  try {
    // Find the deck by userId and deckName
    const decksRef = collection(db, 'userDecks');
    const decksSnapshot = await getDocs(decksRef);
    const deckDoc = decksSnapshot.docs.find(doc => {
      const data = doc.data();
      return data.userId === userId && data.deckName === deckName;
    });

    if (deckDoc) {
      const currentCards = deckDoc.data().cards || [];
      await updateDoc(doc(db, 'userDecks', deckDoc.id), {
        cards: [...currentCards, card],
        updatedAt: new Date().toISOString()
      });
    } else {
      await saveUserDeck(userId, deckName, [card]);
    }
    
    return true;
  } catch (error) {
    console.error('Error adding card:', error);
    throw error;
  }
};

// Remove a card from a deck
// Delete a deck and all its associated images
export const deleteDeck = async (userId, deckId) => {
  try {
    // Get the deck first to get all card images
    const deckRef = doc(db, 'userDecks', deckId);
    const deckDoc = await getDoc(deckRef);
    
    if (!deckDoc.exists()) {
      throw new Error('Deck not found');
    }
    
    const deckData = deckDoc.data();
    if (deckData.userId !== userId) {
      throw new Error('Unauthorized');
    }
    
    // Delete all card images from storage
    const deleteImagePromises = deckData.cards
      .filter(card => card.fileName) // Only delete images that have a fileName
      .map(card => deleteMoleculeImage(userId, card.fileName));
    
    await Promise.all(deleteImagePromises);
    
    // Delete the deck document
    await deleteDoc(deckRef);
    
    return true;
  } catch (error) {
    console.error('Error deleting deck:', error);
    throw error;
  }
};

export const removeCardFromDeck = async (userId, deckName, cardId) => {
  try {
    // Find the deck by userId and deckName
    const decksRef = collection(db, 'userDecks');
    const decksSnapshot = await getDocs(decksRef);
    const deckDoc = decksSnapshot.docs.find(doc => {
      const data = doc.data();
      return data.userId === userId && data.deckName === deckName;
    });
    
    if (deckDoc) {
      const currentCards = deckDoc.data().cards || [];
      const updatedCards = currentCards.filter(card => card.id !== cardId);
      
      await updateDoc(doc(db, 'userDecks', deckDoc.id), {
        cards: updatedCards,
        updatedAt: new Date().toISOString()
      });
    }
    
    return true;
  } catch (error) {
    console.error('Error removing card:', error);
    throw error;
  }
};
