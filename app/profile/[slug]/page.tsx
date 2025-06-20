'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Camera, MapPin, Calendar, Edit3, Users, Heart, Share2, Settings, Grid, Bookmark, X, MessageCircle, Send, Reply, Trash2, UserPlus, UserMinus } from 'lucide-react'
import { useUser } from '@clerk/nextjs'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import toast from 'react-hot-toast'
import { usePhotoInteractions } from '../../../hooks/usePhotoInteractions'
import { usePhotosState } from '../../../hooks/usePhotosState'
import { useModalState } from '../../../hooks/useModalState'
import { useFollow } from '../../../hooks/useFollow'

interface UserStats {
    photos: number
    likes: number
    followers: number
    following: number
    isFollowing?: boolean
}

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
    user?: any  // Added to match the type expected by usePhotosState
}

interface User {
    id: string
    createdAt: string
    name: string
    username: string
    bio: string
    isPrivate: boolean
    avatar?: string
    email?: string
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

interface FollowUser {
    id: string
    name: string
    username: string
    avatar?: string
    bio?: string
    isFollowing: boolean
    followedAt?: string
}

export default function Page() {
    const { user: clerkUser } = useUser()
    const params = useParams()
    const slug = params.slug as string
    
    const [profileUser, setProfileUser] = useState<User | null>(null)
    const [stats, setStats] = useState<UserStats>({
        photos: 0,
        likes: 0,
        followers: 0,
        following: 0,
        isFollowing: false
    })
    const [activeTab, setActiveTab] = useState<'photos' | 'saved'>('photos')
    const [loading, setLoading] = useState(true)
    const [userNotFound, setUserNotFound] = useState(false)
    const [deletingComment, setDeletingComment] = useState<string | null>(null)
    
    // Follow modal states
    const [showFollowersModal, setShowFollowersModal] = useState(false)
    const [showFollowingModal, setShowFollowingModal] = useState(false)
    const [followers, setFollowers] = useState<FollowUser[]>([])
    const [following, setFollowing] = useState<FollowUser[]>([])
    const [followersPage, setFollowersPage] = useState(1)
    const [followingPage, setFollowingPage] = useState(1)
    const [followersHasMore, setFollowersHasMore] = useState(false)
    const [followingHasMore, setFollowingHasMore] = useState(false)
    const [loadingFollowers, setLoadingFollowers] = useState(false)
    const [loadingFollowing, setLoadingFollowing] = useState(false)

    const isOwnProfile = clerkUser?.id === profileUser?.id

    // Use our custom hooks
    const {
        toggleLike,
        addComment: addCommentAPI,
        addReply: addReplyAPI,
        deleteComment: deleteCommentAPI,
        fetchComments,
        canDeleteComment,
        loading: interactionLoading
    } = usePhotoInteractions()

    const {
        photos,
        comments,
        selectedPhoto,
        updatePhotoLike,
        updatePhotoCommentCount,
        addComment: addCommentToState,
        addReply: addReplyToState,
        removeComment,
        setPhotosData,
        setCommentsData,
        setSelectedPhotoData
    } = usePhotosState()

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

    const {
        toggleFollow,
        getFollowers,
        getFollowing,
        loading: followLoading
    } = useFollow()

    useEffect(() => {
        if (slug) {
            fetchUserData()
        }
    }, [slug])

    const fetchUserData = async () => {
        try {
            setLoading(true)
            setUserNotFound(false)

            // Fetch user profile
            const userResponse = await fetch(`/api/getuserbyid?id=${slug}`)
            if (!userResponse.ok) {
                setUserNotFound(true)
                return
            }
            const userData = await userResponse.json()
            
            setProfileUser(userData.user)

            // Fetch user stats (including follow status)
            const statsResponse = await fetch(`/api/stats?userId=${userData.user.id}`)
            if (statsResponse.ok) {
                const statsData = await statsResponse.json()
                setStats(statsData)
            }

            // Fetch user photos with like status
            const photosResponse = await fetch(`/api/photos?userId=${userData.user.id}`)
            if (photosResponse.ok) {
                const photosData = await photosResponse.json()
                setPhotosData(photosData.photos)
            }
        } catch (error) {
            console.error('Error fetching user data:', error)
            setUserNotFound(true)
            toast.error('Failed to load profile')
        } finally {
            setLoading(false)
        }
    }

    const handleFollow = async () => {
        if (!profileUser) return
        
        const result = await toggleFollow(profileUser.id, stats.isFollowing || false)
        if (result?.success) {
            setStats(prev => ({
                ...prev,
                isFollowing: result.isFollowing,
                followers: result.isFollowing ? prev.followers + 1 : prev.followers - 1
            }))
        }
    }

    const loadFollowers = async (page = 1, reset = false) => {
        if (!profileUser || loadingFollowers) return
        
        setLoadingFollowers(true)
        try {
            const data = await getFollowers(profileUser.id, page)
            if (reset) {
                setFollowers(data.followers)
            } else {
                setFollowers(prev => [...prev, ...data.followers])
            }
            setFollowersHasMore(data.hasMore)
            setFollowersPage(page)
        } catch (error) {
            console.error('Error loading followers:', error)
        } finally {
            setLoadingFollowers(false)
        }
    }

    const loadFollowing = async (page = 1, reset = false) => {
        if (!profileUser || loadingFollowing) return
        
        setLoadingFollowing(true)
        try {
            const data = await getFollowing(profileUser.id, page)
            if (reset) {
                setFollowing(data.following)
            } else {
                setFollowing(prev => [...prev, ...data.following])
            }
            setFollowingHasMore(data.hasMore)
            setFollowingPage(page)
        } catch (error) {
            console.error('Error loading following:', error)
        } finally {
            setLoadingFollowing(false)
        }
    }

    const handleFollowersClick = () => {
        setShowFollowersModal(true)
        loadFollowers(1, true)
    }

    const handleFollowingClick = () => {
        setShowFollowingModal(true)
        loadFollowing(1, true)
    }

    const handleFollowInModal = async (userId: string, currentlyFollowing: boolean) => {
        const result = await toggleFollow(userId, currentlyFollowing)
        if (result?.success) {
            // Update followers list
            setFollowers(prev => prev.map(user => 
                user.id === userId 
                    ? { ...user, isFollowing: result.isFollowing }
                    : user
            ))
            
            // Update following list
            setFollowing(prev => prev.map(user => 
                user.id === userId 
                    ? { ...user, isFollowing: result.isFollowing }
                    : user
            ))

            // Update profile stats if following/unfollowing the profile user
            if (userId === profileUser?.id) {
                setStats(prev => ({
                    ...prev,
                    isFollowing: result.isFollowing,
                    followers: result.isFollowing ? prev.followers + 1 : prev.followers - 1
                }))
            }
        }
    }
    const handlePhotoClick = async (photo: Photo) => {
        // Add user property if it doesn't exist
        const photoWithUser = {
            ...photo,
            user: photo.user || { id: profileUser?.id || '' }
        }
        setSelectedPhotoData(photoWithUser)
        const commentsData = await fetchComments(photo.id)
        setCommentsData(commentsData)
    }

    const handleLike = async (photoId: string) => {
        const result = await toggleLike(photoId)
        if (result?.success) {
            updatePhotoLike(photoId, result.liked)
        }
    }

    const handleComment = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedPhoto || !newComment.trim()) return
        
