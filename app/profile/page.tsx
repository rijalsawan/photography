'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Camera, Users, Heart, Grid, Bookmark, X, MessageCircle, Send, UserMinus, UserPlus } from 'lucide-react'
import { useUser } from '@clerk/nextjs'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { usePhotoInteractions } from '../../hooks/usePhotoInteractions'
import { usePhotosState } from '../../hooks/usePhotosState'
import { useModalState } from '../../hooks/useModalState'
import { useFollow } from '../../hooks/useFollow'

interface UserStats {
    photos: number
    likes: number
    followers: number
    following: number
}

interface Photo {
    id: string
    url: string
    title?: string
    description?: string
    stats?: {
        likeCount: number
        commentCount: number
    }
    createdAt: string
    isLiked?: boolean
    userId: string
    likeCount: number
    commentCount: number
    user?: any
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

interface User {
    id: string
    name?: string
    username?: string
    imageUrl?: string
    createdAt?: string
    bio?: string
}

export default function ProfilePage() {
    const { user: clerkUser, isLoaded } = useUser()
    
    const [stats, setStats] = useState<UserStats>({
        photos: 0,
        likes: 0,
        followers: 0,
        following: 0
    })
    const [activeTab, setActiveTab] = useState<'photos' | 'saved'>('photos')
    const [loading, setLoading] = useState(true)
    const [deletingComment, setDeletingComment] = useState<string | null>(null)
    const [user, setUser] = useState<User | null>(null)

    
    
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
    const [removingUser, setRemovingUser] = useState<string | null>(null)
    const [followActionLoading, setFollowActionLoading] = useState<string | null>(null)

    // Use custom hooks for photo interactions
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
        removeFollower,
        getFollowers,
        getFollowing
    } = useFollow()

    useEffect(() => {
        if (isLoaded && clerkUser) {
            fetchUserData()
            fetchUser()
        }
    }, [isLoaded, clerkUser])


    const fetchUser = async () => {
        if (!clerkUser) return
        try {
            setLoading(true)
            
            // Fetch user profile data
            const userResponse = await fetch(`/api/getuserbyid?id=${clerkUser.id}`)
            if (userResponse.ok) {
                const userData = await userResponse.json()
                
                setUser(userData.user)
            }
        } catch (error) {
            console.error('Error fetching user data:', error)
            toast.error('Failed to load profile data')
        } finally {
            setLoading(false)
        }
    }

    const fetchUserData = async () => {
        if (!clerkUser) return
        
        try {
            setLoading(true)
            
            // Fetch user photos with like status
            const photosResponse = await fetch(`/api/photos?userId=${clerkUser.id}`)
            if (photosResponse.ok) {
                const photosData = await photosResponse.json()
                console.log('Fetched photos:', photosData.photos);
                
                setPhotosData(photosData.photos)
            }

            // Fetch user stats
            const statsResponse = await fetch(`/api/stats?userId=${clerkUser.id}`)
            if (statsResponse.ok) {
                const statsData = await statsResponse.json()
                
                setStats(statsData)
            }
        } catch (error) {
            console.error('Error fetching user data:', error)
            toast.error('Failed to load profile data')
        } finally {
            setLoading(false)
        }
    }

    const handlePhotoClick = async (photo: Photo) => {
        // Add the user property before passing to setSelectedPhotoData
        const photoWithUser = { ...photo, user: { id: photo.userId } }
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
    
    console.log('Handling reply:', { commentId, replyText }) // Debug log
    
    const result = await addReplyAPI(commentId, replyText)
    
    console.log('Reply result:', result) // Debug log
    
    if (result) {
        console.log('Reply successful, updating state') // Debug log
        addReplyToState(commentId, result.reply)
        updatePhotoCommentCount(selectedPhoto!.id, 1)
        cancelReply()
        toast.success('Reply added successfully!')
    } else {
        console.error('Reply failed:', result)
        // Don't show error toast here since it's already shown in addReplyAPI
        // toast.error(result?.error || 'Failed to add reply')
    }
}

