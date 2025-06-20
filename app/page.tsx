'use client'
import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
    Heart, 
    MessageCircle, 
    Send, 
    Bookmark, 
    MoreHorizontal, 
    Camera,
    Reply,
    Trash2,
    X
} from 'lucide-react'
import { useUser } from '@clerk/nextjs'
import Link from 'next/link'
import toast from 'react-hot-toast'

// Import your custom hooks
import { usePhotosState } from '@/hooks/usePhotosState'
import { usePhotoInteractions } from '@/hooks/usePhotoInteractions'
import { useModalState } from '@/hooks/useModalState'

interface Photo {
    id: string
    url: string
    title?: string
    description?: string
    location?: string
    tags?: string[]
    createdAt: string
    user: {
        id: string
        name: string
        username: string
        avatar?: string
    }
    likeCount: number
    commentCount: number
    isLiked?: boolean // Make this optional to handle undefined
    userId?: string
}

interface Comment {
    id: string
    content: string
    text: string // Make text required to match the expected interface
    createdAt: string
    user: {
        id: string
        name: string
        username: string
        avatar?: string
    }
    replies: Reply[]
    replyCount: number
}

interface Reply {
    id: string
    content: string
    text: string // Make text required to match the expected interface
    createdAt: string
    user: {
        id: string
        name: string
        username: string
        avatar?: string
    }
}

