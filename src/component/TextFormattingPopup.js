import React, { useEffect, useRef } from 'react';
import bold from '../images/bold.svg';
import italic from '../images/italic.svg';
import underline from '../images/underline.svg';
import comment from '../images/message.svg';

const TextFormattingPopup = ({ showPopup, popupPosition, applyFormat }) => {
  const popupRef = useRef(null);

  useEffect(() => {
    if (showPopup && popupRef.current) {
      const popup = popupRef.current;
      const rect = popup.getBoundingClientRect() + 10;
      const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight;

      let { top, left } = popupPosition;

      // Adjust if popup goes off-screen to the right
      if (left + rect.width > viewportWidth) {
        left = viewportWidth - rect.width - 20;
      }

      // Adjust if popup goes off-screen at the bottom
      if (top + rect.height > viewportHeight) {
        top = top - rect.height - 10; // Position above selection with a small gap
      }

      popup.style.top = `${top}px`;
      popup.style.left = `${left}px`;
    }
  }, [showPopup, popupPosition]);

  if (!showPopup) return null;

  return (
    <div
      ref={popupRef}
      className="fixed bg-gray-700 p-2 rounded-md flex space-x-2 shadow-lg"
      style={{ top: `${popupPosition.top}px`, left: `${popupPosition.left}px` }}
    >
      <button onClick={() => applyFormat('bold')}>
        <img src={bold} alt="Bold" className="w-6 h-6" />
      </button>
      <button onClick={() => applyFormat('italic')}>
        <img src={italic} alt="Italic" className="w-6 h-6" />
      </button>
      <button onClick={() => applyFormat('underline')}>
        <img src={underline} alt="Underline" className="w-6 h-6" />
      </button>
      <button onClick={() => applyFormat('comment')}>
        <img src={comment} alt="Comment" className="w-6 h-6" />
      </button>
    </div>
  );
};

export default TextFormattingPopup;