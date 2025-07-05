import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../../components/Layout';
import Peer from 'peerjs';
import {
  addPeerSignal,
  listenForPeerSignals,
  clearPeerSignals,
  joinMeetingPresence,
  leaveMeetingPresence,
  listenToMeetingPresence,
  updateMeetingPresence,
} from '../../../lib/firestoreMeeting';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';

function sanitizePeerId(email: string) {
  return email.replace(/[^a-zA-Z0-9_-]/g, '-');
}

function getUniquePeerId(email: string) {
  // Add random string if duplicate error
  return sanitizePeerId(email) + '-' + Math.random().toString(36).slice(2, 8);
}

function debounce(fn: (...args: any[]) => void, delay: number) {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: any[]) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

// ---
// If you are running your own PeerJS server, increase the timeout to reduce disconnects:
// Example: peerjs --port 9000 --timeout 30000
// ---

const PEERJS_CONFIG =
  process.env.NODE_ENV === 'development'
    ? {
        host: 'localhost',
        port: 9000,
        path: '/peerjs',
        secure: false,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            // Add your TURN server for production reliability:
            // { urls: 'turn:your-turn-server.com', username: 'user', credential: 'pass' },
          ],
        },
      }
    : {
        host: 'peerjs.com',
        port: 443,
        path: '/',
        secure: true,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            // Add your TURN server for production reliability:
            // { urls: 'turn:your-turn-server.com', username: 'user', credential: 'pass' },
          ],
        },
      };

// Add a type for remote peer state
interface RemotePeer {
  peerId: string;
  stream: MediaStream | null;
  cameraOn: boolean;
  audioOn: boolean;
  reconnecting: boolean;
}

