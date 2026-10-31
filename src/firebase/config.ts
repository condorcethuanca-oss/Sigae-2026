import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfigJson from '../../firebase-applet-config.json';

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfigJson) : getApp();

// Auth instance con idioma español para correos y SMS institucionales
export const auth = getAuth(app);
auth.languageCode = 'es';

// Firestore instance using the provisioned database ID
const firestoreDatabaseId = firebaseConfigJson.firestoreDatabaseId || '(default)';
try {
  initializeFirestore(app, {
    experimentalForceLongPolling: true,
  }, firestoreDatabaseId);
} catch {
  // Instance already initialized
}
export const db = getFirestore(app, firestoreDatabaseId);

// Storage instance
const storageBucketUri = firebaseConfigJson.storageBucket
  ? (firebaseConfigJson.storageBucket.startsWith('gs://')
      ? firebaseConfigJson.storageBucket
      : `gs://${firebaseConfigJson.storageBucket}`)
  : undefined;
export const storage = getStorage(app, storageBucketUri);

// Connection test as required by Firebase skill
export async function testFirebaseConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'schools', '80730142'));
    console.log('[SIGAE Firebase] Conexión a Firestore exitosa.');
    return true;
  } catch (error: any) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('[SIGAE Firebase] El cliente está fuera de línea. Verifique la conexión.');
      return false;
    }
    // If permission-denied or document-not-found, connection to server is still alive
    return true;
  }
}

// Initial connection test
testFirebaseConnection();

export default app;
