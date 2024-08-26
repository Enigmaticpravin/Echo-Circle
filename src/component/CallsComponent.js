import React, { useState, useEffect, useRef } from 'react';
import {
  db,
  doc,
  getDoc,
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  arrayUnion,
  addDoc,
} from '../firebase';
import { getAuth } from 'firebase/auth';

function CallsComponent() {
  const [roomId, setRoomId] = useState('');
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [isReady, setIsReady] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);
  const [audioOn, setAudioOn] = useState(true);
  const [roomStarted, setRoomStarted] = useState(false);
  const [isCreator, setIsCreator] = useState(false);
  const localVideoRef = useRef(null);
  const peerConnections = useRef({});
  const auth = getAuth();

  useEffect(() => {
    setupLocalStream();
    return () => {
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
      Object.values(peerConnections.current).forEach((pc) => pc.close());
    };
  }, []);

  const setupLocalStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30, max: 60 },
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          sampleSize: 16,
        },
      });
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      setIsReady(true);
    } catch (error) {
      console.error('Error accessing media devices:', error);
      setIsReady(false);
    }
  };

  const createRoom = async () => {
    const roomRef = await addDoc(collection(db, 'rooms'), { participants: [] });
    setRoomId(roomRef.id);
    setRoomStarted(true);
    setIsCreator(true);
    await joinRoom(roomRef.id);
  };

  const joinRoom = async (id) => {
    setRoomId(id);
    const roomRef = doc(db, 'rooms', id);
    const roomSnapshot = await getDoc(roomRef);

    if (roomSnapshot.exists()) {
      const room = roomSnapshot.data();
      if (room.participants) {
        for (const participantId of room.participants) {
          if (participantId !== auth.currentUser.uid) {
            await createPeerConnection(participantId, true, id);
          }
        }
      }
      await updateDoc(roomRef, {
        participants: arrayUnion(auth.currentUser.uid),
      });
    }

    onSnapshot(roomRef, (snapshot) => {
      const data = snapshot.data();
      if (data && data.participants) {
        data.participants.forEach(async (participantId) => {
          if (
            participantId !== auth.currentUser.uid &&
            !peerConnections.current[participantId]
          ) {
            await createPeerConnection(participantId, false, id);
          }
        });
      }
    });
  };

  const createPeerConnection = async (participantId, isInitiator, roomId) => {
    try {
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          { urls: 'stun:stun3.l.google.com:19302' },
          { urls: 'stun:stun4.l.google.com:19302' },
        ],
        iceCandidatePoolSize: 10,
      });

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          addDoc(collection(db, 'rooms', roomId, 'candidates'), {
            candidate: event.candidate.toJSON(),
            participantId: auth.currentUser.uid,
            recipientId: participantId,
          });
        }
      };

      pc.ontrack = (event) => {
        console.log('Received track:', event.track.kind, 'from', participantId);
        setRemoteStreams((prev) => {
          const updatedStreams = { ...prev };
          if (!updatedStreams[participantId]) {
            updatedStreams[participantId] = new MediaStream();
          }
          updatedStreams[participantId].addTrack(event.track);
          return updatedStreams;
        });
      };

      if (localStream) {
        localStream.getTracks().forEach((track) => {
          pc.addTrack(track, localStream);
        });
      } else {
        console.error('Local stream is not set');
      }

      peerConnections.current[participantId] = pc;

      if (isInitiator) {
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true,
        });
        await pc.setLocalDescription(offer);
        await addDoc(collection(db, 'rooms', roomId, 'offers'), {
          offer: { type: offer.type, sdp: offer.sdp },
          participantId: auth.currentUser.uid,
          recipientId: participantId,
        });
      }

      onSnapshot(
        query(
          collection(db, 'rooms', roomId, 'offers'),
          where('recipientId', '==', auth.currentUser.uid)
        ),
        async (snapshot) => {
          snapshot.docChanges().forEach(async (change) => {
            if (change.type === 'added') {
              const data = change.doc.data();
              const pc = peerConnections.current[data.participantId];
              if (pc.signalingState === 'stable') {
                return; // Avoid setting local description again in stable state
              }
              if (pc) {
                await pc.setRemoteDescription(
                  new RTCSessionDescription(data.offer)
                );
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                await addDoc(collection(db, 'rooms', roomId, 'answers'), {
                  answer: { type: answer.type, sdp: answer.sdp },
                  participantId: auth.currentUser.uid,
                  recipientId: data.participantId,
                });
              }
            }
          });
        }
      );

      onSnapshot(
        query(
          collection(db, 'rooms', roomId, 'answers'),
          where('recipientId', '==', auth.currentUser.uid)
        ),
        async (snapshot) => {
          snapshot.docChanges().forEach(async (change) => {
            if (change.type === 'added') {
              const data = change.doc.data();
              const pc = peerConnections.current[data.participantId];
              if (pc && pc.signalingState === 'have-local-offer') {
                await pc.setRemoteDescription(
                  new RTCSessionDescription(data.answer)
                );
              }
            }
          });
        }
      );

      onSnapshot(
        query(
          collection(db, 'rooms', roomId, 'candidates'),
          where('recipientId', '==', auth.currentUser.uid)
        ),
        (snapshot) => {
          snapshot.docChanges().forEach(async (change) => {
            if (change.type === 'added') {
              const data = change.doc.data();
              const pc = peerConnections.current[data.participantId];
              if (pc && pc.remoteDescription) {
                await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
              }
            }
          });
        }
      );
    } catch (error) {
      console.error('Error creating peer connection:', error);
    }
  };

  const handleDisconnect = () => {
    setRoomStarted(false);
    setIsCreator(false);
    setRoomId('');
    Object.values(peerConnections.current).forEach((pc) => pc.close());
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }
  };

  const handleCopyRoomId = () => {
    navigator.clipboard.writeText(roomId);
  };

  const handleJoinRoom = async () => {
    if (roomId) {
      await joinRoom(roomId);
      setRoomStarted(true);
    }
  };

  const toggleCamera = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach((track) => (track.enabled = !track.enabled));
      setCameraOn(!cameraOn);
    }
  };

  const toggleAudio = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => (track.enabled = !track.enabled));
      setAudioOn(!audioOn);
    }
  };

  return (
    <div className="h-screen bg-gray-800 p-4">
      <div className="container mx-auto">
        <h2 className="text-2xl text-white mb-6">Video Call Interface</h2>

        {!roomStarted && (
          <div className="mb-6">
            <input
              type="text"
              placeholder="Enter Room ID"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="p-2 rounded-md bg-gray-700 text-white mr-4"
            />
            <button
              onClick={createRoom}
              className="bg-blue-600 text-white p-2 rounded-md mr-4"
            >
              Create Room
            </button>
            <button
              onClick={handleJoinRoom}
              className="bg-green-600 text-white p-2 rounded-md"
            >
              Join Room
            </button>
          </div>
        )}

        {roomStarted && (
          <>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl text-white">Room ID: {roomId}</h3>
              <button
                onClick={handleCopyRoomId}
                className="bg-yellow-500 text-black p-2 rounded-md"
              >
                Copy Room ID
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-black rounded-lg overflow-hidden shadow-lg relative">
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  className="w-full h-full object-cover"
                ></video>
                <div className="absolute bottom-2 left-2 text-white text-sm">
                  You
                </div>
              </div>
              {Object.keys(remoteStreams).map((participantId) => (
                <div
                  key={participantId}
                  className="bg-black rounded-lg overflow-hidden shadow-lg relative"
                >
                  <video
                    ref={(ref) => {
                      if (ref) {
                        ref.srcObject = remoteStreams[participantId];
                      }
                    }}
                    autoPlay
                    className="w-full h-full object-cover"
                  ></video>
                  <div className="absolute bottom-2 left-2 text-white text-sm">
                    Participant: {participantId}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-center space-x-4">
              <button
                onClick={toggleCamera}
                className={`p-2 rounded-full ${
                  cameraOn ? 'bg-green-600' : 'bg-red-600'
                }`}
              >
                {cameraOn ? 'Camera On' : 'Camera Off'}
              </button>
              <button
                onClick={toggleAudio}
                className={`p-2 rounded-full ${
                  audioOn ? 'bg-green-600' : 'bg-red-600'
                }`}
              >
                {audioOn ? 'Audio On' : 'Audio Off'}
              </button>
              <button
                onClick={handleDisconnect}
                className="bg-red-600 text-white p-2 rounded-md"
              >
                Disconnect
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default CallsComponent;
