import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown, Send, Edit2 } from 'lucide-react';
import { submitFeedback, FeedbackData } from '../services/apis/submitFeedback';
import { deleteFeedback } from '../services/apis/deleteFeedback';

interface FeedbackFormProps {
    projectName: string;
    context?: any;
    onFeedbackSubmitted?: () => void;
}

export const FeedbackForm: React.FC<FeedbackFormProps> = ({ projectName, context, onFeedbackSubmitted }) => {
    const [rating, setRating] = useState<'up' | 'down' | null>(null);
    const [comment, setComment] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [submissionId, setSubmissionId] = useState<number | null>(null);

    const handleSubmit = async () => {
        if (!rating) return;
        setLoading(true);
        const feedback: FeedbackData = {
            rating,
            comment,
            context
        };
        try {
            const id = await submitFeedback(projectName, feedback);
            setSubmissionId(id);
            setSubmitted(true);
            if (onFeedbackSubmitted) {
                 onFeedbackSubmitted();
            }
        } catch (e) {
            console.error(e);
            alert("Failed to submit feedback");
        } finally {
            setLoading(false);
        }
    };

    const handleUndo = async () => {
         if (submissionId) {
             setLoading(true);
             try {
                await deleteFeedback(projectName, submissionId);
                setSubmissionId(null);
                setSubmitted(false);
                // Trigger refresh to remove the deleted item from history list
                if (onFeedbackSubmitted) {
                    onFeedbackSubmitted(); 
                }
             } catch (e) {
                 console.error(e);
                 alert("Failed to modify feedback");
             } finally {
                 setLoading(false);
             }
         } else {
             setSubmitted(false);
         }
    };

    if (submitted) {
        return (
            <div className="mt-3 p-3 border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 rounded-lg flex items-center justify-between">
                <span className="text-green-700 dark:text-green-300 font-medium text-sm">Thanks for your feedback!</span>
                <button 
                    onClick={handleUndo}
                    disabled={loading}
                    className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:underline disabled:opacity-50"
                >
                    <Edit2 className="w-3 h-3" />
                    {loading ? 'Modifying...' : 'Modify'}
                </button>
            </div>
        );
    }

    return (
        <div className="mt-3 p-3 border border-gray-200 dark:border-slate-700 rounded-lg bg-gray-50 dark:bg-slate-800/50">
            <div className="flex items-center gap-3">
            <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400">Rate this result</h3>
            <div className="flex gap-2">
                <button
                    onClick={() => setRating('up')}
                    className={`p-1.5 rounded-full transition-all ${
                        rating === 'up' 
                        ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400 ring-2 ring-green-500' 
                        : 'hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                    }`}
                    title="Good response"
                >
                    <ThumbsUp className="w-4 h-4" />
                </button>
                <button
                    onClick={() => setRating('down')}
                    className={`p-1.5 rounded-full transition-all ${
                        rating === 'down' 
                        ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 ring-2 ring-red-500' 
                        : 'hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                    }`}
                    title="Bad response"
                >
                    <ThumbsDown className="w-4 h-4" />
                </button>
            </div>
            </div>
            
            {rating && (
                <div className="mt-2 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                    <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Tell us more (optional)..."
                        className="w-full text-sm p-2 rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400 dark:placeholder-gray-500"
                        rows={2}
                    />
                    <div className="flex justify-end">
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                            {loading ? 'Sending...' : (
                                <>
                                    <Send className="w-3 h-3" />
                                    Submit Feedback
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
