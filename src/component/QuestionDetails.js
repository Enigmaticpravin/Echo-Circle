import React from 'react';
import { MoreHorizontal, MessageCircle, ThumbsDown } from 'lucide-react';
import follow from '../images/radar-1.svg';
import { getDoc, auth, db, doc } from '../firebase';
import { useEffect, useState } from 'react';
import RelatedPosts from './RelatedPosts';
import AnswerPopup from './AnswerPopup';

const QuestionDetails = (questionid) => {
  const [questionContent, setQuestionContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedQuestion, setSelectedQuestion] = useState(null); 
  const [showQuoraPopup, setShowQuoraPopup] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [authorid, setAuthor] = useState(null);
  const [questions, setQuestions] = useState([]);

  const data = questionid.questionid;
  useEffect(() => {
    if (data) {
      const fetchQuestionContent = async () => {
        try {
          const questionDoc = doc(db, 'questions', data);
          const questionSnapshot = await getDoc(questionDoc);

          if (questionSnapshot.exists()) {
            setQuestions(questionSnapshot.data().user);
            setQuestionContent(questionSnapshot.data().content);
          } else {
            console.error('No such question!');
          }
        } catch (error) {
          console.error('Error fetching question content:', error);
        } finally {
          setLoading(false);
        }
      };

      fetchQuestionContent();
    }
  }, [data]);

  const toggleQuoraPopup = (question, id, author) => {
    if (question) {
        setSelectedQuestion(question);
        setSelectedId(id);
        setAuthor(author)
        console.log(question);
    } else {
        setSelectedQuestion(null);
        setSelectedId(null);
    }
    setShowQuoraPopup(!showQuoraPopup);
};

  return (
    <div className='flex flex-1 h-full w-full justify-center'>
         {showQuoraPopup && <AnswerPopup onClose={() => toggleQuoraPopup(null)} question={questionContent} questionid={data} author={questions}/>}
      <div className='flex-1 bg-gray-800 rounded-lg overflow-y-auto p-4 mt-4 ml-4 mb-4 mr-32 bg-opacity-50 backdrop-blur-lg shadow-2xl border border-gray-700 border-opacity-50'>
      <div className="mb-4">
      <h1 className="text-[24px] font-bold mb-2 font-poppins" dangerouslySetInnerHTML={{ __html: questionContent }}></h1>
        <div className="flex space-x-2 mt-4">
            <button
              className="bg-gradient-to-r from-blue-600 to-blue-500 text-white py-2 px-5 rounded-full text-sm animate-pulse hover:animate-none hover:bg-gradient-to-r hover:from-pink-500 hover:to-yellow-500 focus:ring-4 focus:ring-yellow-400 shadow-lg transition-all duration-500 hover:rotate-3 hover:scale-110 active:scale-90 active:shadow-inner"
              onClick={() => toggleQuoraPopup(questionContent, data, questions)}
            >
              Answer
            </button>
          <button className=" text-white px-4 py-2 rounded-full text-sm flex items-center border border-gray-700 transition-colors duration-300 ease-in-out">
            <img src={follow} className='w-5 h-5 filter-white mr-2'></img>
            <span className="mr-1">Follow</span>
          </button>
        </div>
      </div>
      
      <div className="justify-between items-center mb-4 hidden">
        <div className="flex items-center">
          <span className="mr-2">All related (100+)</span>
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="flex items-center">
          <span className="mr-2">Sort</span>
          <span className="font-medium">Recommended</span>
          <svg className="w-4 h-4 ml-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </div>
      </div>
      
      <div className="border-t border-gray-700 pt-4">

      </div>
      <RelatedPosts questionid={data}/>
      </div>
      <div className="w-[30%] bg-gray-800 rounded-lg overflow-y-auto p-4 mt-4 mb-4 mr-4 bg-opacity-50 backdrop-blur-lg shadow-2xl border border-gray-700 border-opacity-50">
        <h2 className="text-lg font-semibold mb-2">Related questions</h2>
        <ul className="space-y-2 text-blue-400">
          <li>What are the lessons you learned from your life and other's life?</li>
          <li>What are the most important lessons you have learned in your life and when did you learn...</li>
          <li>What are your great lessons in life that I can learn from you?</li>
          <li>What is the most important lesson of life you have learned today?</li>
          <li>What are the important lessons you learnt in life?</li>
          <li>What was the most important lesson that you learned in life and also by whom?</li>
        </ul>
        <button className="text-gray-400 mt-2">Add question</button>
      </div>
    </div>
   
  );
};

export default QuestionDetails;