    const handleDeleteComment = async (commentId: string) => {
    setDeletingComment(commentId)
    const result = await deleteCommentAPI(commentId)
    if (result?.success) {
        // Use the returned deletedCount from the API
        const deletedCount = result.deletedCount || 1
        removeComment(commentId)
        updatePhotoCommentCount(selectedPhoto!.id, -deletedCount)
        setShowDeleteConfirm(null)
    }
    setDeletingComment(null)
}

    // Follow/Unfollow functionality
    const handleFollowInModal = async (userId: string, currentlyFollowing: boolean) => {
        setFollowActionLoading(userId)
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
        }
        setFollowActionLoading(null)
    }

    const handleRemoveFollower = async (userId: string) => {
        setRemovingUser(userId)
        const result = await removeFollower(userId)
        if (result?.success) {
            // Remove from followers list
            setFollowers(prev => prev.filter(user => user.id !== userId))
            // Update stats
            setStats(prev => ({
                ...prev,
                followers: prev.followers - 1
            }))
        }
        setRemovingUser(null)
    }

    const handleUnfollow = async (userId: string) => {
        setFollowActionLoading(userId)
        const result = await toggleFollow(userId, true) // true means currently following
        if (result?.success) {
            // Remove from following list
            setFollowing(prev => prev.filter(user => user.id !== userId))
            // Update stats
            setStats(prev => ({
                ...prev,
                following: prev.following - 1
            }))
        }
        setFollowActionLoading(null)
    }

    // Load followers/following
    const loadFollowers = async (page = 1, reset = false) => {
        if (!clerkUser || loadingFollowers) return
        
        setLoadingFollowers(true)
        try {
            const data = await getFollowers(clerkUser.id, page)
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
        if (!clerkUser || loadingFollowing) return
        
        setLoadingFollowing(true)
        try {
            const data = await getFollowing(clerkUser.id, page)
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

    const closeModal = () => {
        setSelectedPhotoData(null)
        setNewComment('')
        cancelReply()
        setShowDeleteConfirm(null)
    }

    // Loading states
    if (!isLoaded) {
        return (
            <div className="min-h-screen bg-white pt-16 sm:pt-0 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-600 text-sm">Loading...</p>
                </div>
            </div>
        )
    }

    if (!clerkUser) {
        return (
            <div className="min-h-screen bg-white pt-16 sm:pt-0 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-600 text-sm">Please login to see profile</p>
                </div>
            </div>
        )
    }

    return (
        <>
            <div className="min-h-screen bg-white lg:pt-16 max-sm:pt-16 sm:pt-0">
                

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
                                        {clerkUser.imageUrl ? (
                                            <img 
                                                src={clerkUser.imageUrl} 
                                                alt={clerkUser.fullName || clerkUser.username || 'User'}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <span className="text-xl sm:text-3xl font-bold text-gray-600">
                                                {clerkUser.firstName?.charAt(0) || 
                                                 clerkUser.username?.charAt(0) || 
                                                 clerkUser.emailAddresses[0]?.emailAddress.charAt(0) || 
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
                                        @{user?.username}
                                    </h1>
                                    
                                    
                                    {/* Desktop buttons */}
                                    <div className="hidden sm:flex items-center gap-2">
                                        <Link href="/settings">
                                            <motion.button
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                                className="px-4 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-gray-700 font-medium text-sm"
                                            >
                                                Edit profile
                                            </motion.button>
                                        </Link>
                                        
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
                                    <div className="font-semibold text-gray-900 mb-1">{user?.name}</div>
                                    {user?.bio && (
                                        <div className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
                                            {user.bio}
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
                                <div className="font-semibold text-gray-900 mb-1">{user?.name}</div>
                                {user?.bio && (
                                    <div className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
                                        {user.bio}
                                    </div>
                                )}
                            </div>
                            
                            <div className="flex gap-2 mb-4">
                                <Link href="/settings" className="flex-1">
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-gray-700 font-medium text-sm"
                                    >
                                        Edit profile
                                    </motion.button>
                                </Link>
                                
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
                                <TabButton
                                    active={activeTab === 'saved'}
                                    onClick={() => setActiveTab('saved')}
                                    icon={<Bookmark className="w-4 h-4" />}
                                    label="SAVED"
                                />
                            </div>
                        </div>

                        {/* Tab Content */}
                        <div className="py-4">
                            {loading ? (
                                <div className="flex items-center justify-center py-12">
                                    <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
                                </div>
                            ) : activeTab === 'photos' ? (
                                photos.length === 0 ? (
                                    <EmptyState
                                        icon={<Camera className="w-16 h-16 text-gray-300 mx-auto" />}
                                        title="No Posts Yet"
                                        description="When you share photos, they'll appear on your profile."
                                        actionLabel="Share your first photo"
                                        actionHref="/addphoto"
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
                    <OwnFollowModal
                        title="Followers"
                        users={followers}
                        onClose={() => setShowFollowersModal(false)}
                        onFollow={handleFollowInModal}
                        onRemove={handleRemoveFollower}
                        hasMore={followersHasMore}
                        onLoadMore={() => loadFollowers(followersPage + 1)}
                        loading={loadingFollowers}
                        removingUser={removingUser}
                        followActionLoading={followActionLoading}
                        modalType="followers"
                    />
                )}
            </AnimatePresence>

            {/* Following Modal */}
            <AnimatePresence>
                {showFollowingModal && (
                    <OwnFollowModal
                        title="Following"
                        users={following}
                        onClose={() => setShowFollowingModal(false)}
                        onFollow={handleFollowInModal}
                        onRemove={handleUnfollow}
                        hasMore={followingHasMore}
                        onLoadMore={() => loadFollowing(followingPage + 1)}
                        loading={loadingFollowing}
                        removingUser={removingUser}
                        followActionLoading={followActionLoading}
                        modalType="following"
                    />
                )}
            </AnimatePresence>
        </>
    )
}

// TabButton Component - Instagram style
const TabButton = ({ 
    active, 
    onClick, 
    icon, 
    label
}: { 
    active: boolean
    onClick: () => void
    icon: React.ReactNode
    label: string
}) => (
    <button
        onClick={onClick}
        className={`flex items-center justify-center gap-2 px-4 py-3 font-medium transition-all relative flex-1 text-xs tracking-wider ${
            active 
                ? 'text-gray-900 border-t border-gray-900' 
                : 'text-gray-400 hover:text-gray-600'
        }`}
    >
        {icon}
        <span className="hidden sm:inline">{label}</span>
    </button>
)

// EmptyState Component - Instagram style
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
    <div className="text-center py-12 px-4">
        <div className="mb-4">
            {icon}
        </div>
        <h3 className="text-2xl font-light text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-500 mb-6 max-w-md mx-auto">{description}</p>
        {actionLabel && actionHref && (
            <Link href={actionHref}>
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="px-6 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
                >
                    {actionLabel}
                </motion.button>
            </Link>
        )}
    </div>
)

// PhotoGrid Component - Instagram style
const PhotoGrid = ({ photos, onPhotoClick }: { photos: Photo[]; onPhotoClick: (photo: Photo) => void }) => {
    console.log('PhotoGrid photos:', photos) // Debug log
    
    if (!photos || !Array.isArray(photos)) {
        return (
            <div className="text-center py-16">
                <Camera className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 font-medium mb-2">No photos to display</p>
            </div>
        )
    }

    return (
        <div className="grid grid-cols-3 gap-1 sm:gap-2">
            {photos.map((photo, index) => (
                <motion.div
                    key={photo.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className="group relative aspect-square bg-gray-100 overflow-hidden cursor-pointer"
                    onClick={() => onPhotoClick(photo)}
                >
                    <img
                        src={photo.url}
                        alt={photo.title || 'Photo'}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                        <div className="flex items-center gap-4 text-white">
                            <div className="flex items-center gap-2">
                                <Heart className={`w-5 h-5 ${photo.isLiked ? 'fill-white' : ''}`} />
                                <span className="font-semibold">
                                    {photo.stats?.likeCount || photo.likeCount || 0}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <MessageCircle className="w-5 h-5" />
                                <span className="font-semibold">
                                    {photo.stats?.commentCount || photo.commentCount || 0}
                                </span>
                            </div>
                        </div>
                    </div>
                </motion.div>
            ))}
        </div>
    )
}

// Keep the existing OwnFollowModal and PhotoModal components with minor styling updates
const OwnFollowModal = ({
    title,
    users,
    onClose,
    onFollow,
    onRemove,
    hasMore,
    onLoadMore,
    loading,
    removingUser,
    followActionLoading,
    modalType
}: {
    title: string
    users: FollowUser[]
    onClose: () => void
    onFollow: (userId: string, currentlyFollowing: boolean) => void
    onRemove: (userId: string) => void
    hasMore: boolean
    onLoadMore: () => void
    loading: boolean
    removingUser: string | null
    followActionLoading: string | null
    modalType: 'followers' | 'following'
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
            className="bg-white rounded-2xl overflow-hidden max-w-sm w-full max-h-[70vh] flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
        >
            {/* Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-white">
                <h3 className="font-semibold text-gray-900 text-base">{title}</h3>
                <button
                    onClick={onClose}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                    <X className="w-5 h-5 text-gray-500" />
                </button>
            </div>

            {/* Users List */}
            <div className="flex-1 overflow-y-auto">
                {users.length === 0 && !loading ? (
                    <div className="p-8 text-center text-gray-500">
                        <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="font-medium mb-2">No {title.toLowerCase()} yet</p>
                        <p className="text-sm text-gray-400">
                            {modalType === 'followers' ? 'No one is following you yet' : 'You are not following anyone yet'}
                        </p>
                    </div>
                ) : (
                    <div className="p-2 space-y-1">
                        {users.map((user) => (
                            <div key={user.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
                                <Link 
                                    href={`/profile/${user.id}`}
                                    onClick={onClose}
                                    className="flex items-center gap-3 flex-1 min-w-0"
                                >
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
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
                                        <p className="font-semibold text-gray-900 truncate text-sm">
                                            {user.name}
                                        </p>
                                        <p className="text-sm text-gray-500 truncate">
                                            @{user.username}
                                        </p>
                                        {user.bio && (
                                            <p className="text-sm text-gray-400 truncate mt-1">
                                                {user.bio}
                                            </p>
                                        )}
                                    </div>
                                </Link>

                                <div className="flex items-center gap-2 ml-3"></div>
                                <div className="flex items-center gap-2 ml-3">
                                    {/* Remove/Unfollow Button */}
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => onRemove(user.id)}
                                        disabled={removingUser === user.id}
                                        className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg font-medium text-sm transition-colors border border-red-200 flex items-center gap-2"
                                        title={modalType === 'followers' ? 'Remove follower' : 'Unfollow'}
                                    >
                                        {removingUser === user.id ? (
                                            <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                            <>
                                                <UserMinus className="w-4 h-4" />
                                                <span>{modalType === 'followers' ? 'Remove' : 'Unfollow'}</span>
                                            </>
                                        )}
                                    </motion.button>

                                    {/* Follow Back Button */}
                                    {modalType === 'followers' && !user.isFollowing && (
                                        <motion.button
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => onFollow(user.id, false)}
                                            disabled={followActionLoading === user.id}
                                            className="px-3 py-1.5 bg-blue-500 text-white rounded-lg font-medium text-sm transition-all hover:bg-blue-600 flex items-center gap-2"
                                        >
                                            {followActionLoading === user.id ? (
                                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            ) : (
                                                <>
                                                    <UserPlus className="w-4 h-4" />
                                                    <span>Follow</span>
                                                </>
                                            )}
                                        </motion.button>
                                    )}
                                </div>
                            </div>
                        ))}

                        {hasMore && (
                            <div className="pt-4">
                                <button
                                    onClick={onLoadMore}
                                    disabled={loading}
                                    className="w-full py-3 text-blue-500 hover:text-blue-600 font-medium disabled:opacity-50 hover:bg-blue-50 rounded-lg transition-colors"
                                >
                                    {loading ? (
                                        <div className="flex items-center justify-center gap-2">
                                            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
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

// PhotoModal Component - Instagram style
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
    setNewComment: (value: string) => void
    onClose: () => void
    onLike: () => void
    onComment: (e: React.FormEvent) => void
    isCommenting: boolean
    currentUser: any
    replyingTo: string | null
    setReplyingTo: (id: string) => void
    replyText: string
    setReplyText: (text: string) => void
    onReply: (e: React.FormEvent, commentId: string) => void
    isReplying: boolean
    onDeleteComment: (commentId: string) => void
    canDeleteComment: (comment: Comment) => boolean
    deletingComment: string | null
    showDeleteConfirm: string | null
    setShowDeleteConfirm: (id: string | null) => void
    cancelReply: () => void
}) => (
    <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
        onClick={onClose}
    >
        <motion.div
            initial={{ scale: 0.8, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, y: 50 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bg-white rounded-2xl overflow-hidden max-w-6xl w-full max-h-[95vh] flex flex-col lg:flex-row shadow-2xl m-4"
            onClick={(e) => e.stopPropagation()}
        >
            {/* Image Section */}
            <div className="flex-1 max-sm:hidden bg-black flex items-center justify-center min-h-[300px] lg:min-h-[600px]">
                <img
                    src={photo.url}
                    alt={photo.title || 'Photo'}
                    className="max-w-full max-h-full object-contain"
                />
            </div>

            {/* Comments Section */}
            <div className="w-full lg:w-96 flex flex-col bg-white">
                {/* Header */}
                <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">
                            {photo.title || 'Photo'}
                        </h3>
                        {photo.description && (
                            <p className="text-gray-600 text-sm mt-1 line-clamp-2">
                                {photo.description}
                            </p>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors ml-4"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Actions */}
                <div className="p-4 border-b border-gray-200">
                    <div className="flex items-center gap-6">
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={onLike}
                            className="flex items-center gap-2 group"
                        >
                            <Heart 
                                className={`w-6 h-6 transition-colors ${
                                    photo.isLiked 
                                        ? 'text-red-500 fill-red-500' 
                                        : 'text-gray-400 group-hover:text-red-500'
                                }`} 
                            />
                            <span className="text-sm font-semibold text-gray-700">
                                {photo.likeCount}
                            </span>
                        </motion.button>

                        <div className="flex items-center gap-2">
                            <MessageCircle className="w-6 h-6 text-gray-400" />
                            <span className="text-sm font-semibold text-gray-700">
                                {photo.commentCount}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Comments List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {comments.length === 0 ? (
                        <div className="text-center py-8">
                            <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500 font-medium">No comments yet</p>
                            <p className="text-sm text-gray-400">Be the first to comment!</p>
                        </div>
                    ) : (
                        comments.map((comment) => (
                            <div key={comment.id} className="space-y-3">
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
                                        <div className="bg-gray-50 rounded-2xl p-3">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-semibold text-gray-900 text-sm">
                                                    {comment.user.name}
                                                </span>
                                                <span className="text-xs text-gray-500">
                                                    {new Date(comment.createdAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <p className="text-gray-700 text-sm leading-relaxed">
                                                {comment.text}
                                            </p>
                                        </div>
                                        
                                        <div className="flex items-center gap-4 mt-2">
                                            <button
                                                onClick={() => setReplyingTo(comment.id)}
                                                className="text-xs text-gray-500 hover:text-gray-700 font-medium"
                                            >
                                                Reply
                                            </button>
                                            
                                            {canDeleteComment(comment) && (
                                                <button
                                                    onClick={() => setShowDeleteConfirm(comment.id)}
                                                    className="text-xs text-red-500 hover:text-red-700 font-medium"
                                                >
                                                    Delete
                                                </button>
                                            )}
                                        </div>

                                        {/* Reply Form */}
                                        {replyingTo === comment.id && (
                                            <form onSubmit={(e) => onReply(e, comment.id)} className="mt-3">
                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        value={replyText}
                                                        onChange={(e) => setReplyText(e.target.value)}
                                                        placeholder="Write a reply..."
                                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                        autoFocus
                                                    />
                                                    <button
                                                        type="submit"
                                                        disabled={!replyText.trim() || isReplying}
                                                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                                                    >
                                                        {isReplying ? (
                                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                        ) : (
                                                            <Send className="w-4 h-4" />
                                                        )}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={cancelReply}
                                                        className="px-3 py-2 text-gray-500 hover:text-gray-700 text-sm"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            </form>
                                        )}
                                    </div>
                                </div>

                                {/* Replies */}
                                {comment.replies && comment.replies.length > 0 && (
                                    <div className="ml-11 space-y-3">
                                        {comment.replies.map((reply) => (
                                            <div key={reply.id} className="flex gap-3">
                                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
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
                                                    <div className="bg-gray-50 rounded-2xl p-3">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="font-semibold text-gray-900 text-sm">
                                                                {reply.user.name}
                                                            </span>
                                                            <span className="text-xs text-gray-500">
                                                                {new Date(reply.createdAt).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                        <p className="text-gray-700 text-sm leading-relaxed">
                                                            {reply.text}
                                                        </p>
                                                    </div>
                                                    
                                                    {canDeleteComment(reply) && (
                                                        <button
                                                            onClick={() => setShowDeleteConfirm(reply.id)}
                                                            className="text-xs text-red-500 hover:text-red-700 font-medium mt-2"
                                                        >
                                                            Delete
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>

                {/* Comment Input */}
                <form onSubmit={onComment} className="p-4 border-t border-gray-200">
                    <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                            {currentUser?.imageUrl ? (
                                <img 
                                    src={currentUser.imageUrl} 
                                    alt="You"
                                    className="w-full h-full rounded-full object-cover"
                                />
                            ) : (
                                <span className="text-xs font-bold text-white">
                                    {currentUser?.firstName?.charAt(0) || 'U'}
                                </span>
                            )}
                        </div>
                        <div className="flex-1">
                            <input
                                type="text"
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                placeholder="Add a comment..."
                                className="w-full px-4 py-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                disabled={isCommenting}
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={!newComment.trim() || isCommenting}
                            className="px-6 py-3 bg-blue-500 text-white rounded-full hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {isCommenting ? (
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <Send className="w-4 h-4" />
                            )}
                        </button>
                    </div>
                </form>
            </div>

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {showDeleteConfirm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/50 flex items-center justify-center p-4"
                        onClick={() => setShowDeleteConfirm(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.8 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.8 }}
                            className="bg-white rounded-2xl p-6 max-w-sm w-full"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h4 className="font-semibold text-gray-900 mb-2">Delete Comment</h4>
                            <p className="text-gray-600 text-sm mb-4">
                                Are you sure you want to delete this comment? This action cannot be undone.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowDeleteConfirm(null)}
                                    className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => onDeleteComment(showDeleteConfirm)}
                                    disabled={deletingComment === showDeleteConfirm}
                                    className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors"
                                >
                                    {deletingComment === showDeleteConfirm ? (
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                                    ) : (
                                        'Delete'
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    </motion.div>
)
