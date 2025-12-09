'use client';

import { useState, useTransition } from 'react';
import { addComment } from '@/app/actions';
import { useRouter } from 'next/navigation';

interface Comment {
    id: string;
    content: string;
    createdAt: Date;
    user: {
        name: string | null;
        image: string | null;
    };
}

interface CommentsSectionProps {
    projectId: string;
    initialComments: Comment[];
    isAuthenticated: boolean;
}

export default function CommentsSection({ projectId, initialComments, isAuthenticated }: CommentsSectionProps) {
    const [comment, setComment] = useState('');
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!comment.trim()) return;

        startTransition(async () => {
            try {
                await addComment(projectId, comment);
                setComment('');
                router.refresh();
            } catch (error) {
                alert("Failed to post comment");
            }
        });
    };

    return (
        <div className="space-y-8">
            <h3 className="text-xl font-semibold">Community Comments ({initialComments.length})</h3>

            {/* Comment Form */}
            {isAuthenticated ? (
                <form onSubmit={handleSubmit} className="flex gap-4 items-start">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold">You</span>
                    </div>
                    <div className="flex-1 space-y-2">
                        <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="Share your thoughts about this function..."
                            className="w-full rounded-xl border bg-muted/20 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[100px]"
                        />
                        <div className="flex justify-end">
                            <button
                                type="submit"
                                disabled={isPending || !comment.trim()}
                                className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                            >
                                {isPending ? 'Posting...' : 'Post Comment'}
                            </button>
                        </div>
                    </div>
                </form>
            ) : (
                <div className="p-6 rounded-xl border border-dashed bg-muted/10 text-center">
                    <p className="text-muted-foreground mb-2">Sign in to join the discussion.</p>
                    <a href="/api/auth/signin" className="text-primary hover:underline text-sm font-medium">
                        Sign In &rarr;
                    </a>
                </div>
            )}

            {/* Comment List */}
            <div className="space-y-6">
                {initialComments.length === 0 ? (
                    <p className="text-muted-foreground text-sm italic">No comments yet. Be the first to share your feedback!</p>
                ) : (
                    initialComments.map((comment) => (
                        <div key={comment.id} className="flex gap-4">
                             <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
                                {comment.user.name?.[0] || 'U'}
                            </div>
                            <div className="flex-1 space-y-1">
                                <div className="flex items-center justify-between">
                                    <span className="font-semibold text-sm">{comment.user.name || 'Anonymous'}</span>
                                    <span className="text-xs text-muted-foreground">{new Date(comment.createdAt).toLocaleDateString()}</span>
                                </div>
                                <p className="text-sm text-muted-foreground leading-relaxed">{comment.content}</p>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}