export default function HomePage() {
    const { user: clerkUser, isLoaded } = useUser()
    
    // Use custom hooks
    const { 
        photos, 
        comments, 
        selectedPhoto,
        updatePhotoLike,
        updatePhotoCommentCount,
        addComment: addCommentToState,
        addReply: addReplyToState,
        removeComment: removeCommentFromState,
        setPhotosData,
        setCommentsData,
        setSelectedPhotoData
    } = usePhotosState()
    
    const {
        toggleLike,
        addComment,
        addReply,
        deleteComment,
        fetchComments,
        canDeleteComment,
        loading: interactionLoading
    } = usePhotoInteractions()
    
    const {
        newComment,
        setNewComment,
        replyingTo,
        replyText,
        setReplyText,
        showDeleteConfirm,
        setShowDeleteConfirm,
        startReply,
        cancelReply
    } = useModalState()

    // Local state
    const [loading, setLoading] = useState(true)
    const [loadingMore, setLoadingMore] = useState(false)
    const [page, setPage] = useState(1)
    const [hasMore, setHasMore] = useState(true)
    const [showComments, setShowComments] = useState<{[key: string]: boolean}>({})
    const [photoComments, setPhotoComments] = useState<{[key: string]: Comment[]}>({})
    const [showReplies, setShowReplies] = useState<{[key: string]: boolean}>({})
    const [showMobileMenu, setShowMobileMenu] = useState<{[key: string]: boolean}>({})

    useEffect(() => {
        if (isLoaded) {
            loadPhotos()
        }
    }, [isLoaded])

    useEffect(() => {
        const handleScroll = () => {
            if (
                window.innerHeight + document.documentElement.scrollTop >= 
                document.documentElement.offsetHeight - 1000 && 
                !loadingMore && 
                hasMore
            ) {
                loadMorePhotos()
            }
        }

        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [loadingMore, hasMore])

    const loadPhotos = async () => {
        try {
            setLoading(true)
            const response = await fetch('/api/getfeed?page=1&limit=10')
            const data = await response.json()
            
            if (response.ok && data.success) {
                // Transform the API data to match our Photo interface
                const transformedPhotos = data.photos.map((photo: any) => ({
                    ...photo,
                    likeCount: photo.stats?.likes || 0,
                    commentCount: photo.stats?.comments || 0,
                    isLiked: Boolean(photo.interactions?.isLiked) // Ensure it's always boolean
                }))
                
                setPhotosData(transformedPhotos)
                setHasMore(data.pagination?.hasMore || false)
                setPage(2)
                console.log('Loaded photos:', transformedPhotos)
            } else {
                toast.error('Failed to load photos')
            }
        } catch (error) {
            console.error('Error loading photos:', error)
            toast.error('Failed to load photos')
        } finally {
            setLoading(false)
        }
    }

    const loadMorePhotos = useCallback(async () => {
        if (!hasMore || loadingMore) return

        setLoadingMore(true)
        try {
            const response = await fetch(`/api/getfeed?page=${page}&limit=10`)
            const data = await response.json()
            
            if (response.ok && data.success) {
                const transformedPhotos = data.photos.map((photo: any) => ({
                    ...photo,
                    likeCount: photo.stats?.likes || 0,
                    commentCount: photo.stats?.comments || 0,
                    isLiked: Boolean(photo.interactions?.isLiked) // Ensure it's always boolean
                }))
                
                setPhotosData([...photos, ...transformedPhotos])
                setHasMore(data.pagination?.hasMore || false)
                setPage(prev => prev + 1)
            }
        } catch (error) {
            console.error('Error loading more photos:', error)
        } finally {
            setLoadingMore(false)
        }
    }, [page, hasMore, loadingMore, photos, setPhotosData])

    const handleLike = async (photo: Photo) => {
        if (!clerkUser) {
            toast.error('Please sign in to like photos')
            return
        }

        // Ensure isLiked is always a boolean
        const wasLiked = Boolean(photo.isLiked)
        
        // Optimistic update using hook
        updatePhotoLike(photo.id, !wasLiked)

        // Call API using hook
        const result = await toggleLike(photo.id)
        
        if (!result || !result.success) {
            // Revert optimistic update on failure
            updatePhotoLike(photo.id, wasLiked)
        }
    }

    const loadPhotoComments = async (photoId: string) => {
        try {
            const loadedComments = await fetchComments(photoId)
            console.log('Loaded comments:', loadedComments) // Debug log
            setPhotoComments(prev => ({ ...prev, [photoId]: loadedComments }))
        } catch (error) {
            console.error('Error loading comments:', error)
        }
    }

    const handleShowComments = (photoId: string) => {
        setShowComments(prev => ({ ...prev, [photoId]: !prev[photoId] }))
        
        if (!showComments[photoId] && !photoComments[photoId]) {
            loadPhotoComments(photoId)
        }
    }

    const handleAddComment = async (photoId: string) => {
        if (!clerkUser || !newComment.trim()) {
            if (!clerkUser) toast.error('Please sign in to comment')
            return
        }

        const result = await addComment(photoId, newComment)
        console.log('Add comment result:', result) // Debug log
        
        if (result && result.success) {
            // Add comment to local state
            setPhotoComments(prev => ({
                ...prev,
                [photoId]: [result.comment, ...(prev[photoId] || [])]
            }))
            
            // Update photo comment count
            updatePhotoCommentCount(photoId, 1)
            
            // Clear input
            setNewComment('')
        }
    }

    const handleAddReply = async (photoId: string, commentId: string) => {
        if (!clerkUser || !replyText.trim()) {
            if (!clerkUser) toast.error('Please sign in to reply')
            return
        }

        const result = await addReply(commentId, replyText)
        
        if (result && result.success) {
            // Add reply to comment in local state
            setPhotoComments(prev => ({
                ...prev,
                [photoId]: prev[photoId].map(comment => 
                    comment.id === commentId 
                        ? { 
                            ...comment, 
                            replies: [...comment.replies, result.reply],
                            replyCount: comment.replyCount + 1
                        }
                        : comment
                )
            }))
            
            // Cancel reply mode
            cancelReply()
        }
    }

    const handleDeleteComment = async (photoId: string, commentId: string) => {
        const result = await deleteComment(commentId)
        
        if (result && result.success) {
            // Remove comment from local state
            setPhotoComments(prev => ({
                ...prev,
                [photoId]: prev[photoId].filter(comment => comment.id !== commentId)
            }))
            
            // Update photo comment count
            updatePhotoCommentCount(photoId, -1)
            
            // Close delete confirmation and mobile menu
            setShowDeleteConfirm(null)
            setShowMobileMenu({})
            toast.success('Comment deleted')
        }
    }

    // Helper function to get comment text (handles both content and text fields)
    const getCommentText = (comment: Comment) => {
        return comment.content || comment.text || ''
    }

    // Helper function to safely get like status
    const getIsLiked = (photo: Photo): boolean => {
        return Boolean(photo.isLiked)
    }

    const formatTimeAgo = (dateString: string) => {
        const date = new Date(dateString)
        const now = new Date()
        const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)
        
        if (seconds < 60) return `${seconds}s`
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`
        if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`
        return `${Math.floor(seconds / 604800)}w`
    }

    const UserAvatar = ({ user, size = 'md' }: { user: any, size?: 'sm' | 'md' | 'lg' }) => {
        const sizeClasses = {
            sm: 'w-6 h-6',
            md: 'w-8 h-8',
            lg: 'w-12 h-12'
        }

        return (
            <div className={`${sizeClasses[size]} rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-pink-500 p-0.5 flex-shrink-0`}>
                <div className="w-full h-full rounded-full overflow-hidden bg-white flex items-center justify-center">
                    {user.avatar ? (
                        <img 
                            src={user.avatar} 
                            alt={user.name}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <span className={`font-bold text-slate-600 ${size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : 'text-base'}`}>
                            {user.name?.charAt(0)?.toUpperCase() || '?'}
                        </span>
                    )}
                </div>
            </div>
        )
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 pt-20 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-slate-600">Loading your feed...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-50 lg:pt-16 pb-20">
            <div className="max-w-2xl mx-auto px-4 py-6">
                {photos.length === 0 ? (
                    <div className="text-center py-16">
                        <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Camera className="w-10 h-10 text-purple-500" />
                        </div>
                        <h3 className="text-xl font-semibold text-slate-900 mb-3">No Photos Yet</h3>
                        <p className="text-slate-600 mb-6">Be the first to share a photo with the community!</p>
                        <Link href="/addphoto">
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:shadow-lg transition-all font-medium"
                            >
                                Upload Photo
                            </motion.button>
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {photos.map((photo, index) => (
                            <motion.div
                                key={photo.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"
                            >
                                {/* Header */}
                                <div className="flex items-center justify-between p-4">
                                    <Link 
                                        href={`/profile/${photo.user.id}`}
                                        className="flex items-center gap-3"
                                    >
                                        <UserAvatar user={photo.user} size="lg" />
                                        <div>
                                            <p className="font-semibold text-slate-900">{photo.user.name}</p>
                                            <p className="text-sm text-slate-500">
                                                @{photo.user.username}
                                            </p>
                                        </div>
                                    </Link>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-slate-500">{formatTimeAgo(photo.createdAt)}</span>
                                        <button className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                                            <MoreHorizontal className="w-5 h-5 text-slate-600" />
                                        </button>
                                    </div>
                                </div>

                                {/* Photo */}
                                <div className="relative">
                                    <img 
                                        src={photo.url} 
                                        alt={photo.title || 'Photo'}
                                        className="w-full h-auto max-h-[600px] object-cover"
                                        loading="lazy"
                                    />
                                </div>

                                {/* Actions */}
                                <div className="p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-4">
                                            <motion.button
                                                whileHover={{ scale: 1.1 }}
                                                whileTap={{ scale: 0.9 }}
                                                onClick={() => handleLike(photo)}
                                                disabled={interactionLoading}
                                                className="flex items-center gap-2 disabled:opacity-50"
                                            >
                                                <Heart 
                                                    className={`w-6 h-6 transition-all duration-200 ${
                                                        getIsLiked(photo)
                                                            ? 'fill-red-500 text-red-500 scale-110' 
                                                            : 'text-slate-600 hover:text-red-500'
                                                    }`} 
                                                />
                                            </motion.button>
                                            <motion.button
                                                whileHover={{ scale: 1.1 }}
                                                whileTap={{ scale: 0.9 }}
                                                onClick={() => handleShowComments(photo.id)}
                                                className="flex items-center gap-2"
                                            >
                                                <MessageCircle className="w-6 h-6 text-slate-600 hover:text-purple-500 transition-colors" />
                                            </motion.button>
                                            <motion.button
                                                whileHover={{ scale: 1.1 }}
                                                whileTap={{ scale: 0.9 }}
                                                className="flex items-center gap-2"
                                            >
                                                <Send className="w-6 h-6 text-slate-600 hover:text-green-500 transition-colors" />
                                            </motion.button>
                                        </div>
                                        <motion.button
                                            whileHover={{ scale: 1.1 }}
                                            whileTap={{ scale: 0.9 }}
                                            className="flex items-center gap-2"
                                        >
                                            <Bookmark className="w-6 h-6 text-slate-600 hover:text-yellow-500 transition-colors" />
                                        </motion.button>
                                    </div>

                                    {/* Like count */}
                                    <div className="mb-2">
                                        <p className="font-semibold text-slate-900">
                                            {(photo.likeCount || 0).toLocaleString()} {(photo.likeCount || 0) === 1 ? 'like' : 'likes'}
                                        </p>
                                    </div>

                                    {/* Caption */}
                                    {(photo.title || photo.description) && (
                                        <div className="mb-2">
                                            <span className="font-semibold text-slate-900">{photo.user.username}</span>
                                            <span className="text-slate-700 ml-2">
                                                {photo.title && <span className="font-medium">{photo.title}</span>}
                                                {photo.title && photo.description && ' - '}
                                                {photo.description}
                                            </span>
                                        </div>
                                    )}

                                    {/* View comments */}
                                    {(photo.commentCount || 0) > 0 && (
                                        <button 
                                            onClick={() => handleShowComments(photo.id)}
                                            className="text-slate-500 hover:text-slate-700 text-sm mb-3 transition-colors"
                                        >
                                            View all {photo.commentCount || 0} comments
                                        </button>
                                    )}

                                    {/* Comments Section */}
                                    <AnimatePresence>
                                        {showComments[photo.id] && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="space-y-3 mb-4 max-h-96 overflow-y-auto"
                                            >
                                                {photoComments[photo.id]?.map((comment) => (
                                                    <div key={comment.id} className="space-y-2">
                                                        {/* Main Comment */}
                                                        <div className="flex items-start gap-3 group relative">
                                                            <UserAvatar user={comment.user} size="sm" />
                                                            <div className="flex-1 min-w-0">
                                                                <div className="bg-slate-50 rounded-2xl px-3 py-2">
                                                                    <p className="text-sm font-semibold text-slate-900 mb-1">
                                                                        {comment.user.username}
                                                                    </p>
                                                                    <p className="text-sm text-slate-700">
                                                                        {getCommentText(comment)}
                                                                    </p>
                                                                </div>
                                                                <div className="flex items-center gap-4 mt-1 px-3">
                                                                    <span className="text-xs text-slate-500">
                                                                        {formatTimeAgo(comment.createdAt)}
                                                                    </span>
                                                                    <button
                                                                        onClick={() => startReply(comment.id)}
                                                                        className="text-xs font-semibold text-slate-500 hover:text-slate-700"
                                                                    >
                                                                        Reply
                                                                    </button>
                                                                    {(comment.replyCount || 0) > 0 && (
                                                                        <button
                                                                            onClick={() => setShowReplies(prev => ({ 
                                                                                ...prev, 
                                                                                [comment.id]: !prev[comment.id] 
                                                                            }))}
                                                                            className="text-xs font-semibold text-purple-600 hover:text-purple-700"
                                                                        >
                                                                            {showReplies[comment.id] ? 'Hide' : 'View'} replies ({comment.replyCount || 0})
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            
                                                            {/* Desktop Delete Button */}
                                                            {canDeleteComment(comment, photo.userId || photo.user?.id) && (
                                                                <div className="flex items-center">
                                                                    {/* Mobile Menu Button (visible on small screens) */}
                                                                    <button
                                                                        onClick={() => setShowMobileMenu(prev => ({ 
                                                                            ...prev, 
                                                                            [comment.id]: !prev[comment.id] 
                                                                        }))}
                                                                        className="sm:hidden p-1 hover:bg-slate-100 rounded-full transition-all"
                                                                    >
                                                                        <MoreHorizontal className="w-4 h-4 text-slate-500" />
                                                                    </button>
                                                                    
                                                                    {/* Desktop Delete Button (hidden on small screens) */}
                                                                    <button
                                                                        onClick={() => setShowDeleteConfirm(comment.id)}
                                                                        className="hidden sm:block opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded-full transition-all"
                                                                    >
                                                                        <Trash2 className="w-4 h-4 text-red-500" />
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Mobile Menu Dropdown */}
                                                        {showMobileMenu[comment.id] && canDeleteComment(comment, photo.userId || photo.user?.id) && (
                                                            <motion.div
                                                                initial={{ opacity: 0, scale: 0.95 }}
                                                                animate={{ opacity: 1, scale: 1 }}
                                                                className="ml-9 bg-white border border-slate-200 rounded-lg shadow-lg p-2 max-w-xs sm:hidden"
                                                            >
                                                                <button
                                                                    onClick={() => {
                                                                        setShowDeleteConfirm(comment.id)
                                                                        setShowMobileMenu({})
                                                                    }}
                                                                    className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded flex items-center gap-2"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                    Delete comment
                                                                </button>
                                                                <button
                                                                    onClick={() => setShowMobileMenu({})}
                                                                    className="w-full text-left px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded flex items-center gap-2"
                                                                >
                                                                    <X className="w-4 h-4" />
                                                                    Cancel
                                                                </button>
                                                            </motion.div>
                                                        )}

                                                        {/* Delete Confirmation */}
                                                        {showDeleteConfirm === comment.id && (
                                                            <motion.div
                                                                initial={{ opacity: 0, scale: 0.9 }}
                                                                animate={{ opacity: 1, scale: 1 }}
                                                                className="ml-9 bg-red-50 border border-red-200 rounded-lg p-3"
                                                            >
                                                                <p className="text-sm text-red-800 mb-3">Delete this comment?</p>
                                                                <div className="flex gap-2">
                                                                    <button
                                                                        onClick={() => handleDeleteComment(photo.id, comment.id)}
                                                                        disabled={interactionLoading}
                                                                        className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50 transition-colors"
                                                                    >
                                                                        {interactionLoading ? 'Deleting...' : 'Delete'}
                                                                    </button>
                                                                    <button
                                                                        onClick={() => setShowDeleteConfirm(null)}
                                                                        className="px-3 py-1 bg-gray-200 text-gray-800 text-sm rounded hover:bg-gray-300 transition-colors"
                                                                    >
                                                                        Cancel
                                                                    </button>
                                                                </div>
                                                            </motion.div>
                                                        )}

                                                        {/* Replies */}
                                                        <AnimatePresence>
                                                            {showReplies[comment.id] && (
                                                                <motion.div
                                                                    initial={{ opacity: 0, height: 0 }}
                                                                    animate={{ opacity: 1, height: 'auto' }}
                                                                    exit={{ opacity: 0, height: 0 }}
                                                                    className="ml-9 space-y-2"
                                                                >
                                                                    {comment.replies?.map((reply) => (
                                                                        <div key={reply.id} className="flex items-start gap-3">
                                                                            <UserAvatar user={reply.user} size="sm" />
                                                                            <div className="flex-1 min-w-0">
                                                                                <div className="bg-slate-50 rounded-2xl px-3 py-2">
                                                                                    <p className="text-sm font-semibold text-slate-900 mb-1">
                                                                                        {reply.user.username}
                                                                                    </p>
                                                                                    <p className="text-sm text-slate-700">
                                                                                        {reply.content || reply.text || ''}
                                                                                    </p>
                                                                                </div>
                                                                                <div className="px-3 mt-1">
                                                                                    <span className="text-xs text-slate-500">
                                                                                        {formatTimeAgo(reply.createdAt)}
                                                                                    </span>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </motion.div>
                                                            )}
                                                        </AnimatePresence>

                                                        {/* Reply Input */}
                                                        {replyingTo === comment.id && clerkUser && (
                                                            <motion.div
                                                                initial={{ opacity: 0, height: 0 }}
                                                                animate={{ opacity: 1, height: 'auto' }}
                                                                className="ml-6 flex items-center gap-2"
                                                            >
                                                                <UserAvatar user={{
                                                                    name: clerkUser.fullName || 'User',
                                                                    avatar: clerkUser.imageUrl
                                                                }} size="sm" />
                                                                <div className="flex-1 flex gap-2">
                                                                    <input
                                                                        type="text"
                                                                        value={replyText}
                                                                        onChange={(e) => setReplyText(e.target.value)}
                                                                        placeholder={`Reply to ${comment.user.username}...`}
                                                                        className="flex-1 text-sm border border-slate-200 rounded-full px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === 'Enter') {
                                                                                handleAddReply(photo.id, comment.id)
                                                                            }
                                                                        }}
                                                                        autoFocus
                                                                    />
                                                                    <button
                                                                        onClick={cancelReply}
                                                                        className="p-2 text-slate-400 hover:text-slate-600"
                                                                    >
                                                                        <X className="w-4 h-4" />
                                                                    </button>
                                                                    {replyText.trim() && (
                                                                        <button
                                                                            onClick={() => handleAddReply(photo.id, comment.id)}
                                                                            disabled={interactionLoading}
                                                                            className="text-purple-600 hover:text-purple-700 font-semibold text-sm transition-colors px-2 disabled:opacity-50"
                                                                        >
                                                                            Post
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </motion.div>
                                                        )}
                                                    </div>
                                                ))}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {/* Add comment */}
                                    {clerkUser && (
                                        <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
                                            <UserAvatar user={{
                                                name: clerkUser.fullName || 'User',
                                                avatar: clerkUser.imageUrl
                                            }} />
                                            <div className="flex-1 flex gap-2">
                                                <input
                                                    type="text"
                                                    value={newComment}
                                                    onChange={(e) => setNewComment(e.target.value)}
                                                    placeholder="Add a comment..."
                                                    className="flex-1 text-sm border-none outline-none placeholder-slate-500 bg-slate-50 rounded-full px-4 py-2 focus:bg-white focus:ring-2 focus:ring-purple-500 transition-all"
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            handleAddComment(photo.id)
                                                        }
                                                    }}
                                                />
                                                {newComment.trim() && (
                                                    <button
                                                        onClick={() => handleAddComment(photo.id)}
                                                        disabled={interactionLoading}
                                                        className="text-purple-600 hover:text-purple-700 font-semibold text-sm transition-colors px-2 disabled:opacity-50"
                                                    >
                                                        Post
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        ))}

                        {/* Loading more */}
                        {loadingMore && (
                            <div className="text-center py-8">
                                <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                                <p className="text-slate-600">Loading more photos...</p>
                            </div>
                        )}

                        {/* End of feed */}
                        {!hasMore && photos.length > 0 && (
                            <div className="text-center py-8">
                                <p className="text-slate-500">You've reached the end of your feed!</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}