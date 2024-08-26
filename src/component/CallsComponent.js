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
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faVideo, faVideoSlash, faMicrophone, faMicrophoneSlash, faPhoneSlash, faCopy } from '@fortawesome/free-solid-svg-icons';

function CallsComponent() {
  const [roomId, setRoomId] = useState('');
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [isReady, setIsReady] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);
  const [audioOn, setAudioOn] = useState(true);
  const [roomStarted, setRoomStarted] = useState(false);
  const [isCreator, setIsCreator] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
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
      setIsLoading(true);
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
      setError('Failed to access camera and microphone. Please check your permissions.');
      setIsReady(false);
    } finally {
      setIsLoading(false);
    }
  };

  const createRoom = async () => {
    try {
      setIsLoading(true);
      const roomRef = await addDoc(collection(db, 'rooms'), { participants: [] });
      setRoomId(roomRef.id);
      setRoomStarted(true);
      setIsCreator(true);
      await joinRoom(roomRef.id);
    } catch (error) {
      console.error('Error creating room:', error);
      setError('Failed to create room. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const joinRoom = async (id) => {
    try {
      setIsLoading(true);
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
      } else {
        throw new Error('Room not found');
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

      setRoomStarted(true);
    } catch (error) {
      console.error('Error joining room:', error);
      setError('Failed to join room. Please check the room ID and try again.');
    } finally {
      setIsLoading(false);
    }
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

      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
          console.log('Peer connection disconnected or failed. Attempting to reconnect...');
          setTimeout(() => createPeerConnection(participantId, isInitiator, roomId), 5000);
        }
      };

      localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

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
              if (pc && pc.signalingState !== 'stable') {
                try {
                  await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
                  const answer = await pc.createAnswer();
                  await pc.setLocalDescription(answer);
                  await addDoc(collection(db, 'rooms', roomId, 'answers'), {
                    answer: { type: answer.type, sdp: answer.sdp },
                    participantId: auth.currentUser.uid,
                    recipientId: data.participantId,
                  });
                } catch (error) {
                  console.error('Error handling offer:', error);
                }
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
                try {
                  await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
                } catch (error) {
                  console.error('Error handling answer:', error);
                }
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
                try {
                  await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
                } catch (error) {
                  console.error('Error adding ICE candidate:', error);
                }
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
    <div className="flex-1 flex flex-col p-4 bg-gray-900">
      <div className="flex-1 bg-gray-800 rounded-lg overflow-y-auto p-6 bg-opacity-50 backdrop-blur-lg shadow-2xl border border-gray-700 border-opacity-50">
        <h2 className="text-3xl font-semibold text-white mb-8">Professional Group Call Interface</h2>

        {error && (
          <div className="bg-red-500 text-white p-4 rounded-md mb-4">
            {error}
          </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center mb-4">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        )}

        {!roomStarted && (
          <div className="mb-8">
            <input
              type="text"
              placeholder="Enter Room ID"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="p-3 rounded-md bg-gray-700 text-white mr-4 w-64"
            />
            <button
              onClick={createRoom}
              className="bg-blue-600 text-white p-3 rounded-md mr-4 hover:bg-blue-700 transition-colors"
              disabled={isLoading}
            >
              Create Room
            </button>
            <button
              onClick={handleJoinRoom}
              className="bg-green-600 text-white p-3 rounded-md hover:bg-green-700 transition-colors"
              disabled={isLoading || !roomId}
            >
              Join Room
            </button>
          </div>
        )}

        {roomStarted && (
          <>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl text-white">Room ID: {roomId}</h3>
              <button
                onClick={handleCopyRoomId}
                className="bg-yellow-500 text-black p-2 rounded-md hover:bg-yellow-600 transition-colors"
              >
                <FontAwesomeIcon icon={faCopy} className="mr-2" />
                Copy Room ID
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
              <div className="bg-black rounded-lg overflow-hidden shadow-lg relative aspect-video">
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  className="w-full h-full object-cover"
                ></video>
                <div className="absolute bottom-2 left-2 text-white text-sm bg-black bg-opacity-50 px-2 py-1 rounded">
                  You
                </div>
              </div>
              {Object.keys(remoteStreams).map((participantId) => (
                <div
                  key={participantId}
                  className="bg-black rounded-lg overflow-hidden shadow-lg relative aspect-video"
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
                  <div className="absolute bottom-2 left-2 text-white text-sm bg-black bg-opacity-50 px-2 py-1 rounded">
                    Participant: {participantId.slice(0, 8)}...
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-center space-x-6">
              <button
                onClick={toggleCamera}
                className={`p-3 rounded-full ${
                  cameraOn ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                } transition-colors`}
              >
                <FontAwesomeIcon icon={cameraOn ? faVideo : faVideoSlash} />
              </button> 
              <button
                onClick={toggleAudio}
                className={`p-3 rounded-full ${
                  audioOn ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                } transition-colors`}
              >
                <FontAwesomeIcon icon={audioOn ? faMicrophone : faMicrophoneSlash} />
              </button>
              <button
                onClick={handleDisconnect}
                className="bg-red-600 text-white p-3 rounded-full hover:bg-red-700 transition-colors"
              >
                <FontAwesomeIcon icon={faPhoneSlash} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default CallsComponent;