import React, { useState, useEffect, useRef } from 'react';
import { db, doc, getDoc, collection, query, where, onSnapshot, updateDoc, arrayUnion, addDoc } from '../firebase';
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
        localStream.getTracks().forEach(track => track.stop());
      }
      Object.values(peerConnections.current).forEach(pc => pc.close());
    };
  }, []);

  const setupLocalStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30, max: 60 },
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          sampleSize: 16,
        }
      });
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      setIsReady(true);
    } catch (error) {
      console.error("Error accessing media devices:", error);
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
        participants: arrayUnion(auth.currentUser.uid)
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
            recipientId: participantId
          });
        }
      };

      pc.ontrack = (event) => {
        console.log('Received track:', event.track.kind, 'from', participantId);
        setRemoteStreams(prev => {
          const updatedStreams = { ...prev };
          if (!updatedStreams[participantId]) {
            updatedStreams[participantId] = new MediaStream();
          }
          updatedStreams[participantId].addTrack(event.track);
          return updatedStreams;
        });
      };

      localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

      if (isInitiator) {
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true,
        });
        await pc.setLocalDescription(offer);
        await addDoc(collection(db, 'rooms', roomId, 'offers'), {
          offer: { type: offer.type, sdp: offer.sdp },
          participantId: auth.currentUser.uid,
          recipientId: participantId
        });
      }

      peerConnections.current[participantId] = pc;

      onSnapshot(
        query(collection(db, 'rooms', roomId, 'offers'), where('recipientId', '==', auth.currentUser.uid)),
        async (snapshot) => {
          snapshot.docChanges().forEach(async (change) => {
            if (change.type === 'added') {
              const data = change.doc.data();
              const pc = peerConnections.current[data.participantId];
              if (pc && pc.signalingState === 'stable') {
                await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                await addDoc(collection(db, 'rooms', roomId, 'answers'), {
                  answer: { type: answer.type, sdp: answer.sdp },
                  participantId: auth.currentUser.uid,
                  recipientId: data.participantId
                });
              }
            }
          });
        }
      );

      onSnapshot(
        query(collection(db, 'rooms', roomId, 'answers'), where('recipientId', '==', auth.currentUser.uid)),
        (snapshot) => {
          snapshot.docChanges().forEach(async (change) => {
            if (change.type === 'added') {
              const data = change.doc.data();
              const pc = peerConnections.current[data.participantId];
              if (pc && pc.signalingState === 'have-local-offer') {
                await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
              }
            }
          });
        }
      );

      onSnapshot(
        query(collection(db, 'rooms', roomId, 'candidates'), where('recipientId', '==', auth.currentUser.uid)),
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
      console.error("Error creating peer connection:", error);
    }
  };

  const handleDisconnect = () => {
    setRoomStarted(false);
    setIsCreator(false);
    setRoomId('');
    Object.values(peerConnections.current).forEach(pc => pc.close());
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
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
      localStream.getVideoTracks().forEach(track => track.enabled = !track.enabled);
      setCameraOn(!cameraOn);
    }
  };

  const toggleAudio = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => track.enabled = !track.enabled);
      setAudioOn(!audioOn);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-4 bg-gray-900 text-white">
      <div className="flex-1 bg-gray-800 rounded-lg overflow-y-auto p-4">
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-64 md:h-80 lg:h-96 object-cover rounded-lg mb-4"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(remoteStreams).map(([id, stream]) => (
            <div key={id} className="relative bg-gray-800 rounded-lg overflow-hidden border border-gray-700 shadow-lg">
              <video
                autoPlay
                playsInline
                ref={(ref) => ref && (ref.srcObject = stream)}
                className="w-full h-64 md:h-80 lg:h-96 object-cover"
              />
              <span className="absolute bottom-2 left-2 bg-gray-900 bg-opacity-75 backdrop-blur-lg shadow-md border border-gray-700 text-white px-2 py-1 rounded-md text-sm">
                {id}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap justify-center gap-4">
          {!roomStarted ? (
            <>
              <button
                onClick={createRoom}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-200 shadow-lg border border-blue-700"
              >
                Start Room
              </button>
              <input
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                placeholder="Enter Room ID"
                className="bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 shadow-lg"
              />
              <button
                onClick={handleJoinRoom}
                className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-200 shadow-lg border border-green-700"
              >
                Join Room
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleCopyRoomId}
                className="bg-yellow-600 hover:bg-yellow-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-200 shadow-lg border border-yellow-700"
              >
                Copy Room ID
              </button>
              <button
                onClick={toggleCamera}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-200 shadow-lg border border-indigo-700"
              >
                {cameraOn ? 'Turn Off Camera' : 'Turn On Camera'}
              </button>
              <button
                onClick={toggleAudio}
                className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-200 shadow-lg border border-purple-700"
              >
                {audioOn ? 'Mute Audio' : 'Unmute Audio'}
              </button>
              <button
                onClick={handleDisconnect}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-200 shadow-lg border border-red-700"
              >
                Disconnect
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default CallsComponent;
