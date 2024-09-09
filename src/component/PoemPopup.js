import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronDown, Globe } from 'lucide-react';
import bold from '../images/bold.svg';
import italic from '../images/italic.svg';
import { addDoc, collection, auth, db } from '../firebase';
import TextFormattingPopup from './TextFormattingPopup';
import underline from '../images/underline.svg';
import comment from '../images/messages-1.svg'
import bull from '../images/bulletlist.svg';

const PoemPopup = ({ onClose }) => {
  const [user, setUser] = useState(null);
  const contentEditableRef = useRef(null);
  const [isEmpty, setIsEmpty] = useState(true);
  const [showGenerated, setShowGenerated] = useState(false);
  const [poemContent, setPoemContent] = useState('');
  const [uploading, setUploading] = useState(false);
  const [showMenu, setShowMenu] = useState(false); // For showing the sliding menu
  const [progress, setProgress] = useState(0);
  const [selectedType, setSelectedType] = useState('Ghazal'); // Default type

  useEffect(() => {
    const handleInput = () => {
      const content = contentEditableRef.current.innerText.trim();
      setIsEmpty(content === '');
    };

    const handlePaste = (event) => {
      event.preventDefault(); // Prevent default paste behavior (formatted text)
      
      // Get plain text from the clipboard
      const text = event.clipboardData.getData('text/plain');
      
      // Insert plain text at the caret position
      document.execCommand('insertText', false, text);
    };

    const contentEditable = contentEditableRef.current;

    document.addEventListener('input', handleInput);
    contentEditable.addEventListener('paste', handlePaste);
    return () => {
      document.removeEventListener('input', handleInput);
      contentEditable.removeEventListener('paste', handlePaste);
    };
  }, []);

  const handleGenerate = () => {
    const content = contentEditableRef.current.innerText;
    // Split content by line breaks
    const lines = content.split('\n');
  
    // Map each line to a justified line with HTML spans
    const justifiedLines = lines.map(line => {
      // Split line by spaces and wrap each word in a span
      const words = line.split(/\s+/);
      const justifiedLine = words.map((word, index) => {
        return `<span class="word">${word}</span>`;
      }).join(' ');
      
      return `<div class="line">${justifiedLine}</div>`;
    }).join('\n'); // Join lines with line breaks
  
    setPoemContent(justifiedLines);
    setShowGenerated(true);
  
    // Call a function to dynamically apply the spacing after rendering
    setTimeout(() => {
      justifyPoem();
    }, 0);
  };

  const applyFormat = (command) => {
    document.execCommand(command, false, null);
  };
  
  const justifyPoem = () => {
    const poemContainer = document.querySelector('.justified-poem');
    const lines = poemContainer.querySelectorAll('.line');
  
    lines.forEach(line => {
      const words = line.querySelectorAll('.word');
      let totalWidth = 0;
  
      // Calculate the total width of all words
      words.forEach(word => {
        totalWidth += word.offsetWidth;
      });
  
      // Calculate remaining space to distribute between words
      const containerWidth = line.offsetWidth;
      const remainingSpace = containerWidth - totalWidth;
  
      // Distribute the space as margin-right
      const spacePerWord = remainingSpace / (words.length - 1);
      words.forEach((word, index) => {
        if (index < words.length - 1) {
          word.style.marginRight = `${spacePerWord}px`;
        }
      });
    });
  };
  

  const handlePublish = async () => {
    let content = '';
    if(selectedType === "Ghazal") {
      content = poemContent;
    } else {
      content = contentEditableRef.current.innerHTML;
    }

    const currentUserId = auth.currentUser.uid;
    
    content = content.replace(/\n/g, '<br>');

    console.log('Post Content:', content);
  
    setUploading(true); // Start uploading

    // Simulate upload progress (e.g., by using a timeout)
    let progressValue = 0;
    const interval = setInterval(() => {
      progressValue += 10; // Increment progress
      setProgress(progressValue);

      if (progressValue >= 100) {
        clearInterval(interval);
        setUploading(false); // End uploading
      }
    }, 500);
    
    try {
      await addDoc(collection(db, "posts"), {
        content,
        timestamp: new Date(),
        user: currentUserId,
        type: selectedType,
        
      });
      console.log('Post saved successfully');
      onClose();
    } catch (error) {
      console.error('Error saving post:', error);
    }
  };

  const handleTypeSelect = (type) => {
    setSelectedType(type);
    setShowMenu(false);
    if (type !== 'Ghazal') {
      setShowGenerated(false); // Remove generated layout when switching from Ghazal
    }
  };


  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm"></div>
      <div className="bg-gray-900 w-full max-w-2xl rounded-xl shadow-xl z-50 relative flex flex-col h-[90%]">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <div className="flex space-x-4">
            <button className="text-white font-semibold">Create Poem</button>
            <div className="flex items-center text-gray-400 text-sm cursor-pointer"
            onClick={() => setShowMenu(!showMenu)}>
              <Globe size={16} className="mr-1" />
              <span>{selectedType}</span>
              <ChevronDown size={16} className="ml-1" />
            </div>
            {showMenu && (
                <div className="absolute mt-2 bg-gray-800 rounded-xl shadow-lg w-40 z-10">
                  {['Ghazal', 'Nazm', 'Verse', 'Prose', 'Freestyle'].map((type) => (
                    <div
                      key={type}
                      onClick={() => handleTypeSelect(type)}
                      className="p-2 text-white cursor-pointer hover:bg-gray-700"
                    >
                      {type}
                    </div>
                  ))}
                </div>
              )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 flex-1 overflow-y-auto ">
          {!showGenerated ? (
            <div className='relative w-full h-full'>
              {/* Editable content area */}
              {isEmpty && (
              <div className="absolute text-gray-500 p-4 mt-1 pointer-events-none">
                Say something...
              </div>
            )}
              <div
                ref={contentEditableRef}
                contentEditable
                className=" p-4 text-white h-full focus:outline-none"
                style={{
                  whiteSpace: 'pre-wrap',
                  lineHeight: '2',
                  textAlign: 'justify',
                }}
              ></div>
            </div>
          ) : (
            // Generated ghazal layout with justified words
            <div
              className="w-full flex items-center justify-center"
              style={{
      
                borderRadius: '10px',
                padding: '20px',
              }}
            >
              <div
                className="justified-poem text-white text-center p-6"
                style={{
                  fontSize: '1.1rem',
                  lineHeight: '0.7',
                  whiteSpace: 'pre-wrap',
                  textAlign: 'center',
                  width: '100%',
                  maxWidth: '600px',
                  padding: '20px',
                  borderRadius: '8px',
                  fontFamily: 'serif',
                }}
                dangerouslySetInnerHTML={{ __html: poemContent }}
              ></div>
            </div>
          )}
        </div>

        {/* Footer with Generate/Publish button */}
        <div className="flex justify-end p-4 border-t border-gray-700 bg-gray-800 rounded-b-xl">
        {selectedType === 'Ghazal' && !showGenerated ? (
            <div className='flex flex-1'>
              <div className='flex space-x-2 flex-grow items-center ml-4'>
                <button className="w-8 h-8 flex items-center justify-center text-gray-400 hover:bg-gray-700 rounded" onClick={() => applyFormat('bold')}>
                  <img src={bold} alt="Bold" className="w-5 h-5 filter-white" />
                </button>
                <button className="w-8 h-8 flex items-center justify-center text-gray-400 hover:bg-gray-700 rounded" onClick={() => applyFormat('italic')}>
                  <img src={italic} alt="Italic" className="w-5 h-5 filter-white" />
                </button>
                <button className="w-8 h-8 flex items-center justify-center text-gray-400 hover:bg-gray-700 rounded" onClick={() => applyFormat('underline')}>
                  <img src={underline} alt="Underline" className="w-5 h-5 filter-white" />
                </button>
              </div>
              <button onClick={handleGenerate} className="bg-blue-600 text-white px-4 py-1 rounded-full hover:bg-blue-700" disabled={isEmpty}>
                Generate
              </button>
            </div>
          ) : (
            <div className='flex flex-1'>
<div className='flex space-x-2 flex-grow items-center ml-4'>
                <button className="w-8 h-8 flex items-center justify-center text-gray-400 hover:bg-gray-700 rounded" onClick={() => applyFormat('bold')}>
                  <img src={bold} alt="Bold" className="w-5 h-5 filter-white" />
                </button>
                <button className="w-8 h-8 flex items-center justify-center text-gray-400 hover:bg-gray-700 rounded" onClick={() => applyFormat('italic')}>
                  <img src={italic} alt="Italic" className="w-5 h-5 filter-white" />
                </button>
                <button className="w-8 h-8 flex items-center justify-center text-gray-400 hover:bg-gray-700 rounded" onClick={() => applyFormat('underline')}>
                  <img src={underline} alt="Underline" className="w-5 h-5 filter-white" />
                </button>
              </div>
            <button onClick={handlePublish} className="bg-blue-600 text-white px-4 py-1 rounded-full hover:bg-blue-700">
              Publish
            </button>
            </div>
            
          )}
        </div>
      </div>
    </div>
  );
};

export default PoemPopup;
