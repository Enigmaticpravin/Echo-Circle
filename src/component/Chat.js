import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

function Chat({ user }) {
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

  return (
    <div className="flex">
      {/* Chat Area */}
      <div className="flex flex-col flex-1">
        {/* Scrollable Chat Messages */}
        <div className="flex-1 p-4" style={{ maxHeight: 'calc(100vh - 80px)' }}>
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex ${msg.uid === user.userId ? 'justify-end' : 'justify-start'} mb-4`}
            >
              <div className={` pb-2 pt-2 pl-4 pr-4 rounded-xl mb-2 ${msg.uid === user.userId ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}>
                <p className="font-bold">{msg.displayName}</p>
                <p>{msg.text}</p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>
    </div>
  );
}

export default Chat;
