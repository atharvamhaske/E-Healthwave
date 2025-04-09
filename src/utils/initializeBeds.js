import { db } from '../firebase';
import { collection, getDocs, addDoc } from 'firebase/firestore';

export const initializeBedData = async () => {
  try {
    // Check if bed data already exists
    const bedsRef = collection(db, 'beds');
    const snapshot = await getDocs(bedsRef);
    
    if (snapshot.empty) {
      // Initialize bed data
      const initialBedData = {
        General: { total: 100, available: 100 },
        'Semi-Private': { total: 50, available: 50 },
        Private: { total: 30, available: 30 },
        ICU: { total: 20, available: 20 }
      };
      
      await addDoc(bedsRef, initialBedData);
      console.log('Bed data initialized successfully');
    }
  } catch (err) {
    console.error('Error initializing bed data:', err);
  }
};

export default initializeBedData; 