        const result = await addCommentAPI(selectedPhoto.id, newComment)
        if (result?.success) {
            addCommentToState(result.comment)
            updatePhotoCommentCount(selectedPhoto.id, 1)
            setNewComment('')
        }
    }

    const handleReply = async (e: React.FormEvent, commentId: string) => {
        e.preventDefault()
        if (!replyText.trim()) return
        
        const result = await addReplyAPI(commentId, replyText)
        if (result?.success) {
            addReplyToState(commentId, result.reply)
            updatePhotoCommentCount(selectedPhoto!.id, 1)
            cancelReply()
        }
    }

    const handleDeleteComment = async (commentId: string) => {
        setDeletingComment(commentId)
        const result = await deleteCommentAPI(commentId)
        if (result?.success) {
            removeComment(commentId)
            updatePhotoCommentCount(selectedPhoto!.id, -result.deletedCount)
            setShowDeleteConfirm(null)
        }
        setDeletingComment(null)
    }

    const closeModal = () => {
        setSelectedPhotoData(null)
        setNewComment('')
        cancelReply()
        setShowDeleteConfirm(null)
    }

    const handleShare = async () => {
        if (!profileUser) return
        
        try {
            await navigator.share({
                title: `${profileUser.name || profileUser.username}'s Profile`,
                text: `Check out ${profileUser.name || profileUser.username}'s photography!`,
                url: window.location.href
            })
        } catch (error) {
            // Fallback to copy to clipboard
            await navigator.clipboard.writeText(window.location.href)
            toast.success('Profile link copied to clipboard!')
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-white pt-16 sm:pt-0 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-600 text-sm">Loading profile...</p>
                </div>
            </div>
        )
    }

    if (userNotFound || !profileUser) {
        return (
            <div className="min-h-screen bg-white pt-16 sm:pt-0 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mb-4 mx-auto">
                        <Users className="w-10 h-10 text-gray-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">User not found</h1>
                    <p className="text-gray-600 mb-6">The profile you're looking for doesn't exist or has been removed.</p>
                    <Link href="/">
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="px-6 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
                        >
                            Go Home
                        </motion.button>
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <>
            <div className="min-h-screen bg-white lg:pt-16 max-sm:pt-5 sm:pt-0">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
                    {/* Profile Header - Instagram style */}
                    <motion.section
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="mb-8"
                    >
                        <div className="flex items-start gap-4 sm:gap-8 mb-6">
                            {/* Avatar */}
                            <div className="flex-shrink-0">
                                <div className="w-20 h-20 sm:w-32 sm:h-32 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 p-0.5 sm:p-1">
                                    <div className="w-full h-full rounded-full overflow-hidden bg-white flex items-center justify-center">
                                        {profileUser.avatar ? (
                                            <img 
                                                src={profileUser.avatar} 
                                                alt={profileUser.name || profileUser.username || 'User'}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <span className="text-xl sm:text-3xl font-bold text-gray-600">
                                                {profileUser.name?.charAt(0) || 
                                                 profileUser.username?.charAt(0) || 
                                                 profileUser.email?.charAt(0) || 
                                                 'U'}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Profile Info */}
                            <div className="flex-1 min-w-0">
                                {/* Username and buttons */}
                                <div className="flex items-center gap-3 sm:gap-4 mb-4">
                                    <h1 className="text-xl max-sm:ml-5 sm:text-2xl font-light text-gray-900">
                                        @{profileUser.username || profileUser.email?.split('@')[0] || 'user'}
                                    </h1>
                                    
                                    {/* Desktop buttons */}
                                    <div className="hidden sm:flex items-center gap-2">
                                        {isOwnProfile ? (
                                            <>
                                                <Link href="/settings">
                                                    <motion.button
                                                        whileHover={{ scale: 1.02 }}
                                                        whileTap={{ scale: 0.98 }}
                                                        className="px-4 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-gray-700 font-medium text-sm"
                                                    >
                                                        Edit profile
                                                    </motion.button>
                                                </Link>
                                                <Link href="/settings">
                                                    <motion.button
                                                        whileHover={{ scale: 1.02 }}
                                                        whileTap={{ scale: 0.98 }}
                                                        className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                                                    >
                                                        <Settings className="w-5 h-5 text-gray-700" />
                                                    </motion.button>
                                                </Link>
                                            </>
                                        ) : (
                                            <>
                                                <motion.button
                                                    whileHover={{ scale: 1.02 }}
                                                    whileTap={{ scale: 0.98 }}
                                                    onClick={handleFollow}
                                                    disabled={followLoading}
                                                    className={`px-6 py-1.5 rounded-lg font-medium text-sm transition-all ${
                                                        stats.isFollowing
                                                            ? 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300'
                                                            : 'bg-blue-500 text-white hover:bg-blue-600'
                                                    } ${followLoading ? 'opacity-75 cursor-not-allowed' : ''}`}
                                                >
                                                    {followLoading ? (
                                                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                                    ) : stats.isFollowing ? (
                                                        'Following'
                                                    ) : (
                                                        'Follow'
                                                    )}
                                                </motion.button>

                                                <motion.button
                                                    whileHover={{ scale: 1.02 }}
                                                    whileTap={{ scale: 0.98 }}
                                                    onClick={handleShare}
                                                    className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                                                    title="Share profile"
                                                >
                                                    <Share2 className="w-5 h-5 text-gray-700" />
                                                </motion.button>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Mobile Stats */}
                                <div className="sm:hidden border-gray-200 lg:pt-4">
                                    <div className="flex justify-around">
                                        <div className="text-center">
                                            <div className="text-lg font-semibold text-gray-900">{stats.photos}</div>
                                            <div className="text-xs text-gray-600">posts</div>
                                        </div>
                                        <button 
                                            onClick={handleFollowersClick}
                                            className="text-center hover:text-gray-600 transition-colors"
                                        >
                                            <div className="text-lg font-semibold text-gray-900">
                                                {stats.followers >= 1000 ? `${(stats.followers / 1000).toFixed(1)}k` : stats.followers}
                                            </div>
                                            <div className="text-xs text-gray-600">followers</div>
                                        </button>
                                        <button 
                                            onClick={handleFollowingClick}
                                            className="text-center hover:text-gray-600 transition-colors"
                                        >
                                            <div className="text-lg font-semibold text-gray-900">
                                                {stats.following >= 1000 ? `${(stats.following / 1000).toFixed(1)}k` : stats.following}
                                            </div>
                                            <div className="text-xs text-gray-600">following</div>
                                        </button>
                                    </div>
                                </div>

                                {/* Name and Bio */}
                                <div className="hidden sm:block">
                                    <div className="font-semibold text-gray-900 mb-1">
                                        {profileUser.name || profileUser.username || 'Anonymous User'}
                                    </div>
                                    {profileUser.bio && (
                                        <div className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
                                            {profileUser.bio}
                                        </div>
                                    )}
                                </div>

                                {/* Stats - Desktop */}
                                <div className="hidden sm:flex items-center lg:my-4 gap-8 mb-4">
                                    <div className="text-center">
                                        <div className="text-lg font-semibold text-gray-900">{stats.photos}</div>
                                        <div className="text-sm text-gray-600">posts</div>
                                    </div>
                                    <button 
                                        onClick={handleFollowersClick}
                                        className="text-center cursor-pointer hover:text-gray-600 transition-colors"
                                    >
                                        <div className="text-lg font-semibold text-gray-900">
                                            {stats.followers >= 1000 ? `${(stats.followers / 1000).toFixed(1)}k` : stats.followers}
                                        </div>
                                        <div className="text-sm text-gray-600">followers</div>
                                    </button>
                                    <button 
                                        onClick={handleFollowingClick}
                                        className="text-center cursor-pointer hover:text-gray-600 transition-colors"
                                    >
                                        <div className="text-lg font-semibold text-gray-900">
                                            {stats.following >= 1000 ? `${(stats.following / 1000).toFixed(1)}k` : stats.following}
                                        </div>
                                        <div className="text-sm text-gray-600">following</div>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Mobile Name, Bio and Buttons */}
                        <div className="sm:hidden">
                            <div className="mb-4">
                                <div className="font-semibold text-gray-900 mb-1">
                                    {profileUser.name || profileUser.username || 'Anonymous User'}
                                </div>
                                {profileUser.bio && (
                                    <div className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
                                        {profileUser.bio}
                                    </div>
                                )}
                            </div>
                            
                            <div className="flex gap-2 mb-4">
                                {isOwnProfile ? (
                                    <Link href="/settings" className="flex-1">
                                        <motion.button
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-gray-700 font-medium text-sm"
                                        >
                                            Edit profile
                                        </motion.button>
                                    </Link>
                                ) : (
                                    <>
                                        <motion.button
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={handleFollow}
                                            disabled={followLoading}
                                            className={`flex-1 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                                                stats.isFollowing
                                                    ? 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                                                    : 'bg-blue-500 text-white hover:bg-blue-600'
                                            } ${followLoading ? 'opacity-75 cursor-not-allowed' : ''}`}
                                        >
                                            {followLoading ? (
                                                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mx-auto" />
                                            ) : stats.isFollowing ? (
                                                'Following'
                                            ) : (
                                                'Follow'
                                            )}
                                        </motion.button>
                                        
                                    </>
                                )}
                            </div>
                        </div>
                    </motion.section>

                    {/* Content Tabs */}
                    <motion.section
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.1 }}
                    >
                        {/* Tab Navigation */}
                        <div className="border-t border-gray-200">
                            <div className="flex">
                                <TabButton
                                    active={activeTab === 'photos'}
                                    onClick={() => setActiveTab('photos')}
                                    icon={<Grid className="w-4 h-4" />}
                                    label="POSTS"
                                />
                                {isOwnProfile && (
                                    <TabButton
                                        active={activeTab === 'saved'}
                                        onClick={() => setActiveTab('saved')}
                                        icon={<Bookmark className="w-4 h-4" />}
                                        label="SAVED"
                                    />
                                )}
                            </div>
                        </div>

                        {/* Tab Content */}
                        <div className="py-4">
                            {activeTab === 'photos' ? (
                                photos.length === 0 ? (
                                    <EmptyState
                                        icon={<Camera className="w-16 h-16 text-gray-300 mx-auto" />}
                                        title={isOwnProfile ? "No Posts Yet" : "No posts shared"}
                                        description={
                                            isOwnProfile 
                                                ? "When you share photos, they'll appear on your profile." 
                                                : `${profileUser.name || profileUser.username} hasn't shared any photos yet.`
                                        }
                                        actionLabel={isOwnProfile ? "Share your first photo" : undefined}
                                        actionHref={isOwnProfile ? "/addphoto" : undefined}
                                    />
                                ) : (
                                    <PhotoGrid photos={photos} onPhotoClick={handlePhotoClick} />
                                )
                            ) : (
                                <EmptyState
                                    icon={<Bookmark className="w-16 h-16 text-gray-300 mx-auto" />}
                                    title="No Saved Posts"
                                    description="Save photos and videos to see them here."
                                />
                            )}
                        </div>
                    </motion.section>
                </div>
            </div>

            {/* Photo Modal */}
            <AnimatePresence>
                {selectedPhoto && (
                    <PhotoModal
                        photo={selectedPhoto}
                        comments={comments}
                        newComment={newComment}
                        setNewComment={setNewComment}
                        onClose={closeModal}
                        onLike={() => handleLike(selectedPhoto.id)}
                        onComment={handleComment}
                        isCommenting={interactionLoading}
                        currentUser={clerkUser}
                        replyingTo={replyingTo}
                        setReplyingTo={startReply}
                        replyText={replyText}
                        setReplyText={setReplyText}
                        onReply={handleReply}
                        isReplying={interactionLoading}
                        onDeleteComment={handleDeleteComment}
                        canDeleteComment={(comment) => canDeleteComment(comment, selectedPhoto.userId)}
                        deletingComment={deletingComment}
                        showDeleteConfirm={showDeleteConfirm}
                        setShowDeleteConfirm={setShowDeleteConfirm}
                        cancelReply={cancelReply}
                    />
                )}
            </AnimatePresence>

            {/* Followers Modal */}
            <AnimatePresence>
                {showFollowersModal && (
                    <FollowModal
                        title="Followers"
                        users={followers}
                        onClose={() => setShowFollowersModal(false)}
                        onFollow={handleFollowInModal}
                        hasMore={followersHasMore}
                        onLoadMore={() => loadFollowers(followersPage + 1)}
                        loading={loadingFollowers}
                        currentUserId={clerkUser?.id}
                    />
                )}
            </AnimatePresence>

            {/* Following Modal */}
            <AnimatePresence>
                {showFollowingModal && (
                    <FollowModal
                        title="Following"
                        users={following}
                        onClose={() => setShowFollowingModal(false)}
                        onFollow={handleFollowInModal}
                        hasMore={followingHasMore}
                        onLoadMore={() => loadFollowing(followingPage + 1)}
                        loading={loadingFollowing}
                        currentUserId={clerkUser?.id}
                    />
                )}
            </AnimatePresence>
        </>
    )
}

