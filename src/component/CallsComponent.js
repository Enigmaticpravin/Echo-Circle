import React, { useState, useEffect, useRef } from 'react';
import { db, doc, getDoc, collection, query, where, onSnapshot, updateDoc, arrayUnion, addDoc } from '../firebase';
import { getAuth } from 'firebase/auth';

function CallsComponent() {
  const [roomId, setRoomId] = useState('');
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState([]);
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
        setRemoteStreams(prev => {
          if (!prev.find(stream => stream.id === event.streams[0].id)) {
            return [...prev, event.streams[0]];
          }
          return prev;
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
    <div className="flex-1 flex flex-col p-4">
      <div className="flex-1 bg-gray-800 rounded-lg overflow-y-auto p-4 bg-opacity-50 backdrop-blur-lg shadow-2xl border border-gray-700 border-opacity-50">
        <h2 className="text-2xl font-semibold text-white mb-6">Professional Group Video Call</h2>

        <div className="grid grid-cols-2 gap-4">
          <div className="relative">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-auto rounded-lg shadow-lg scale-x-[-1]"
              style={{ objectFit: 'cover' }}
            />
            <span className="absolute bottom-2 left-2 bg-gray-900 bg-opacity-75 backdrop-blur-lg shadow-2xl border border-gray-700 border-opacity-50 text-white px-2 py-1 rounded-md text-sm">
              You
            </span>
          </div>
          {remoteStreams.map((stream, index) => (
            <div key={stream.id} className="relative">
              <video
                autoPlay
                playsInline
                ref={(video) => {
                  if (video) video.srcObject = stream;
                }}
                className="w-full h-auto rounded-lg shadow-lg scale-x-[-1]"
                style={{ objectFit: 'cover' }}
              />
              <span className="absolute bottom-2 left-2 bg-gray-900 bg-opacity-75 text-white px-2 py-1 rounded-md text-sm">
                Participant {index + 1}
              </span>
            </div>
          ))}
        </div>
        {!roomStarted && (
          <div className="flex space-x-4 mb-6 mt-10">
            {!isCreator && (
              <>
                <input
                  type="text"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  placeholder="Enter Room ID"
                  className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
                />
                <button
                  onClick={handleJoinRoom}
                  disabled={!roomId}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Join Room
                </button>
              </>
            )}
            {!isCreator && (
              <button
                onClick={createRoom}
                disabled={!isReady}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Room
              </button>
            )}
          </div>
        )}

        {roomStarted && (
         <div className="flex justify-center mb-4 w-full mt-10">
           <div className="flex items-center space-x-4">
             <button
               onClick={handleCopyRoomId}
               className="px-4 py-2 bg-white bg-opacity-30 backdrop-blur-md border border-gray-300 rounded-lg text-white flex items-center space-x-2 hover:bg-opacity-40 transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-opacity-50"
             >
               <i className="fas fa-copy"></i>
               <span>Copy Room ID</span>
             </button>
             <button
               onClick={handleDisconnect}
               className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
             >
               Disconnect
             </button>
             <button
               onClick={toggleCamera}
               className={`px-4 py-2 ${cameraOn ? 'bg-green-600' : 'bg-gray-600'} text-white rounded-md hover:${cameraOn ? 'bg-green-700' : 'bg-gray-700'} transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50`}
             >
               {cameraOn ? 'Camera Off' : 'Camera On'}
             </button>
             <button
               onClick={toggleAudio}
               className={`px-4 py-2 ${audioOn ? 'bg-blue-600' : 'bg-gray-600'} text-white rounded-md hover:${audioOn ? 'bg-blue-700' : 'bg-gray-700'} transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50`}
             >
               {audioOn ? 'Mute Audio' : 'Unmute Audio'}
             </button>
           </div>
         </div>
        )}
      </div>
    </div>
  );
}

export default CallsComponent;