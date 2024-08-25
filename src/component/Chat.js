import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

function Chat({ user }) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const q = query(collection(db, 'messages'), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messagesArray = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMessages(messagesArray);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (message.trim()) {
      await addDoc(collection(db, 'messages'), {
        text: message,
        uid: user.userId,
        displayName: user.name,
        createdAt: serverTimestamp(),
      });
      setMessage('');
    }
  };

  return (
    <div className="flex">
      {/* Chat Area */}
      <div className="flex flex-col flex-1">
        {/* Scrollable Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-100" style={{ maxHeight: 'calc(100vh - 80px)' }}>
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex ${msg.uid === user.userId ? 'justify-end' : 'justify-start'} mb-4`}
            >
              <div className={`p-4 rounded-lg ${msg.uid === user.userId ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}>
                <p className="font-bold">{msg.displayName}</p>
                <p>{msg.text}</p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Sticky Input Box */}
        <div className="p-4 bg-white shadow-lg sticky">
          <div className="flex">
            <input 
              type="text" 
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:border-blue-500"
              placeholder="Type your message..."
            />
            <button
              onClick={handleSendMessage}
              className="ml-4 px-4 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Chat;