// PhotoModal Component
const PhotoModal = ({
    photo,
    comments,
    newComment,
    setNewComment,
    onClose,
    onLike,
    onComment,
    isCommenting,
    currentUser,
    replyingTo,
    setReplyingTo,
    replyText,
    setReplyText,
    onReply,
    isReplying,
    onDeleteComment,
    canDeleteComment,
    deletingComment,
    showDeleteConfirm,
    setShowDeleteConfirm,
    cancelReply
}: {
    photo: Photo
    comments: Comment[]
    newComment: string
    setNewComment: (text: string) => void
    onClose: () => void
    onLike: () => void
    onComment: (e: React.FormEvent) => void
    isCommenting: boolean
    currentUser: any
    replyingTo: string | null
    setReplyingTo: (commentId: string) => void
    replyText: string
    setReplyText: (text: string) => void
    onReply: (e: React.FormEvent, commentId: string) => void
    isReplying: boolean
    onDeleteComment: (commentId: string) => void
    canDeleteComment: (comment: Comment) => boolean
    deletingComment: string | null
    showDeleteConfirm: string | null
    setShowDeleteConfirm: (commentId: string | null) => void
    cancelReply: () => void
}) => (
    <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
    >
        <motion.div
            initial={{ scale: 0.8, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, y: 50 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bg-white rounded-2xl overflow-hidden max-w-6xl w-full max-h-[90vh] flex flex-col lg:flex-row shadow-2xl"
            onClick={(e) => e.stopPropagation()}
        >
            {/* Image Section */}
            <div className="flex-1 max-sm:hidden bg-black flex items-center justify-center min-h-[50vh] lg:min-h-auto">
                <img
                    src={photo.url}
                    alt={photo.title || 'Photo'}
                    className="max-w-full max-h-full object-contain"
                />
            </div>

            {/* Info Section */}
            <div className="w-full lg:w-96 flex flex-col max-h-[50vh] lg:max-h-full">
                {/* Header */}
                <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-white">
                    <h3 className="font-semibold text-slate-900 truncate">
                        {photo.title || 'photo'}
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors flex-shrink-0"
                    >
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                {/* Description */}
                {photo.description && (
                    <div className="p-4 border-b border-slate-200 bg-slate-50">
                        <p className="text-slate-700 text-sm leading-relaxed">
                            {photo.description}
                        </p>
                    </div>
                )}

                {/* Actions */}
                <div className="p-4 border-b border-slate-200 bg-white">
                    <div className="flex items-center gap-6">
                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={onLike}
                            className="flex items-center gap-2 group"
                        >
                            <Heart 
                                className={`w-6 h-6 transition-colors ${
                                    photo.isLiked 
                                        ? 'text-red-500 fill-red-500' 
                                        : 'text-slate-400 group-hover:text-red-500'
                                }`} 
                            />
                            <span className="text-sm font-medium text-slate-700">
                                {photo.likeCount}
                            </span>
                        </motion.button>

                        <div className="flex items-center gap-2">
                            <MessageCircle className="w-6 h-6 text-slate-400" />
                            <span className="text-sm font-medium text-slate-700">
                                {photo.commentCount}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Comments */}
                <div className="flex-1 overflow-y-auto bg-white">
                    {comments.length === 0 ? (
                        <div className="p-8 text-center text-slate-500">
                            <MessageCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                            <p className="text-sm">No comments yet</p>
                            <p className="text-xs text-slate-400 mt-1">Be the first to comment!</p>
                        </div>
                    ) : (
                        <div className="p-4 space-y-4">
                            {comments.map((comment: Comment) => (
                                <motion.div
                                    key={comment.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="space-y-3"
                                >
                                    {/* Main Comment */}
                                    <div className="flex gap-3">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                                            {comment.user.avatar ? (
                                                <img 
                                                    src={comment.user.avatar} 
                                                    alt={comment.user.name}
                                                    className="w-full h-full rounded-full object-cover"
                                                />
                                            ) : (
                                                <span className="text-xs font-bold text-white">
                                                    {comment.user.name.charAt(0)}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-medium text-sm text-slate-900">
                                                        {comment.user.name}
                                                    </span>
                                                    <span className="text-xs text-slate-500">
                                                        {new Date(comment.createdAt).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                
                                                {/* Comment Actions */}
                                                {canDeleteComment(comment) && (
                                                    <div className="relative">
                                                        <button
                                                            onClick={() => setShowDeleteConfirm(comment.id)}
                                                            disabled={deletingComment === comment.id}
                                                            className="p-1 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-red-500"
                                                        >
                                                            {deletingComment === comment.id ? (
                                                                <div className="w-3 h-3 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                                                            ) : (
                                                                <Trash2 className="w-3 h-3" />
                                                            )}
                                                        </button>
                                                        
                                                        {/* Delete Confirmation */}
                                                        {showDeleteConfirm === comment.id && (
                                                            <div className="absolute right-0 top-6 bg-white border border-slate-200 rounded-lg shadow-lg p-3 min-w-[200px] z-10">
                                                                <p className="text-sm text-slate-600 mb-3">Delete this comment?</p>
                                                                <div className="flex gap-2">
                                                                    <button
                                                                        onClick={() => onDeleteComment(comment.id)}
                                                                        className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 transition-colors"
                                                                    >
                                                                        Delete
                                                                    </button>
                                                                    <button
                                                                        onClick={() => setShowDeleteConfirm(null)}
                                                                        className="px-3 py-1 bg-slate-100 text-slate-600 rounded text-sm hover:bg-slate-200 transition-colors"
                                                                    >
                                                                        Cancel
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            
                                            <p className="text-sm text-slate-600 leading-relaxed mb-2 break-words">
                                                {comment.text}
                                            </p>
                                            <button
                                                onClick={() => setReplyingTo(comment.id)}
                                                className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1 transition-colors"
                                            >
                                                <Reply className="w-3 h-3" />
                                                Reply
                                            </button>
                                        </div>
                                    </div>

                                    {/* Replies */}
                                    {comment.replies && comment.replies.length > 0 && (
                                        <div className="ml-11 space-y-3">
                                            {comment.replies.map((reply: Comment) => (
                                                <div key={reply.id} className="flex gap-3">
                                                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                                                        {reply.user.avatar ? (
                                                            <img 
                                                                src={reply.user.avatar} 
                                                                alt={reply.user.name}
                                                                className="w-full h-full rounded-full object-cover"
                                                            />
                                                        ) : (
                                                            <span className="text-xs font-bold text-white">
                                                                {reply.user.name.charAt(0)}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-start justify-between">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="font-medium text-sm text-slate-900">
                                                                    {reply.user.name}
                                                                </span>
                                                                <span className="text-xs text-slate-500">
                                                                    {new Date(reply.createdAt).toLocaleDateString()}
                                                                </span>
                                                            </div>
                                                            
                                                            {/* Reply Actions */}
                                                            {canDeleteComment(reply) && (
                                                                <button
                                                                    onClick={() => onDeleteComment(reply.id)}
                                                                    disabled={deletingComment === reply.id}
                                                                    className="p-1 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-red-500"
                                                                >
                                                                    {deletingComment === reply.id ? (
                                                                        <div className="w-3 h-3 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                                                                    ) : (
                                                                        <Trash2 className="w-3 h-3" />
                                                                    )}
                                                                </button>
                                                            )}
                                                        </div>
                                                        
                                                        <p className="text-sm text-slate-600 leading-relaxed break-words">
                                                            {reply.text}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Reply Input */}
                                    {replyingTo === comment.id && (
                                        <div className="ml-11">
                                            <form onSubmit={(e) => onReply(e, comment.id)} className="flex gap-2">
                                                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                                                    {currentUser?.imageUrl ? (
                                                        <img 
                                                            src={currentUser.imageUrl} 
                                                            alt={currentUser.firstName || 'User'}
                                                            className="w-full h-full rounded-full object-cover"
                                                        />
                                                    ) : (
                                                        <span className="text-xs font-bold text-white">
                                                            {currentUser?.firstName?.charAt(0) || 'U'}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex-1 flex gap-2">
                                                    <input
                                                        type="text"
                                                        value={replyText}
                                                        onChange={(e) => setReplyText(e.target.value)}
                                                        placeholder="Write a reply..."
                                                        className="flex-1 px-3 py-1 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                                                        disabled={isReplying}
                                                        autoFocus
                                                    />
                                                    <button
                                                        type="submit"
                                                        disabled={!replyText.trim() || isReplying}
                                                        className="px-3 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-opacity text-sm"
                                                    >
                                                        {isReplying ? (
                                                            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                        ) : (
                                                            <Send className="w-3 h-3" />
                                                        )}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={cancelReply}
                                                        className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-sm hover:bg-slate-200 transition-colors"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            </form>
                                        </div>
                                    )}
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Comment Input */}
                {currentUser && (
                    <form onSubmit={onComment} className="p-4 border-t border-slate-200 bg-white">
                        <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                                {currentUser.imageUrl ? (
                                    <img 
                                        src={currentUser.imageUrl} 
                                        alt={currentUser.firstName || 'User'}
                                        className="w-full h-full rounded-full object-cover"
                                    />
                                ) : (
                                    <span className="text-xs font-bold text-white">
                                        {currentUser.firstName?.charAt(0) || 'U'}
                                    </span>
                                )}
                            </div>
                            <div className="flex-1 flex gap-2">
                                <input
                                    type="text"
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    placeholder="Add a comment..."
                                    className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                                    disabled={isCommenting}
                                />
                                <motion.button
                                    type="submit"
                                    disabled={!newComment.trim() || isCommenting}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                                >
                                    {isCommenting ? (
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <Send className="w-4 h-4" />
                                    )}
                                </motion.button>
                            </div>
                        </div>
                    </form>
                )}
            </div>
        </motion.div>
    </motion.div>
)

// Follow Modal Component
const FollowModal = ({
    title,
    users,
    onClose,
    onFollow,
    hasMore,
    onLoadMore,
    loading,
    currentUserId
}: {
    title: string
    users: FollowUser[]
    onClose: () => void
    onFollow: (userId: string, currentlyFollowing: boolean) => void
    hasMore: boolean
    onLoadMore: () => void
    loading: boolean
    currentUserId?: string
}) => (
    <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
    >
        <motion.div
            initial={{ scale: 0.8, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, y: 50 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bg-white rounded-2xl overflow-hidden max-w-md w-full max-h-[80vh] flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
        >
            {/* Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-white">
                <h3 className="font-semibold text-slate-900 text-lg">{title}</h3>
                <button
                    onClick={onClose}
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                    <X className="w-5 h-5 text-slate-500" />
                </button>
            </div>

            {/* Users List */}
            <div className="flex-1 overflow-y-auto">
                {users.length === 0 ? (
                    <div className="p-8 text-center text-slate-500">
                        <Users className="w-16 h-16 text-slate-300 mx-auto mb-3" />
                        <p className="text-lg font-medium mb-1">No {title.toLowerCase()} yet</p>
                        <p className="text-sm text-slate-400">
                            {title === 'Followers' ? 'No one is following yet' : 'Not following anyone yet'}
                        </p>
                    </div>
                ) : (
                    <div className="p-4 space-y-3">
                        {users.map((user) => (
                            <div key={user.id} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg transition-colors">
                                <Link 
                                    href={`/profile/${user.id}`}
                                    onClick={onClose}
                                    className="flex items-center gap-3 flex-1 min-w-0"
                                >
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                                        {user.avatar ? (
                                            <img 
                                                src={user.avatar} 
                                                alt={user.name}
                                                className="w-full h-full rounded-full object-cover"
                                            />
                                        ) : (
                                            <span className="text-sm font-bold text-white">
                                                {user.name.charAt(0)}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-slate-900 truncate">
                                            {user.name}
                                        </p>
                                        <p className="text-sm text-slate-500 truncate">
                                            @{user.username}
                                        </p>
                                        {user.bio && (
                                            <p className="text-sm text-slate-400 truncate mt-1">
                                                {user.bio}
                                            </p>
                                        )}
                                    </div>
                                </Link>

                                {currentUserId && currentUserId !== user.id && (
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => onFollow(user.id, user.isFollowing)}
                                        className={`px-4 py-1.5 rounded-lg font-medium text-sm transition-all flex-shrink-0 ml-3 ${
                                            user.isFollowing
                                                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
                                                : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:shadow-lg hover:from-purple-600 hover:to-pink-600'
                                        }`}
                                    >
                                        {user.isFollowing ? 'Unfollow' : 'Follow'}
                                    </motion.button>
                                )}
                            </div>
                        ))}

                        {hasMore && (
                            <div className="pt-4">
                                <button
                                    onClick={onLoadMore}
                                    disabled={loading}
                                    className="w-full py-3 text-purple-500 hover:text-purple-600 font-medium disabled:opacity-50 hover:bg-purple-50 rounded-lg transition-colors"
                                >
                                    {loading ? (
                                        <div className="flex items-center justify-center gap-2">
                                            <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                                            Loading...
                                        </div>
                                    ) : (
                                        'Load More'
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </motion.div>
    </motion.div>
)

// StatItem Component with Click Support
const StatItem = ({ 
    value, 
    label, 
    icon, 
    onClick, 
    clickable = false 
}: { 
    value: number
    label: string
    icon: React.ReactNode
    onClick?: () => void
    clickable?: boolean
}) => (
    <motion.div 
        className={`text-center ${clickable ? 'cursor-pointer hover:bg-slate-50 rounded-lg p-3 transition-colors' : 'p-3'}`}
        onClick={clickable ? onClick : undefined}
        whileHover={clickable ? { scale: 1.02 } : undefined}
        whileTap={clickable ? { scale: 0.98 } : undefined}
    >
        <div className="flex items-center justify-center text-slate-400 mb-2">
            {icon}
        </div>
        <div className="text-2xl font-bold text-slate-900 mb-1">
            {value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value}
        </div>
        <div className="text-sm text-slate-500 font-medium">{label}</div>
    </motion.div>
)

// TabButton Component
const TabButton = ({ 
    active, 
    onClick, 
    icon, 
    label, 
    count 
}: { 
    active: boolean
    onClick: () => void
    icon: React.ReactNode
    label: string
    count?: number
}) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-2 px-6 py-4 font-medium transition-all relative ${
            active 
                ? 'text-slate-900 bg-slate-50' 
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
        }`}
    >
        {icon}
        <span>{label}</span>
        {count !== undefined && (
            <span className="text-xs bg-slate-200 px-2 py-1 rounded-full">
                {count}
            </span>
        )}
        {active && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500 to-pink-500" />
        )}
    </button>
)

// EmptyState Component
const EmptyState = ({ 
    icon, 
    title, 
    description, 
    actionLabel, 
    actionHref 
}: { 
    icon: React.ReactNode
    title: string
    description: string
    actionLabel?: string
    actionHref?: string
}) => (
    <div className="text-center py-12">
        <div className="mb-6">
            {icon}
        </div>
        <h3 className="text-xl font-semibold text-slate-700 mb-3">{title}</h3>
        <p className="text-slate-500 mb-8 max-w-md mx-auto leading-relaxed">{description}</p>
        {actionLabel && actionHref && (
            <Link href={actionHref}>
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-300"
                >
                    {actionLabel}
                </motion.button>
            </Link>
        )}
    </div>
)

// PhotoGrid Component
const PhotoGrid = ({ photos, onPhotoClick }: { photos: Photo[]; onPhotoClick: (photo: Photo) => void }) => (
    <div className="grid grid-cols-3 gap-1 sm:gap-2">
        {photos.map((photo, index) => (
            <motion.div
                key={photo.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="group relative aspect-square bg-slate-100 rounded-xl overflow-hidden cursor-pointer shadow-sm hover:shadow-md transition-shadow"
                onClick={() => onPhotoClick(photo)}
            >
                <img
                    src={photo.url}
                    alt={photo.title || 'Photo'}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                />
                
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                <div className="absolute bottom-0 left-0 right-0 p-4 text-white transform translate-y-2 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1">
                                <Heart className={`w-4 h-4 ${photo.isLiked ? 'fill-red-500 text-red-500' : 'text-white'}`} />
                                <span className="text-sm font-medium">{photo.likeCount}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <MessageCircle className="w-4 h-4 text-white" />
                                <span className="text-sm font-medium">{photo.commentCount}</span>
                            </div>
                        </div>
                        {photo.title && (
                            <p className="text-sm font-medium truncate max-w-[120px]">{photo.title}</p>
                        )}
                    </div>
                </div>
            </motion.div>
        ))}
    </div>
)