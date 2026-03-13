import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username } = body;

    let finalUsername = username?.trim();

    // If no username provided, auto-generate one
    if (!finalUsername) {
      finalUsername = `GZ-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
    }

    // Find user
    let user = await prisma.user.findUnique({
      where: { username: finalUsername },
    });

    if (!user) {
      // Auto-registration
      const randomDisplayName = `Challenger_${Math.floor(Math.random() * 10000)}`;
      user = await prisma.user.create({
        data: {
          username: finalUsername,
          displayName: randomDisplayName,
          points: 1000,
          role: finalUsername.toLowerCase() === 'admin' ? 'ADMIN' : 'USER',
        },
      });
    }

    const { password: _, ...userWithoutPassword } = user;
    return NextResponse.json({ user: userWithoutPassword });

  } catch (error) {
    console.error("Auth Error:", error);
    return NextResponse.json({ error: '数据库连接超时，请检查服务状态' }, { status: 500 });
  }
}