export default function MeetingCallPage() {
  const router = useRouter();
  const { id } = router.query;
  const { data: session } = useSession();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [remoteStreams, setRemoteStreams] = useState<MediaStream[]>([]);
  const [peer, setPeer] = useState<Peer | null>(null);
  const [myStream, setMyStream] = useState<MediaStream | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [connections, setConnections] = useState<any[]>([]);
  const [participants, setParticipants] = useState<any[]>([]);
  const [myPeerId, setMyPeerId] = useState<string | null>(null);
  const [disconnected, setDisconnected] = useState(false);
  const [remotePeers, setRemotePeers] = useState<RemotePeer[]>([]);
  const connectionsRef = useRef<{ [peerId: string]: any }>({});
  const remotePeersRef = useRef<{ [peerId: string]: RemotePeer }>({});
  const peerRef = useRef<Peer | null>(null);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [reconnectDelay, setReconnectDelay] = useState(3000);

  // Keep remotePeers state in sync with ref
  function syncRemotePeersState() {
    setRemotePeers(Object.values(remotePeersRef.current));
  }

  // Defensive cleanup for PeerJS connections
  function safeClose(conn: any) {
    try {
      if (conn && typeof conn.close === 'function') conn.close();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('Error closing connection:', e);
    }
  }

  // Defensive .on
  function safeOn(conn: any, event: string, handler: (...args: any[]) => void) {
    try {
      if (conn && typeof conn.on === 'function') conn.on(event, handler);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('Error adding event handler:', e);
    }
  }

  // Listen to presence changes in real-time
  useEffect(() => {
    if (!id || !session || !session.user || !session.user.email) return;
    let unsubPresence: (() => void) | null = null;
    let heartbeat: NodeJS.Timeout | null = null;
    const user = {
      userId: sanitizePeerId(session.user!.email!),
      name: session.user!.name || session.user!.email!,
      photoURL: session.user!.image || '',
    };
    joinMeetingPresence(id as string, user);
    unsubPresence = listenToMeetingPresence(id as string, (users) => {
      // Always include the local user
      const myId = sanitizePeerId(session.user!.email!);
      let present = users;
      if (!users.find((u) => u.userId === myId)) {
        present = [...users, user];
      }
      setParticipants(present);
      // eslint-disable-next-line no-console
      console.log(
        'Presence updated:',
        present.map((u) => u.userId),
      );
    });
    heartbeat = setInterval(() => {
      updateMeetingPresence(id as string, sanitizePeerId(session.user!.email!));
    }, 20000);
    return () => {
      leaveMeetingPresence(id as string, sanitizePeerId(session.user!.email!));
      if (unsubPresence) unsubPresence();
      if (heartbeat) clearInterval(heartbeat);
    };
  }, [id, session]);

  // PeerJS and connection logic with robust cleanup and exponential backoff reconnection
  useEffect(() => {
    if (!id || !session || !session.user || !session.user.email) return;
    let unsubSignals: (() => void) | null = null;
    let destroyed = false;
    let _myPeerId = sanitizePeerId(session.user!.email!);
    let triedRandom = false;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let currentReconnectDelay = reconnectDelay;

    function showDisconnect() {
      setDisconnected(true);
      toast.error('Lost connection to signaling server. Reconnecting...');
    }
    function hideDisconnect() {
      setDisconnected(false);
    }

    let isReconnecting = false;
    let pendingPeerClose: Promise<void> | null = null;

    function cleanupPeer(): Promise<void> {
      return new Promise((resolve) => {
        if (peerRef.current) {
          try {
            const p = peerRef.current;
            if (p.destroyed) {
              peerRef.current = null;
              setPeer(null);
              resolve();
              return;
            }
            p.on('close', () => {
              peerRef.current = null;
              setPeer(null);
              resolve();
            });
            p.destroy();
          } catch (e) {
            peerRef.current = null;
            setPeer(null);
            resolve();
          }
        } else {
          resolve();
        }
      });
    }

    async function createPeer(idToUse: string): Promise<Peer | null> {
      if (isReconnecting) return null;
      isReconnecting = true;
      if (pendingPeerClose) await pendingPeerClose;
      pendingPeerClose = cleanupPeer();
      await pendingPeerClose;
      const p = new Peer(idToUse, PEERJS_CONFIG);
      peerRef.current = p;
      setPeer(p);
      // --- Verbose PeerJS event logging for debugging ---
      p.on('open', (id) => {
        // eslint-disable-next-line no-console
        console.log('[PeerJS] open:', id);
        isReconnecting = false;
        hideDisconnect(); // Only hide the reconnecting message after successful connection
      });
      p.on('disconnected', () => {
        // eslint-disable-next-line no-console
        console.log('[PeerJS] disconnected');
        showDisconnect();
        // Exponential backoff for reconnection
        if (!destroyed && !reconnectTimeout) {
          reconnectTimeout = setTimeout(() => {
            createPeer(_myPeerId);
            // hideDisconnect(); // Do NOT hide here, only hide on successful open
            setReconnectAttempt((a) => a + 1);
            setReconnectDelay((d) => Math.min(d * 2, 30000));
          }, currentReconnectDelay);
        }
      });
      p.on('close', () => {
        // eslint-disable-next-line no-console
        console.log('[PeerJS] close');
        isReconnecting = false;
      });
      p.on('error', (err) => {
        // eslint-disable-next-line no-console
        console.error('[PeerJS] error:', err);
        if (err.type === 'unavailable-id' && !triedRandom) {
          // Try with random string
          triedRandom = true;
          _myPeerId = getUniquePeerId(session?.user?.email || '');
          setMyPeerId(_myPeerId);
          createPeer(_myPeerId);
        } else {
          showDisconnect();
          // Exponential backoff for reconnection
          if (!destroyed && !reconnectTimeout) {
            reconnectTimeout = setTimeout(() => {
              createPeer(_myPeerId);
              // hideDisconnect(); // Do NOT hide here, only hide on successful open
              setReconnectAttempt((a) => a + 1);
              setReconnectDelay((d) => Math.min(d * 2, 30000)); // max 30s
            }, currentReconnectDelay);
          }
        }
      });
      // --- End verbose logging ---
      return p;
    }

    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
      if (destroyed) return;
      setMyStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      createPeer(_myPeerId).then((peerInstance) => {
        if (!peerInstance) return;
        peerRef.current = peerInstance;
        setPeer(peerInstance);
        setMyPeerId(_myPeerId);

        // Listen for new peer signals in Firestore
        unsubSignals = listenForPeerSignals(id as string, async (signal) => {
          if (signal.from === sanitizePeerId(session.user!.email!)) return;
          if (signal.type === 'peer-id') {
            // eslint-disable-next-line no-console
            console.log('Received peer-id signal:', signal.data.peerId);
            // No need to call here, rely on participants effect
          }
        });

        // Announce self to others
        addPeerSignal(id as string, {
          from: sanitizePeerId(session.user!.email!),
          type: 'peer-id',
          data: { peerId: _myPeerId },
        });
      });
    });
    return () => {
      destroyed = true;
      if (unsubSignals) unsubSignals();
      cleanupPeer();
      myStream?.getTracks().forEach((t) => t.stop());
      clearPeerSignals(id as string);
      Object.values(connectionsRef.current).forEach((conn) => safeClose(conn));
      Object.keys(connectionsRef.current).forEach((k) => delete connectionsRef.current[k]);
      Object.keys(remotePeersRef.current).forEach((k) => delete remotePeersRef.current[k]);
      leaveMeetingPresence(
        id as string,
        session && session.user ? sanitizePeerId(session.user!.email!) : '',
      );
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, session, reconnectAttempt, reconnectDelay]);

  // Helper to update remote peer state
  function updateRemotePeer(peerId: string, update: Partial<RemotePeer>) {
    setRemotePeers((prev) => {
      const idx = prev.findIndex((p) => p.peerId === peerId);
      if (idx === -1) return prev;
      const updated = { ...prev[idx], ...update };
      return [...prev.slice(0, idx), updated, ...prev.slice(idx + 1)];
    });
  }

  // Helper to remove remote peer
  function removeRemotePeer(peerId: string) {
    setRemotePeers((prev) => prev.filter((p) => p.peerId !== peerId));
  }

  // Helper to add remote peer if not present
  function ensureRemotePeer(peerId: string) {
    setRemotePeers((prev) => {
      if (prev.find((p) => p.peerId === peerId)) return prev;
      return [
        ...prev,
        { peerId, stream: null, cameraOn: true, audioOn: true, reconnecting: false },
      ];
    });
  }

  // Real-time: connect to all present peers, clean up on leave
  useEffect(() => {
    if (!id || !session || !session.user || !session.user.email || !peer) return;
    const myId = sanitizePeerId(session.user.email!);
    // Connect to all present peers
    participants.forEach((p) => {
      if (p.userId === myId) return;
      // If not already connected, call
      if (!connectionsRef.current[p.userId]) {
        if (myStream) {
          const call = peer.call(p.userId, myStream);
          connectionsRef.current[p.userId] = call;
          if (!remotePeersRef.current[p.userId]) {
            remotePeersRef.current[p.userId] = {
              peerId: p.userId,
              stream: null,
              cameraOn: true,
              audioOn: true,
              reconnecting: false,
            };
          }
          safeOn(call, 'stream', (remoteStream) => {
            remotePeersRef.current[p.userId].stream = remoteStream;
            remotePeersRef.current[p.userId].reconnecting = false;
            syncRemotePeersState();
          });
          safeOn(call, 'close', () => {
            remotePeersRef.current[p.userId].stream = null;
            remotePeersRef.current[p.userId].reconnecting = true;
            syncRemotePeersState();
          });
          safeOn(call, 'error', (err) => {
            remotePeersRef.current[p.userId].stream = null;
            remotePeersRef.current[p.userId].reconnecting = true;
            syncRemotePeersState();
            // eslint-disable-next-line no-console
            console.error('PeerJS call error:', err);
          });
        }
      }
    });
    // Remove peers who left
    Object.keys(remotePeersRef.current).forEach((peerId) => {
      if (!participants.find((p) => p.userId === peerId)) {
        delete remotePeersRef.current[peerId];
        if (connectionsRef.current[peerId]) {
          safeClose(connectionsRef.current[peerId]);
          delete connectionsRef.current[peerId];
        }
      }
    });
    syncRemotePeersState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participants, peer, myStream]);

  // Listen for incoming calls and update remote peer state
  useEffect(() => {
    if (!peer) return;
    const myId = session && session.user ? sanitizePeerId(session.user.email!) : '';
    peer.on('call', (call) => {
      if (call.peer === myId) return;
      call.answer(myStream!);
      connectionsRef.current[call.peer] = call;
      if (!remotePeersRef.current[call.peer]) {
        remotePeersRef.current[call.peer] = {
          peerId: call.peer,
          stream: null,
          cameraOn: true,
          audioOn: true,
          reconnecting: false,
        };
      }
      safeOn(call, 'stream', (remoteStream) => {
        remotePeersRef.current[call.peer].stream = remoteStream;
        remotePeersRef.current[call.peer].reconnecting = false;
        syncRemotePeersState();
      });
      safeOn(call, 'close', () => {
        remotePeersRef.current[call.peer].stream = null;
        remotePeersRef.current[call.peer].reconnecting = true;
        syncRemotePeersState();
      });
      safeOn(call, 'error', (err) => {
        remotePeersRef.current[call.peer].stream = null;
        remotePeersRef.current[call.peer].reconnecting = true;
        syncRemotePeersState();
        // eslint-disable-next-line no-console
        console.error('PeerJS call error:', err);
      });
      syncRemotePeersState();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peer, myStream]);

  const toggleAudio = () => {
    if (!myStream) return;
    myStream.getAudioTracks().forEach((track) => {
      track.enabled = !audioEnabled;
    });
    setAudioEnabled((a) => !a);
  };

  const toggleVideo = () => {
    if (!myStream) return;
    myStream.getVideoTracks().forEach((track) => {
      track.enabled = !videoEnabled;
    });
    setVideoEnabled((v) => !v);
  };

  const leaveCall = () => {
    peer?.destroy();
    myStream?.getTracks().forEach((t) => t.stop());
    clearPeerSignals(id as string);
    Object.values(connectionsRef.current).forEach((conn) => safeClose(conn));
    leaveMeetingPresence(
      id as string,
      session && session.user ? sanitizePeerId(session.user!.email!) : '',
    );
    router.replace(`/meetings/${id}`);
  };

  // UI: show placeholder for camera-off, show reconnecting
  function renderRemoteVideo(rp: RemotePeer, idx: number) {
    return (
      <div
        key={rp.peerId}
        className="flex flex-col items-center overflow-hidden rounded-lg bg-black"
      >
        {rp.stream && rp.cameraOn ? (
          <video
            ref={(el) => {
              if (el) el.srcObject = rp.stream;
            }}
            autoPlay
            playsInline
            className="h-48 w-72 object-cover"
          />
        ) : (
          <div className="flex h-48 w-72 items-center justify-center bg-gray-800 text-xl text-white">
            {rp.reconnecting ? 'Reconnecting...' : 'Camera Off'}
          </div>
        )}
        <div className="rounded-b bg-gray-800 px-2 py-1 text-center text-white">
          Participant {idx + 1}
        </div>
      </div>
    );
  }

  return (
    <Layout>
      <div className="flex min-h-screen flex-row bg-gray-100 py-8">
        {/* Sidebar: Participants */}
        <aside className="mr-8 flex w-64 flex-col rounded-xl bg-white p-4 shadow-xl">
          <h2 className="mb-4 text-lg font-bold">Participants</h2>
          <ul className="space-y-3">
            {participants.map((p) => (
              <li key={p.userId} className="flex items-center gap-3">
                <img
                  src={p.photoURL || '/favicon.ico'}
                  alt={p.name}
                  className="h-8 w-8 rounded-full border object-cover"
                />
                <span className="font-medium">{p.name}</span>
                {p.userId ===
                  sanitizePeerId(
                    session && session.user && session.user.email ? session.user.email : '',
                  ) && <span className="ml-2 text-xs text-blue-500">(You)</span>}
              </li>
            ))}
          </ul>
          {disconnected && (
            <div className="mt-4 text-sm font-semibold text-red-600">
              Disconnected from server. Reconnecting...
            </div>
          )}
        </aside>
        {/* Main: Video grid and controls */}
        <div className="flex flex-1 flex-col items-center">
          <h1 className="mb-4 text-2xl font-bold">Meeting Call</h1>
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex flex-col items-center overflow-hidden rounded-lg bg-black">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="h-48 w-72 object-cover"
              />
              <div className="rounded-b bg-gray-800 px-2 py-1 text-center text-white">You</div>
            </div>
            {remotePeers.map(renderRemoteVideo)}
          </div>
          <div className="mb-4 flex gap-4">
            <button
              onClick={toggleAudio}
              className="rounded bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
            >
              {audioEnabled ? 'Mute' : 'Unmute'}
            </button>
            <button
              onClick={toggleVideo}
              className="rounded bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
            >
              {videoEnabled ? 'Camera Off' : 'Camera On'}
            </button>
            <button
              onClick={leaveCall}
              className="rounded bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700"
            >
              Leave Call
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
