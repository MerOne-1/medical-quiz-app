import { db, storage } from '../config/firebase';
import { collection, doc, setDoc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

// Create or update a personal deck
export const saveUserDeck = async (userId, deckName, cards) => {
  try {
    const deckRef = doc(db, 'userDecks', `${userId}_${deckName}`);
    await setDoc(deckRef, {
      userId,
      deckName,
      cards,
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
    const deckRef = doc(db, 'userDecks', `${userId}_${deckName}`);
    const deckDoc = await getDoc(deckRef);
    
    if (deckDoc.exists()) {
      const currentCards = deckDoc.data().cards || [];
      await updateDoc(deckRef, {
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
export const removeCardFromDeck = async (userId, deckName, cardId) => {
  try {
    const deckRef = doc(db, 'userDecks', `${userId}_${deckName}`);
    const deckDoc = await getDoc(deckRef);
    
    if (deckDoc.exists()) {
      const currentCards = deckDoc.data().cards || [];
      const updatedCards = currentCards.filter(card => card.id !== cardId);
      
      await updateDoc(deckRef, {
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
