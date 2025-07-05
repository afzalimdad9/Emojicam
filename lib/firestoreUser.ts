import { db } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export async function getUserProfile(uid: string) {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
}

export async function setUserProfile(
  uid: string,
  data: { name: string; photoURL?: string; timeZone?: string },
) {
  const ref = doc(db, 'users', uid);
  await setDoc(ref, data, { merge: true });
}
