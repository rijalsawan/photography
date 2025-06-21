import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'

export const useNotifications = () => {
    const [notifications, setNotifications] = useState<any[]>([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [loading, setLoading] = useState(false)
    const [hasMore, setHasMore] = useState(true)
    const [page, setPage] = useState(1)

    const fetchNotifications = useCallback(async (pageNumber = 1, reset = false) => {
        try {
            setLoading(true)
            const response = await fetch(`/api/notification?page=${pageNumber}&limit=20`)
            const result = await response.json()

            if (result.success) {
                if (reset || pageNumber === 1) {
                    setNotifications(result.notifications)
                } else {
                    setNotifications(prev => [...prev, ...result.notifications])
                }
                setUnreadCount(result.unreadCount)
                setHasMore(result.pagination.hasMore)
                setPage(pageNumber)
            } else {
                console.error('Failed to fetch notifications:', result.error)
            }
        } catch (error) {
            console.error('Error fetching notifications:', error)
        } finally {
            setLoading(false)
        }
    }, [])

    const markAsRead = async (notificationId: string) => {
        try {
            const response = await fetch('/api/marksingleread', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notificationId })
            })

            const result = await response.json()

            if (result.success) {
                // Update local state immediately
                setNotifications(prev => prev.map(notification => 
                    notification.id === notificationId 
                        ? { ...notification, isRead: true, readAt: new Date().toISOString() }
                        : notification
                ))
                
                // Update unread count
                setUnreadCount(prev => Math.max(0, prev - 1))
                
                console.log('Notification marked as read')
            } else {
                console.error('Failed to mark notification as read:', result.error)
            }
        } catch (error) {
            console.error('Error marking notification as read:', error)
        }
    }

    const markAllAsRead = async () => {
        try {
            const response = await fetch('/api/markallread', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            })

            const result = await response.json()

            if (result.success) {
                // Update local state immediately
                setNotifications(prev => prev.map(notification => ({
                    ...notification,
                    isRead: true,
                    readAt: new Date().toISOString()
                })))
                
                // Reset unread count
                setUnreadCount(0)
                
                toast.success(`Marked ${result.count} notifications as read`)
            } else {
                console.error('Failed to mark all notifications as read:', result.error)
                toast.error('Failed to mark notifications as read')
            }
        } catch (error) {
            console.error('Error marking all notifications as read:', error)
            toast.error('Failed to mark notifications as read')
        }
    }

    const refreshNotifications = () => {
        fetchNotifications(1, true)
    }

    useEffect(() => {
        fetchNotifications(1, true)
    }, [fetchNotifications])

    return {
        notifications,
        unreadCount,
        loading,
        hasMore,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        refreshNotifications
    }
}