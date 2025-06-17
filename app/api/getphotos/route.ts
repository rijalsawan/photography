import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
    try {
        const photos = await prisma.photo.findMany();
        return NextResponse.json(photos);
    } catch (error) {
        console.error('Error fetching photos:', error);
        return NextResponse.json(
            { error: 'Failed to fetch photos' },
            { status: 500 }
        );
    } finally {
        await prisma.$disconnect();
    }
}