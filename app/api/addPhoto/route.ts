import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
    try {
        const {url} = await request.json();

        if (!url) {
            return NextResponse.json(
                { error: 'Photo URL is required' },
                { status: 400 }
            );
        }

        const photo = await prisma.photo.create({
            data: {
                url,
            },
        });

        return NextResponse.json(photo, { status: 201 });
    } catch (error) {
        console.error('Error adding photo:', error);
        return NextResponse.json(
            { error: 'Failed to add photo' },
            { status: 500 }
        );
    } finally {
        await prisma.$disconnect();
    }
}