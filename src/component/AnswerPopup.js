import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronDown, Globe } from 'lucide-react';
import { auth, db, doc, getDoc, collection, addDoc, serverTimestamp } from '../firebase';
import bold from '../images/bold.svg';
import italic from '../images/italic.svg';
import { toast } from 'react-toastify';
import underline from '../images/underline.svg';
import link from '../images/link.svg';
import bull from '../images/bulletlist.svg'
import quotel from '../images/quote.png';
import separate from '../images/separate.svg';

const AnswerPopup = ({ onClose, question, questionid, author }) => {
  const [user, setUser] = useState(null);
  const [isEmpty, setIsEmpty] = useState(true);
  const contentEditableRef = useRef(null);
  const [showLinkDiv, setShowLinkDiv] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [linkInput, setLinkInput] = useState('');
  const ques = questionid;
  const aut = author;

  const handleLinkClick = () => {
    setShowLinkDiv(true);
  };  

  const handleCancelClick = () => {
    setShowLinkDiv(false);
  };

  useEffect(() => {
    const fetchUserData = async () => {
      const currentUser = auth.currentUser;
      if (currentUser) {
        const userRef = doc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setUser(userSnap.data());
        }
      }
    };

    fetchUserData();
  }, []);

  const handleInput = () => {
    const content = contentEditableRef.current.innerText.trim();
    setIsEmpty(content === '');
  };

  const insertSeparator = () => {
    const selection = window.getSelection();
    const range = selection.getRangeAt(0);
  
    // Create the separator element
    const hr = document.createElement('hr');
    hr.style.border = 'none';
    hr.style.height = '1.5px';
    hr.style.width = '30%'; // Adjust the width as needed
    hr.style.background = 'linear-gradient(to right, #ddd, #888, #ddd)';
    hr.style.margin = '20px auto'; // Centers the hr element
    hr.style.borderRadius = '5px';
    hr.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';
  
    // Insert the separator
    range.insertNode(hr);
  
    // Move the cursor to a new line after the separator
    range.setStartAfter(hr);
    range.setEndAfter(hr);
    range.collapse(false);
  
    // Create a new line after the separator
    const br = document.createElement('br');
    range.insertNode(br);
  
    // Adjust the selection to the new position
    selection.removeAllRanges();
    selection.addRange(range);
  };

  const applyFormat = (command) => {
    const selection = window.getSelection();
    const range = selection.getRangeAt(0);
    const startContainer = range.startContainer;
    const endContainer = range.endContainer;
  
    if (command === 'bullet') {
      if (selection.isCollapsed) return; // Exit if no text is selected
  
      // Check if the selected text is already part of a list
      let parentList = null;
      let currentNode = startContainer;
  
      while (currentNode) {
        if (currentNode.nodeType === 1 && (currentNode.tagName === 'UL' || currentNode.tagName === 'OL')) {
          parentList = currentNode;
          break;
        }
        currentNode = currentNode.parentNode;
      }
  
      if (parentList) {
        // Remove list formatting
        const listItems = parentList.getElementsByTagName('li');
        while (listItems.length) {
          const item = listItems[0];
          parentList.parentNode.insertBefore(item, parentList);
        }
        parentList.parentNode.removeChild(parentList);
      } else {
        // Apply list formatting
        const selectedText = range.toString();
        const ulElement = document.createElement('ul');
        const textLines = selectedText.split('\n');
  
        textLines.forEach((line) => {
          if (line.trim().length > 0) {
            const liElement = document.createElement('li');
            liElement.textContent = line;
            ulElement.appendChild(liElement);
          }
        });
  
        // Replace the selected text with the <ul> element
        range.deleteContents();
        range.insertNode(ulElement);
  
        // Place cursor at the end of the inserted list
        const newRange = document.createRange();
        newRange.selectNodeContents(ulElement);
        newRange.collapse(false);
        selection.removeAllRanges();
        selection.addRange(newRange);
      }
    } else if (command === 'createLink') {
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const selectedText = range.toString();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const selectedText = range.toString();

        if (selectedText && linkInput) {
          const linkElement = document.createElement('a');
          linkElement.href = linkInput;
          linkElement.target = '_blank'; 
          linkElement.textContent = selectedText;
          linkElement.style.color = '#ADD8E6'; // Light blue color
          range.deleteContents();
          range.insertNode(linkElement);
          setShowLinkDiv(true); 
          setLinkInput(''); 
        }}
      }
    }  else if (command === 'quote') {
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const selectedText = range.toString();
  
        // Check if the selection is already within a blockquote
        let blockquote = null;
        let currentNode = range.commonAncestorContainer;
        
        // Traverse up the DOM tree to find the closest blockquote
        while (currentNode && currentNode !== contentEditableRef.current) {
          if (currentNode.nodeType === Node.ELEMENT_NODE && currentNode.tagName.toLowerCase() === 'blockquote') {
            blockquote = currentNode;
            break;
          }
          currentNode = currentNode.parentNode;
        }
  
        if (blockquote) {
          // Remove the blockquote formatting
          const fragment = document.createDocumentFragment();
          while (blockquote.firstChild) {
            fragment.appendChild(blockquote.firstChild);
          }
          blockquote.parentNode.replaceChild(fragment, blockquote);
        } else if (selectedText) {
          // Apply quote formatting
          const quoteElement = document.createElement('blockquote');
          quoteElement.style.borderLeft = '3px solid #d3d3d3';
          quoteElement.style.paddingLeft = '10px';
          quoteElement.style.margin = '10px 0';
          quoteElement.style.color = '#b0b0b0';
          quoteElement.style.whiteSpace = 'pre-wrap'; 
  
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = range.cloneContents().textContent;
          quoteElement.appendChild(tempDiv);
  
          range.deleteContents();
          range.insertNode(quoteElement);
          
          const textLines = selectedText.split('\n');
          textLines.forEach((line, index) => {
            const p = document.createElement('p');
            p.textContent = line;
            p.style.margin = '5px 0';
            quoteElement.appendChild(p);
          });
  
          range.deleteContents();
          range.insertNode(quoteElement);
  
          // Place cursor at the end of the inserted quote
          const newRange = document.createRange();
          newRange.selectNodeContents(quoteElement);
          newRange.collapse(false);
          selection.removeAllRanges();
          selection.addRange(newRange);
        }
      }
    } else {
      document.execCommand(command, false, null);   
    }
  };


  const handleUpvoteNotification = async (questioni, postid) => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
  
    const notificationsRef = collection(db, 'notifications', aut, 'userNotifications');
  
    await addDoc(notificationsRef, {
      content: `${currentUser.displayName} answered your question`,
      type: 'answer',
      date: serverTimestamp(),
      read: false,
      additionalId: postid,
      questionId: questioni,
      senderId: currentUser.uid,
      receiverId: aut,
      postContent: '',
    });
  };

  const handlePost = async (questioni) => {
    // Get content with line breaks preserved as <br> tags
    let content = contentEditableRef.current.innerHTML;
    
    // Replace newline characters with <br> tags if needed
    // This ensures that line breaks are preserved
    content = content.replace(/\n/g, '<br>');

    console.log('Post Content:', ques);
    setUploading(true);

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
    
    // Assuming you have a Firestore collection for posts
    try {
      const docRef = await addDoc(collection(db, "posts"), {
        content,
        timestamp: new Date(),
        user: user.userId,
        type: "answer",
        questionid: questioni
      });
  
      // Retrieve the document ID
      const postId = docRef.id;
  
      // Pass the document ID to handle notifications
      handleUpvoteNotification(questioni, postId);
      console.log('Post saved successfully');
      onClose();
    } catch (error) {
      console.error('Error saving post:', error);
    }
};

  const applyCodeFormat = () => {
    const selection = window.getSelection();
    const range = selection.getRangeAt(0);
    const selectedText = range.toString();
    
    if (selectedText) {
      const codeElement = document.createElement('div');
      codeElement.className = 'code-block';
      codeElement.style.backgroundColor = '#2d2d2d';
      codeElement.style.color = '#ffffff';
      codeElement.style.padding = '10px';
      codeElement.style.borderRadius = '4px';
      codeElement.style.fontFamily = 'monospace';
      codeElement.style.display = 'flex';
      codeElement.style.lineHeight = '1.2';

      const lineNumbers = document.createElement('div');
      lineNumbers.className = 'line-numbers';
      lineNumbers.style.borderRight = '1px solid #555';
      lineNumbers.style.paddingRight = '10px';
      lineNumbers.style.marginRight = '10px';
      lineNumbers.style.userSelect = 'none';
      lineNumbers.style.color = '#888';
      lineNumbers.style.textAlign = 'right';

      const codeContent = document.createElement('div');
      codeContent.className = 'code-content';
      codeContent.contentEditable = true;
      codeContent.style.outline = 'none';
      codeContent.style.flex = '1';
      codeContent.style.whiteSpace = 'pre';
      codeContent.textContent = selectedText;

      const updateLineNumbers = () => {
        const lines = codeContent.innerText.split('\n');
        lineNumbers.innerHTML = lines.map((_, i) => i + 1).join('\n');
      };

      codeContent.addEventListener('input', updateLineNumbers);
      codeContent.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          document.execCommand('insertLineBreak');
          document.execCommand('insertText', false, '\n');
          updateLineNumbers();
        }
      });

      updateLineNumbers();

      codeElement.appendChild(lineNumbers);
      codeElement.appendChild(codeContent);

      range.deleteContents();
      range.insertNode(codeElement);

      // Place cursor at the end of the inserted code block
      const newRange = document.createRange();
      newRange.selectNodeContents(codeContent);
      newRange.collapse(false);
      selection.removeAllRanges();
      selection.addRange(newRange);
      codeContent.focus();
    }
  };

  if (!user) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm"></div>
      <div className="bg-gray-900 w-full max-w-2xl rounded-xl shadow-xl z-50 relative flex flex-col h-[90%]">
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <div className="flex space-x-4">
            <button className="text-white font-semibold">Create Post</button>
            <div className="flex items-center text-gray-400 text-sm">
              <Globe size={16} className="mr-1" />
              <span>Everyone</span>
              <ChevronDown size={16} className="ml-1" />
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <div className="p-4 flex-grow relative overflow-y-auto">
          <div className="flex items-center space-x-2 mb-4 relative z-10">
            <img src={user.profileImage} alt={user.name} className="w-10 h-10 rounded-full" />
            <div className="flex-grow">
              <h3 className="text-white font-semibold">{user.name}</h3>
              <button className="text-gray-400 text-sm flex items-center">
                Chief Technology Officer at Rutba Event (2024-present)
                <ChevronDown size={16} className="ml-1" />
              </button>
            </div>
          </div>
          <h1 className="text-lg font-poppins font-bold" dangerouslySetInnerHTML={{ __html: question }}></h1>
          <div className="relative w-full h-full">
            {isEmpty && (
              <div className="absolute inset-0 text-gray-500 py-2 pointer-events-none">
                Write your answer here...
              </div>
            )}
            <div
              ref={contentEditableRef}
              contentEditable
              onInput={handleInput}
              className="w-full h-full bg-transparent text-white resize-none focus:outline-none py-2 relative z-10"
              style={{ whiteSpace: 'pre-wrap' }}
            ></div>
          </div>
        </div>

        {/* Toolbar and Post button at the bottom */}

         {/* Toolbar and Post button at the bottom */}
         <div className="relative flex flex-col h-16 bg-gray-800 border-t border-gray-700 rounded-b-xl overflow-hidden p-5">
          <div
            className={`absolute inset-0 flex items-center transition-transform duration-300 ease-in-out ${
              showLinkDiv ? '-translate-y-full' : 'translate-y-0'
            }`}
          >
            <div className="flex space-x-2 flex-grow items-center mx-4">
              <button
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:bg-gray-700 rounded"
              >
                <img src={link} alt="Link" className="w-5 h-5 filter-white" />
              </button>
              <textarea
                id="textarea"
                className="flex-grow text-gray-400 resize-none focus:outline-none bg-transparent p-2 m-0 h-10"
                placeholder="Enter link here..."
                value={linkInput}
                onChange={(e) => setLinkInput(e.target.value)}
              ></textarea>
                  <div className="flex items-center space-x-2">
              <label className="items-center text-gray-400 hidden">
                <input type="radio" name="footnote" className="form-radio text-blue-500 rounded-lg" />
                <span className="ml-1 text-sm">Footnote</span>
              </label>
              <button
                id="toggleButton"
                className={`bg-gray-700 text-white px-4 py-1 rounded-full hover:bg-gray-600`}
                onClick={handleLinkClick}
              >
                Cancel
              </button>
              <div className="w-px h-6 bg-gray-600 mx-2"></div>
              <button
                className="bg-red-500 text-white px-4 py-1 rounded-full font-semibold hover:bg-red-600 mr-4"
                onClick={() => applyFormat('createLink')}
              >
                Add Link
              </button>
            </div>
            </div>
          </div>

          <div
            className={` absolute inset-0 flex items-center transition-transform duration-300 ease-in-out ${showLinkDiv ? 'translate-y-0' : 'translate-y-full'
              }`}
          >
            <div className="flex space-x-2 flex-grow items-center ml-4">
              <button
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:bg-gray-700 rounded"
                onClick={() => applyFormat('bold')}
              >
                <img src={bold} alt="Bold" className="w-5 h-5 filter-white" />
              </button>
              <button
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:bg-gray-700 rounded"
                onClick={() => applyFormat('italic')}
              >
                <img src={italic} alt="Italic" className="w-5 h-5 filter-white" />
              </button>
              <button
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:bg-gray-700 rounded"
                onClick={() => applyFormat('underline')}
              >
                <img src={underline} alt="Underline" className="w-5 h-5 filter-white" />
              </button>
              <button
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:bg-gray-700 rounded"
                onClick={() => applyFormat('quote')}
              >
                <img src={quotel} alt="Quote" className="w-5 h-5 filter-white" />
              </button>
              <button
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:bg-gray-700 rounded"
                onClick={handleCancelClick}
              >
                <img src={link} alt="Link" className="w-5 h-5 filter-white" />
              </button>
              <button
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:bg-gray-700 rounded"
                onClick={() => applyFormat('bullet')}
              >
                <img src={bull} alt="Bulleted" className="w-5 h-5 filter-white" />
              </button>
              <button
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:bg-gray-700 rounded"
                onClick={insertSeparator}
              >
                <img src={separate} alt="Separator" className="w-5 h-5 filter-white" />
              </button>
            </div>
            <button
              className="bg-blue-500 text-white px-4 py-1 rounded-full font-semibold hover:bg-blue-600 mr-4"
              onClick={() => handlePost(ques)}
              disabled={uploading}
            >
              Post
            </button>
            {uploading && (
              <div className=' bg-black/40 flex items-center justify-center'>
                <div className='bg-transparent p-4 rounded-lg flex items-center space-x-4'>
                  <p>Uploading...</p>
                  <div className='relative flex items-center'>
                    <div className='flex mb-2 items-center justify-center mt-2'>
                      <div className='text-xs font-semibold inline-block py-1 px-2 rounded-full text-teal-600 bg-teal-200'>
                        {progress}%
                      </div>
                    </div>
                    <div className='relative flex mb-2 items-center justify-center ml-2'>
                      <div className='w-full bg-gray-200 rounded-full'>
                        <div className='bg-blue-500 text-xs leading-none py-1 text-center text-white rounded-full' style={{ width: `${progress}%` }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        </div>
    </div>
  );
}
export default AnswerPopup;
