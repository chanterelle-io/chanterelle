import React from 'react';
import { ThumbsDown, ThumbsUp, Trash2 } from 'lucide-react';
import type { FeedbackEntry } from '../services/apis/getFeedbackHistory';

interface FeedbackListProps {
	history: FeedbackEntry[];
	loading?: boolean;
    onDelete?: (entry: FeedbackEntry) => void;
    onSelect?: (entry: FeedbackEntry) => void;
}

export const FeedbackList: React.FC<FeedbackListProps> = ({ history, loading, onDelete, onSelect }) => {
	if (loading) {
		return (
			<div className="text-sm text-gray-600 dark:text-gray-300">
				Loading feedback history...
			</div>
		);
	}

	if (!history || history.length === 0) {
		return (
			<div className="text-sm text-gray-600 dark:text-gray-300">
				No feedback yet.
			</div>
		);
	}

	return (
		<div className="space-y-3">
			{history
				.slice()
				.sort((a, b) => b.timestamp - a.timestamp)
				.map((entry, idx) => {
					const isUp = entry.feedback?.rating === 'up';
					const comment = (entry.feedback?.comment || '').trim();
					const timestampLabel = new Date(entry.timestamp * 1000).toLocaleString();

					return (
						<div
							key={`${entry.timestamp}-${idx}`}
							className={`rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 p-3 relative group transition-colors ${onSelect ? 'cursor-pointer hover:border-blue-300 dark:hover:border-blue-700' : ''}`}
                            onClick={() => onSelect && onSelect(entry)}
						>
							<div className="flex items-start justify-between gap-3">
								<div className="flex items-center gap-2">
									<span
										className={`inline-flex items-center justify-center w-7 h-7 rounded-full ${
											isUp
												? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
												: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
										}`}
										title={isUp ? 'Thumbs up' : 'Thumbs down'}
									>
										{isUp ? (
											<ThumbsUp className="w-4 h-4" />
										) : (
											<ThumbsDown className="w-4 h-4" />
										)}
									</span>
									<div className="text-xs text-gray-500 dark:text-gray-400">
										{timestampLabel}
									</div>
								</div>
                                {onDelete && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDelete(entry);
                                        }}
                                        className="text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                                        title="Delete feedback"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
							</div>

							{comment && (
								<div className="mt-2 text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
									{comment}
								</div>
							)}
						</div>
					);
				})}
		</div>
	);
};

