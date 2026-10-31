import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const auth = getAuth(app);
const db = getFirestore(app, config.firestoreDatabaseId || '(default)');

async function auditCollections() {
  console.log('Autenticando con credenciales de Dirección para auditar Firestore...');
  await signInWithEmailAndPassword(auth, 'director@sigae.edu.bo', 'Sigae2026!');

  const collectionsToAudit = [
    'users',
    'teachers',
    'students',
    'parentStudentLinks',
    'schedules',
    'attendance_sessions',
    'grades',
    'messages',
    'calendar_events',
    'notifications',
    'kardex_records',
    'schools',
    'access_requests',
    'familyLinkInvitations'
  ];

  console.log('\n--- AUDITORÍA DE COLECCIONES EN FIRESTORE ---');
  for (const colName of collectionsToAudit) {
    try {
      const snap = await getDocs(collection(db, colName));
      console.log(`Colección /${colName}: ${snap.size} documentos`);
      if (colName === 'schedules') {
        const sampleDocs: any[] = [];
        snap.forEach(d => {
          if (sampleDocs.length < 5) sampleDocs.push({ id: d.id, ...d.data() });
        });
        console.log('  Muestra de /schedules:', JSON.stringify(sampleDocs, null, 2));
      }
      if (colName === 'messages') {
        const sampleDocs: any[] = [];
        snap.forEach(d => {
          if (sampleDocs.length < 3) sampleDocs.push({ id: d.id, ...d.data() });
        });
        console.log('  Muestra de /messages:', JSON.stringify(sampleDocs, null, 2));
      }
    } catch (err: any) {
      console.log(`Colección /${colName}: Error o no accesible (${err.message})`);
    }
  }

  process.exit(0);
}

auditCollections().catch(err => {
  console.error('Error durante la auditoría:', err);
  process.exit(1);
});
