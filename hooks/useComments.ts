import { useState, useEffect } from 'react';

interface Comment {
    id: string;
    content: string;
    userId: string;
    photoId: string;
    createdAt: Date;
}

const useComments = (photoId: string) => {
    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [newComment, setNewComment] = useState<string>('');

    const fetchComments = async (photoId: string): Promise<Comment[]> => {
        const response = await fetch(`/api/comments?photoId=${photoId}`);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    };

    const postComment = async (photoId: string, content: string): Promise<Comment> => {
        const response = await fetch('/api/comments', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                photoId,
                content,
            }),
        });
        if (!response.ok) {
            throw new Error('Failed to post comment');
        }
        return response.json();
    };

    useEffect(() => {
        const loadComments = async () => {
            try {
                const fetchedComments = await fetchComments(photoId);
                setComments(fetchedComments);
            } catch (err) {
                setError('Failed to load comments');
            } finally {
                setLoading(false);
            }
        };

        loadComments();
    }, [photoId]);

    const handleCommentChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setNewComment(event.target.value);
    };

    const handleCommentSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!newComment.trim()) return;

        try {
            const addedComment = await postComment(photoId, newComment);
            setComments((prev) => [...prev, addedComment]);
            setNewComment('');
        } catch (err) {
            setError('Failed to post comment');
        }
    };

    return {
        comments,
        loading,
        error,
        newComment,
        handleCommentChange,
        handleCommentSubmit,
    };
};

export default useComments;