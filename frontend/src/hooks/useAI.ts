import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { analyzeCode, sendChat, addUserMessage } from '../store/aiSlice';
import toast from 'react-hot-toast';

export const useAI = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { analyses, chatHistory, loading, error } = useSelector((s: RootState) => s.ai);

  const analyze = async (code: string, language: string) => {
    const result = await dispatch(analyzeCode({ code, language }));
    if (analyzeCode.rejected.match(result)) toast.error('AI analysis failed');
    return result;
  };

  const chat = async (message: string) => {
    dispatch(addUserMessage(message));
    const result = await dispatch(sendChat(message));
    if (sendChat.rejected.match(result)) toast.error('Chat failed');
    return result;
  };

  return { analyses, chatHistory, loading, error, analyze, chat };
};