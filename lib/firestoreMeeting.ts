import { db } from './firebase';
import { collection, doc, getDoc, getDocs, setDoc, query, where, Timestamp, addDoc, onSnapshot, deleteDoc, serverTimestamp, updateDoc } from 'firebase/firestore';

export interface Meeting {
    id: string;
    hostId: string;
    title: string;
    startTime: Timestamp;
    duration: number;
    isActive: boolean;
    participants: string[];
    chat: Array<{ userId: string; message: string; sentAt: Timestamp }>;
}

export async function createMeeting(meeting: Omit<Meeting, 'id' | 'chat'>) {
    const ref = doc(collection(db, 'meetings'));
    const newMeeting: Meeting = {
        ...meeting,
        id: ref.id,
        chat: [],
    };
    await setDoc(ref, newMeeting);
    return newMeeting;
}

export async function getMeetingsForUser(userId: string) {
    const q = query(collection(db, 'meetings'), where('hostId', '==', userId));
    const snap = await getDocs(q);
    return snap.docs.map(doc => doc.data() as Meeting);
}

export async function getMeetingById(id: string) {
    const ref = doc(db, 'meetings', id);
    const snap = await getDoc(ref);
    return snap.exists() ? (snap.data() as Meeting) : null;
}

// --- WebRTC Signaling helpers ---

// Add a signal (offer/answer/candidate) to Firestore for a meeting
export async function addPeerSignal(meetingId: string, signal: { from: string; type: string; data: any }) {
    const signalsRef = collection(db, 'meetings', meetingId, 'signals');
    await addDoc(signalsRef, {
        ...signal,
        timestamp: Timestamp.now(),
    });
}

// Listen for new signals for a meeting
export function listenForPeerSignals(meetingId: string, onSignal: (signal: any) => void) {
    const signalsRef = collection(db, 'meetings', meetingId, 'signals');
    return onSnapshot(signalsRef, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
                onSignal({ id: change.doc.id, ...change.doc.data() });
            }
        });
    });
}

// Clear all signals for a meeting (call after processing to avoid buildup)
export async function clearPeerSignals(meetingId: string) {
    const signalsRef = collection(db, 'meetings', meetingId, 'signals');
    const snap = await getDocs(signalsRef);
    const deletions = snap.docs.map((docu) => deleteDoc(docu.ref));
    await Promise.all(deletions);
}

// --- Presence helpers ---

// Mark user as present in a meeting
export async function joinMeetingPresence(meetingId: string, user: { userId: string; name: string; photoURL: string }) {
    const ref = doc(db, 'meetings', meetingId, 'presence', user.userId);
    await setDoc(ref, {
        ...user,
        joinedAt: serverTimestamp(),
        lastActiveAt: serverTimestamp(),
    }, { merge: true });
}

// Mark user as left (remove from presence)
export async function leaveMeetingPresence(meetingId: string, userId: string) {
    const ref = doc(db, 'meetings', meetingId, 'presence', userId);
    await deleteDoc(ref);
}

// Update last active timestamp (heartbeat)
export async function updateMeetingPresence(meetingId: string, userId: string) {
    const ref = doc(db, 'meetings', meetingId, 'presence', userId);
    await setDoc(ref, { lastActiveAt: serverTimestamp() }, { merge: true });
}

// Listen to presence changes in a meeting
export function listenToMeetingPresence(meetingId: string, onChange: (users: any[]) => void) {
    const presenceRef = collection(db, 'meetings', meetingId, 'presence');
    return onSnapshot(presenceRef, (snapshot) => {
        const users = snapshot.docs.map(doc => doc.data());
        onChange(users);
    });
} 