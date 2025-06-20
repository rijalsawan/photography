import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import prisma from '@/lib/prisma'

// Get comments for a photo
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const photoId = searchParams.get('photoId')

    if (!photoId) {
      return NextResponse.json(
        { error: 'Photo ID is required' },
        { status: 400 }
      )
    }

    const comments = await prisma.comment.findMany({
      where: {
        photoId,
        parentId: null // Only get top-level comments for now
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true
          }
        },
        replies: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                username: true,
                avatar: true
              }
            }
          },
          orderBy: {
            createdAt: 'asc'
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Format comments for frontend
    const formattedComments = comments.map(comment => ({
      id: comment.id,
      text: comment.content,
      createdAt: comment.createdAt,
      user: {
        id: comment.user.id,
        name: comment.user.name || comment.user.username || 'Anonymous',
        username: comment.user.username || 'anonymous',
        avatar: comment.user.avatar
      },
      replies: comment.replies.map(reply => ({
        id: reply.id,
        text: reply.content,
        createdAt: reply.createdAt,
        user: {
          id: reply.user.id,
          name: reply.user.name || reply.user.username || 'Anonymous',
          username: reply.user.username || 'anonymous',
          avatar: reply.user.avatar
        }
      }))
    }))

    return NextResponse.json(formattedComments)

  } catch (error) {
    console.error('Error fetching comments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch comments' },
      { status: 500 }
    )
  }
}

// Add a new comment
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { photoId, text, parentId } = await request.json()

    if (!photoId || !text?.trim()) {
      return NextResponse.json(
        { error: 'Photo ID and comment text are required' },
        { status: 400 }
      )
    }

    // Create the comment and increment comment count
    const [comment] = await Promise.all([
      prisma.comment.create({
        data: {
          content: text.trim(),
          userId,
          photoId,
          parentId: parentId || null
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              avatar: true
            }
          }
        }
      }),
      prisma.photo.update({
        where: { id: photoId },
        data: {
          commentCount: {
            increment: 1
          }
        }
      })
    ])

    // Format comment for frontend
    const formattedComment = {
      id: comment.id,
      text: comment.content,
      createdAt: comment.createdAt,
      user: {
        id: comment.user.id,
        name: comment.user.name || comment.user.username || 'Anonymous',
        username: comment.user.username || 'anonymous',
        avatar: comment.user.avatar
      }
    }

    return NextResponse.json(formattedComment, { status: 201 })

  } catch (error) {
    console.error('Error creating comment:', error)
    return NextResponse.json(
      { error: 'Failed to create comment' },
      { status: 500 }
    )
  }
}