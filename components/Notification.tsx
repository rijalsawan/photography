'use client'
import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
    Bell, 
    Heart, 
    MessageCircle, 
    UserPlus, 
    AtSign,
    CheckCheck,
    X
} from 'lucide-react'
import { useNotifications } from '@/hooks/useNotifications'
import { Notification } from '@/types/notification'
import Link from 'next/link'

const NotificationDropdown = () => {
    const [isOpen, setIsOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)
    const {
        notifications,
        unreadCount,
        loading,
        hasMore,
        fetchNotifications,
        markAsRead,
        markAllAsRead
    } = useNotifications()

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'like':
                return <Heart className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />
            case 'comment':
            case 'reply':
                return <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
            case 'follow':
                return <UserPlus className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
            case 'mention':
                return <AtSign className="w-4 h-4 sm:w-5 sm:h-5 text-purple-500" />
            default:
                return <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500" />
        }
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

    const handleNotificationClick = (notification: Notification) => {
        if (!notification.isRead) {
            markAsRead(notification.id)
        }
        setIsOpen(false)
        
        window.location.href = "/profile"
    }

    const UserAvatar = ({ user }: { user: any }) => (
        <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-pink-500 p-0.5 flex-shrink-0">
            <div className="w-full h-full rounded-full overflow-hidden bg-white flex items-center justify-center">
                {user?.avatar ? (
                    <img 
                        src={user.avatar} 
                        alt={user.name}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <span className="font-bold text-slate-600 text-xs">
                        {user?.name?.charAt(0)?.toUpperCase() || '?'}
                    </span>
                )}
            </div>
        </div>
    )

    // Loading state component
    const LoadingState = () => (
        <div className="p-6 sm:p-8 text-center">
            <div className="w-8 h-8 sm:w-10 sm:h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-500 text-sm sm:text-base font-medium">Loading notifications...</p>
            <p className="text-slate-400 text-xs sm:text-sm mt-1">Please wait a moment</p>
        </div>
    )

    // Empty state component
    const EmptyState = () => (
        <div className="p-6 sm:p-8 text-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Bell className="w-8 h-8 sm:w-10 sm:h-10 text-purple-400" />
            </div>
            <h4 className="text-slate-900 font-semibold text-sm sm:text-base mb-2">No notifications yet</h4>
            <p className="text-slate-500 text-xs sm:text-sm mb-4">
                We'll notify you when someone likes your photos, follows you, or comments on your posts!
            </p>
            <div className="flex flex-col gap-2 text-xs text-slate-400">
                <div className="flex items-center justify-center gap-2">
                    <Heart className="w-3 h-3 text-red-400" />
                    <span>Photo likes</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                    <MessageCircle className="w-3 h-3 text-blue-400" />
                    <span>Comments & replies</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                    <UserPlus className="w-3 h-3 text-green-400" />
                    <span>New followers</span>
                </div>
            </div>
        </div>
    )

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Icon */}
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-slate-600 hover:text-slate-900 transition-colors"
            >
                <Bell className="w-5 h-5 sm:w-6 sm:h-6" />
                {unreadCount > 0 && (
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center font-bold"
                    >
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </motion.div>
                )}
                
            </motion.button>

            {/* Dropdown */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Mobile Overlay */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black bg-opacity-50 z-50 sm:hidden"
                            onClick={() => setIsOpen(false)}
                        />
                        
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -10 }}
                            className="absolute right-0 bottom-full mt-2 w-80 sm:w-80 max-sm:fixed max-sm:inset-x-4 max-sm:top-16 max-sm:bottom-auto max-sm:w-auto bg-white rounded-xl shadow-xl border border-slate-200 z-50 max-h-96 max-sm:max-h-[80vh] overflow-hidden"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-3 sm:p-4 border-b border-slate-200">
                                <h3 className="font-semibold text-slate-900 text-sm sm:text-base">Notifications</h3>
                                <div className="flex items-center gap-2">
                                    {unreadCount > 0 && (
                                        <button
                                            onClick={markAllAsRead}
                                            className="text-purple-600 hover:text-purple-700 text-xs sm:text-sm font-medium flex items-center gap-1"
                                        >
                                            <CheckCheck className="w-3 h-3 sm:w-4 sm:h-4" />
                                            <span className="hidden sm:inline">Mark all read</span>
                                            <span className="sm:hidden">Mark all</span>
                                        </button>
                                    )}
                                    {/* Close button for mobile */}
                                    <button
                                        onClick={() => setIsOpen(false)}
                                        className="sm:hidden p-1 text-slate-500 hover:text-slate-700"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="max-h-80 max-sm:max-h-[60vh] overflow-y-auto">
                                {loading && notifications.length === 0 ? (
                                    <LoadingState />
                                ) : notifications.length === 0 ? (
                                    <EmptyState />
                                ) : (
                                    <div className="divide-y divide-slate-100">
                                        {notifications.map((notification) => (
                                            <motion.div
                                                key={notification.id}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                className={`p-3 sm:p-4 hover:bg-slate-50 cursor-pointer transition-colors ${
                                                    !notification.isRead ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                                                }`}
                                                onClick={() => handleNotificationClick(notification)}
                                            >
                                                <div className="flex items-start gap-2 sm:gap-3">
                                                    <div className="flex-shrink-0">
                                                        <UserAvatar user={{
                                                            name: notification.data.actionUserName,
                                                            avatar: notification.data.actionUserAvatar
                                                        }} />
                                                    </div>
                                                    
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-start justify-between">
                                                            <div className="flex-1">
                                                                <p className="text-xs sm:text-sm text-slate-900">
                                                                    <span className="font-semibold">
                                                                        {notification.data.actionUserName}
                                                                    </span>
                                                                    <span className="ml-1">
                                                                        {notification.type === 'like' && 'liked your photo'}
                                                                        {notification.type === 'comment' && 'commented on your photo'}
                                                                        {notification.type === 'reply' && 'replied to your comment'}
                                                                        {notification.type === 'follow' && 'started following you'}
                                                                        {notification.type === 'mention' && 'mentioned you'}
                                                                    </span>
                                                                </p>
                                                                <p className="text-xs text-slate-500 mt-1">
                                                                    {formatTimeAgo(notification.createdAt)}
                                                                </p>
                                                            </div>
                                                            
                                                            <div className="flex items-center gap-1 sm:gap-2 ml-2">
                                                                {getNotificationIcon(notification.type)}
                                                                {!notification.isRead && (
                                                                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-500 rounded-full" />
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                )}

                                {/* Load More */}
                                {hasMore && notifications.length > 0 && (
                                    <div className="p-3 sm:p-4 text-center border-t border-slate-200">
                                        <button
                                            onClick={() => fetchNotifications()}
                                            disabled={loading}
                                            className="text-purple-600 hover:text-purple-700 text-xs sm:text-sm font-medium disabled:opacity-50"
                                        >
                                            {loading ? 'Loading...' : 'Load more'}
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="p-2 sm:p-3 border-t border-slate-200 bg-slate-50">
                                <Link 
                                    href="/notifications"
                                    className="text-purple-600 hover:text-purple-700 text-xs sm:text-sm font-medium block text-center"
                                    onClick={() => setIsOpen(false)}
                                >
                                    View all notifications
                                </Link>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    )
}

export default NotificationDropdown