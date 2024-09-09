import React, { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

const AnswerContent = ({ questionid, answerContent, onalick }) => {
  const [questionContent, setQuestionContent] = useState(null);
  const [loading, setLoading] = useState(true);
  console.log(questionid)
  useEffect(() => {
    if (questionid) {
      const fetchQuestionContent = async () => {
        try {
          const questionDoc = doc(db, 'questions', questionid);
          const questionSnapshot = await getDoc(questionDoc);

          if (questionSnapshot.exists()) {
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
  }, [questionid]);

  if (loading) {
    return (questionContent);
  }

  return (
    <div className="answer-content">
 <div
      className="text-[22px] font-bold mb-2 hover:underline cursor-pointer"
      onClick={() => onalick(questionid)}
    >
        <div dangerouslySetInnerHTML={{ __html: questionContent || 'Question content not found' }}></div>
      </div>
    </div>
  );
};

export default AnswerContent;
