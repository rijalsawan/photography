'use client'
import { useState, useCallback } from 'react'
import { useUser } from '@clerk/nextjs'
import toast from 'react-hot-toast'

interface Photo {
    id: string
    url: string
    title?: string
    description?: string
    likeCount: number
    commentCount: number
    createdAt: string
    isLiked?: boolean
    userId: string
}

interface Comment {
    id: string
    text: string
    user: {
        id: string
        name: string
        username: string
        avatar?: string
    }
    createdAt: string
    replies?: Comment[]
}

export function usePhotoInteractions() {
    const { user } = useUser()
    const [loading, setLoading] = useState(false)

    // Like/Unlike a photo
    const toggleLike = useCallback(async (photoId: string) => {
        if (!user || loading) return null
        
        setLoading(true)
        try {
            const response = await fetch('/api/like', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ photoId }),
            })
            
            if (response.ok) {
                const result = await response.json()
                toast.success(result.message)
                return {
                    success: true,
                    liked: result.liked,
                    photoId
                }
            }
            throw new Error('Failed to like photo')
        } catch (error) {
            console.error('Error liking photo:', error)
            toast.error('Failed to like photo')
            return null
        } finally {
            setLoading(false)
        }
    }, [user, loading])

    // Add a comment
    const addComment = useCallback(async (photoId: string, text: string) => {
        if (!user || loading || !text.trim()) return null
        
        setLoading(true)
        try {
            const response = await fetch('/api/comments', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    photoId,
                    text: text.trim(),
                }),
            })
            
            if (response.ok) {
                const result = await response.json()
                toast.success('Comment added!')
                return {
                    success: true,
                    comment: result,
                    photoId
                }
            }
            throw new Error('Failed to add comment')
        } catch (error) {
            console.error('Error adding comment:', error)
            toast.error('Failed to add comment')
            return null
        } finally {
            setLoading(false)
        }
    }, [user, loading])

    // Add a reply
    const addReply = useCallback(async (commentId: string, text: string) => {
        if (!user || loading || !text.trim()) return null
        
        setLoading(true)
        try {
            const response = await fetch('/api/reply', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    commentId,
                    text: text.trim(),
                }),
            })
            
            if (response.ok) {
                const result = await response.json()
                toast.success('Reply added!')
                return {
                    success: true,
                    reply: result,
                    commentId
                }
            }
            throw new Error('Failed to add reply')
        } catch (error) {
            console.error('Error adding reply:', error)
            toast.error('Failed to add reply')
            return null
        } finally {
            setLoading(false)
        }
    }, [user, loading])

    // Delete a comment
    const deleteComment = useCallback(async (commentId: string) => {
        if (!user || loading) return null
        
        setLoading(true)
        try {
            const response = await fetch(`/api/deletecomment?commentId=${commentId}`, {
                method: 'DELETE',
            })
            
            if (response.ok) {
                const result = await response.json()
                toast.success('Comment deleted!')
                return {
                    success: true,
                    deletedCount: result.deletedCount || 1,
                    commentId
                }
            } else {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Failed to delete comment')
            }
        } catch (error) {
            console.error('Error deleting comment:', error)
            toast.error('Failed to delete comment')
            return null
        } finally {
            setLoading(false)
        }
    }, [user, loading])

    // Fetch comments for a photo
    const fetchComments = useCallback(async (photoId: string) => {
        try {
            const response = await fetch(`/api/comments?photoId=${photoId}`)
            if (response.ok) {
                return await response.json()
            }
            throw new Error('Failed to fetch comments')
        } catch (error) {
            console.error('Error fetching comments:', error)
            toast.error('Failed to load comments')
            return []
        }
    }, [])

    // Check if user can delete a comment
    const canDeleteComment = useCallback((comment: Comment, photoUserId?: string) => {
        if (!user) return false
        // User can delete their own comments or comments on their photos
        return comment.user.id === user.id || photoUserId === user.id
    }, [user])

    return {
        toggleLike,
        addComment,
        addReply,
        deleteComment,
        fetchComments,
        canDeleteComment,
        loading
    }
}