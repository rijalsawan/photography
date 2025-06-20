import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import prisma from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { commentId, text } = await request.json()

    if (!commentId || !text?.trim()) {
      return NextResponse.json(
        { error: 'Comment ID and reply text are required' },
        { status: 400 }
      )
    }

    // First, get the parent comment to find the photoId
    const parentComment = await prisma.comment.findUnique({
      where: { id: commentId },
      select: { photoId: true }
    })

    if (!parentComment) {
      return NextResponse.json(
        { error: 'Parent comment not found' },
        { status: 404 }
      )
    }

    // Create the reply and increment photo comment count
    const [reply] = await Promise.all([
      prisma.comment.create({
        data: {
          content: text.trim(),
          userId,
          photoId: parentComment.photoId,
          parentId: commentId
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
        where: { id: parentComment.photoId },
        data: {
          commentCount: {
            increment: 1
          }
        }
      })
    ])

    // Format reply for frontend
    const formattedReply = {
      id: reply.id,
      text: reply.content,
      createdAt: reply.createdAt,
      user: {
        id: reply.user.id,
        name: reply.user.name || reply.user.username || 'Anonymous',
        username: reply.user.username || 'anonymous',
        avatar: reply.user.avatar
      }
    }

    return NextResponse.json(formattedReply, { status: 201 })

  } catch (error) {
    console.error('Error creating reply:', error)
    return NextResponse.json(
      { error: 'Failed to create reply' },
      { status: 500 }
    )
  }
}