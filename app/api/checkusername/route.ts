import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@/app/generated/prisma'
import { auth } from '@clerk/nextjs/server'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const username = searchParams.get('username')
        
        if (!username) {
            return NextResponse.json({ error: 'Username required' }, { status: 400 })
        }

        // Get current user to exclude them from the check
        const { userId } = await auth()
        
        // Check if username exists in your database (excluding current user)
        const existingUser = await prisma.user.findFirst({
            where: {
                username: username,
                NOT: {
                    id: userId || ''
                }
            }
        })
        
        const available = !existingUser
        
        return NextResponse.json({ available })
    } catch (error) {
        console.error('Error checking username:', error)
        return NextResponse.json({ error: 'Failed to check username' }, { status: 500 })
    } finally {
        await prisma.$disconnect()
    }
}