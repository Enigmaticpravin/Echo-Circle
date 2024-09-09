import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, db } from '../firebase';
import more from '../images/more.svg';
import AnswerPopup from './AnswerPopup';

const QuestionsList = ({ authorId, togglePopup }) => {
    const [questions, setQuestions] = useState([]);
    const [showQuoraPopup, setShowQuoraPopup] = useState(false);
    const [selectedQuestion, setSelectedQuestion] = useState(null); 
    const [selectedId, setSelectedId] = useState(null);
    const [authorid, setAuthor] = useState(null);

    useEffect(() => {
        const fetchQuestions = async () => {
            const q = query(collection(db, "questions"), where("user", "==", authorId));
            
            // Subscribe to real-time updates
            const unsubscribe = onSnapshot(q, (querySnapshot) => {
                const questionsList = [];
                querySnapshot.forEach((doc) => {
                    questionsList.push({ id: doc.id, ...doc.data() });
                });
                setQuestions(questionsList);
            });

            // Cleanup subscription on component unmount
            return () => unsubscribe();
        };

        fetchQuestions();
    }, [authorId]);

    const formatTimestamp = (timestamp) => {
        const now = new Date();
        const date = new Date(timestamp.seconds * 1000);
        const diffInMs = now - date;
        const diffInSec = Math.floor(diffInMs / 1000);
        const diffInMin = Math.floor(diffInSec / 60);
        const diffInHr = Math.floor(diffInMin / 60);
        const diffInDays = Math.floor(diffInHr / 24);
    
        if (diffInDays > 0) {
            return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
        } else if (diffInHr > 0) {
            return `${diffInHr} hour${diffInHr > 1 ? 's' : ''} ago`;
        } else if (diffInMin > 0) {
            return `${diffInMin} minute${diffInMin > 1 ? 's' : ''} ago`;
        } else {
            return 'Just now';
        }
    };
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
        <div className="p-6">
           {showQuoraPopup && <AnswerPopup onClose={() => toggleQuoraPopup(null)} question={selectedQuestion} questionid={selectedId} author={authorid}/>}
            {questions.length === 0 ? (
                <p className="text-gray-500">No questions found.</p>
            ) : (
                questions.map((question) => (
                    <div key={question.id} className="bg-gray-800 rounded-lg shadow-md mb-4">
                        <div className='p-4'>
                        <div className="text-white text-lg font-bold font-poppins" dangerouslySetInnerHTML={{ __html: question.content }}></div>
                        <div className="flex justify-between text-gray-500 text-sm">
                        <span>{'Posted: '+ formatTimestamp(question.timestamp)}</span>
                        </div>
                        </div>
                        <div className="relative flex flex-1 h-16 bg-gray-700 border-t border-gray-700 rounded-b-xl px-4 overflow-hidden">
                            <button className='px-4 py-1 w-fit h-fit self-center rounded-full bg-blue-700 hover:bg-blue-900'
                             onClick={() => toggleQuoraPopup(question.content, question.id, question.user)}>Answer</button>
                            <div className='ml-auto self-center bg-gray-900 rounded-lg p-2 cursor-pointer'>
                                <img src={more} alt='More' className='w-5 h-5 filter-white' />
                            </div>
                        </div>
                    </div>
                ))
            )}
        </div>
    );
};

export default QuestionsList;
