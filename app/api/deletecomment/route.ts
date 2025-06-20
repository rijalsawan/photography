import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import prisma from '@/lib/prisma'

export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const commentId = searchParams.get('commentId')

    if (!commentId) {
      return NextResponse.json(
        { error: 'Comment ID is required' },
        { status: 400 }
      )
    }

    // First, get the comment to check ownership and get photoId
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        user: {
          select: { id: true }
        }
      }
    })

    if (!comment) {
      return NextResponse.json(
        { error: 'Comment not found' },
        { status: 404 }
      )
    }

    // Check if user owns the comment or is the photo owner
    const photo = await prisma.photo.findUnique({
      where: { id: comment.photoId },
      select: { userId: true }
    })

    const canDelete = comment.userId === userId || photo?.userId === userId

    if (!canDelete) {
      return NextResponse.json(
        { error: 'You can only delete your own comments or comments on your photos' },
        { status: 403 }
      )
    }

    // Count replies to determine how many comments to subtract
    const replyCount = await prisma.comment.count({
      where: { parentId: commentId }
    })

    // Delete the comment and all its replies
    await Promise.all([
      prisma.comment.deleteMany({
        where: {
          OR: [
            { id: commentId },
            { parentId: commentId }
          ]
        }
      }),
      prisma.photo.update({
        where: { id: comment.photoId },
        data: {
          commentCount: {
            decrement: replyCount + 1 // +1 for the main comment
          }
        }
      })
    ])

    return NextResponse.json({ 
      success: true, 
      message: 'Comment deleted successfully',
      deletedCount: replyCount + 1
    })

  } catch (error) {
    console.error('Error deleting comment:', error)
    return NextResponse.json(
      { error: 'Failed to delete comment' },
      { status: 500 }
    )
  }
}