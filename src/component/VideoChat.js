// VideoChat.js
import React, { useEffect, useRef, useState } from 'react';
import Peer from 'simple-peer';
import { db } from '../firebase';
import { collection, addDoc, deleteDoc, doc, onSnapshot, query, where } from 'firebase/firestore';

function VideoChat({ user }) {
  const [peer, setPeer] = useState(null);
  const [stream, setStream] = useState(null);
  const [remotePeerID, setRemotePeerID] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const localVideoRef = useRef();
  const remoteVideoRef = useRef();

  useEffect(() => {
    // Get user's video and audio
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then((currentStream) => {
        setStream(currentStream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = currentStream;
        }
      })
      .catch((err) => {
        console.error('Failed to get local stream', err);
      });

    // Register the user in Firestore
    const registerUser = async () => {
      try {
        await addDoc(collection(db, 'videoChatUsers'), {
          userId: user.uid,
          timestamp: new Date(),
        });
        console.log('User registered');
      } catch (error) {
        console.error('Error registering user:', error);
      }
    };

    registerUser();

    return () => {
      // Unregister the user on cleanup
      const unregisterUser = async () => {
        try {
          const q = query(collection(db, 'videoChatUsers'), where('userId', '==', user.uid));
          const snapshot = await q.get();
          snapshot.forEach((doc) => {
            deleteDoc(doc.ref);
          });
          console.log('User unregistered');
        } catch (error) {
          console.error('Error unregistering user:', error);
        }
      };

      unregisterUser();

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (peer) {
        peer.destroy();
      }
    };
  }, [user.uid]);

  useEffect(() => {
    if (peer) {
      peer.on('stream', (remoteStream) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
        }
      });

      peer.on('error', (err) => {
        console.error('Peer connection error:', err);
      });

      peer.on('close', () => {
        setPeer(null);
      });

      return () => {
        peer.destroy();
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = null;
        }
      };
    }
  }, [peer]);

  const createPeer = (initiator, signalData = null) => {
    const newPeer = new Peer({
      initiator,
      trickle: false,
      stream,
    });

    newPeer.on('signal', async (data) => {
      await sendSignal(data);
    });

    if (signalData) {
      newPeer.signal(signalData);
    }

    newPeer.on('error', (err) => {
      console.error('Peer connection error:', err);
    });

    setPeer(newPeer);
  };

  const sendSignal = async (signal) => {
    try {
      await addDoc(collection(db, 'videoChatSignals'), {
        userId: user.uid,
        signal: JSON.stringify(signal),
        createdAt: new Date(),
      });
    } catch (error) {
      console.error('Error sending signal:', error);
    }
  };

  const connectToRandomPeer = async () => {
    setConnecting(true);

    const q = query(collection(db, 'videoChatSignals'), where('userId', '!=', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          if (data && data.signal && data.userId !== user.uid) {
            setRemotePeerID(data.userId);
            try {
              const signal = JSON.parse(data.signal);
              createPeer(false, signal);

              // Delete the signal after using it to avoid reconnection issues
              deleteDoc(doc(db, 'videoChatSignals', change.doc.id));
            } catch (error) {
              console.error('Error parsing signal:', error);
            }
          }
        }
      });
    });

    createPeer(true);

    return () => {
      unsubscribe();
      if (peer) {
        peer.destroy();
      }
    };
  };

  const handleDisconnect = async () => {
    if (peer) {
      peer.destroy();
    }
    setRemotePeerID(null);
    setConnecting(false);

    try {
      const q = query(collection(db, 'videoChatSignals'), where('userId', '==', user.uid));
      const snapshot = await q.get();
      snapshot.forEach((doc) => {
        deleteDoc(doc.ref);
      });
    } catch (error) {
      console.error('Error deleting signals:', error);
    }
  };

  return (
    <div className="relative w-screen h-screen bg-black flex items-center justify-center">
      <div className="relative w-full h-full flex items-center justify-center">
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="absolute inset-0 object-cover"
          style={{ zIndex: 1 }}
        />
        <video
          ref={localVideoRef}
          autoPlay
          muted
          playsInline
          className="absolute bottom-4 right-4 w-32 h-24 border-2 border-white rounded-lg object-cover"
          style={{ zIndex: 2 }}
        />
      </div>
      <div className="absolute bottom-4 left-4 flex flex-col items-start space-y-2">
        {!remotePeerID && !connecting && (
          <button
            onClick={connectToRandomPeer}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Connect to Random User
          </button>
        )}
        {connecting && <p className="text-white">Connecting...</p>}
        {remotePeerID && (
          <button
            onClick={handleDisconnect}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
          >
            Disconnect
          </button>
        )}
      </div>
    </div>
  );
}

export default VideoChat;
