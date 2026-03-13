import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, inviteCode } = body;

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
      // It's a new user registration, check for a valid invite code
      if (!inviteCode || inviteCode.trim() === "") {
        return NextResponse.json({ error: "需要有效的邀请码 (Invalid Invite Code)" }, { status: 400 });
      }

      const validCode = await prisma.inviteCode.findUnique({
        where: { code: inviteCode.trim() },
      });

      if (!validCode || validCode.used) {
        return NextResponse.json({ error: "需要有效的邀请码 (Invalid Invite Code)" }, { status: 400 });
      }

      // Proceed with Auto-registration
      user = await prisma.$transaction(async (tx) => {
        const randomDisplayName = `Challenger_${Math.floor(Math.random() * 10000)}`;
        const newUser = await tx.user.create({
          data: {
            username: finalUsername,
            displayName: randomDisplayName,
            points: 1000,
            role: finalUsername.toLowerCase() === 'admin' ? 'ADMIN' : 'USER',
          },
        });

        // Mark code as used
        await tx.inviteCode.update({
          where: { id: validCode.id },
          data: {
            used: true,
            usedBy: newUser.id,
          },
        });

        return newUser;
      });
    }

    const { password: _, ...userWithoutPassword } = user;
    return NextResponse.json({ user: userWithoutPassword });

  } catch (error) {
    console.error("Auth Error:", error);
    return NextResponse.json({ error: '数据库连接超时，请检查服务状态' }, { status: 500 });
  }
}
