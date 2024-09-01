import React, { useState, useEffect, useRef } from 'react';

const GlowingButtons = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);

  useEffect(() => {
    const handleMouseMove = (event) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setMousePosition({
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
        });
      }
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  const buttons = ['Answers', 'Posts', 'Donations', 'Activity'];

  return (
    <div 
      ref={containerRef}
      className="relative flex space-x-2 py-4 bg-gray-900 w-full"
      style={{
        overflow: 'hidden',
      }}
    >
      {buttons.map((button, index) => (
        <button
          key={index}
          className="relative bg-gray-800 left-[`${mousePosition.x}px`] top-[`${mousePosition.y}px`] px-4 py-2  hover:bg-[radial-gradient(circle, rgba(76, 175, 80, 0.3) 0%, rgba(76, 175, 80, 0) 70%)] rounded-full text-sm transition-[left 0.1s, top 0.1s] transform-[translate(-50%, -50%)] font-medium text-white transition-all duration-300 ease-in-out hover:bg-gray-700 z-10"
        >
          {button}
        </button>
      ))}
      <div
        className="absolute pointer-events-none"
        
      />
    </div>
  );
};

export default GlowingButtons;
