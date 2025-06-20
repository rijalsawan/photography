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

    const { photoId } = await request.json()

    if (!photoId) {
      return NextResponse.json(
        { error: 'Photo ID is required' },
        { status: 400 }
      )
    }

    // Check if user already liked this photo
    const existingLike = await prisma.like.findUnique({
      where: {
        userId_photoId: {
          userId,
          photoId
        }
      }
    })

    if (existingLike) {
      // Unlike: Remove the like and decrement count
      await Promise.all([
        prisma.like.delete({
          where: {
            id: existingLike.id
          }
        }),
        prisma.photo.update({
          where: { id: photoId },
          data: {
            likeCount: {
              decrement: 1
            }
          }
        })
      ])

      return NextResponse.json({ 
        success: true, 
        liked: false,
        message: 'Photo unliked' 
      })
    } else {
      // Like: Add the like and increment count
      await Promise.all([
        prisma.like.create({
          data: {
            userId,
            photoId
          }
        }),
        prisma.photo.update({
          where: { id: photoId },
          data: {
            likeCount: {
              increment: 1
            }
          }
        })
      ])

      return NextResponse.json({ 
        success: true, 
        liked: true,
        message: 'Photo liked' 
      })
    }

  } catch (error) {
    console.error('Error handling like:', error)
    return NextResponse.json(
      { error: 'Failed to process like' },
      { status: 500 }
    )
  }
}

// Get like status for a photo
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    const { searchParams } = new URL(request.url)
    const photoId = searchParams.get('photoId')

    if (!photoId) {
      return NextResponse.json(
        { error: 'Photo ID is required' },
        { status: 400 }
      )
    }

    let isLiked = false
    if (userId) {
      const like = await prisma.like.findUnique({
        where: {
          userId_photoId: {
            userId,
            photoId
          }
        }
      })
      isLiked = !!like
    }

    return NextResponse.json({ isLiked })

  } catch (error) {
    console.error('Error checking like status:', error)
    return NextResponse.json(
      { error: 'Failed to check like status' },
      { status: 500 }
    )
  }
}