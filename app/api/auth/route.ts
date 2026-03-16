import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password, inviteCode } = body;

    const finalUsername = username?.trim();

    if (!finalUsername) {
      return NextResponse.json({ error: "账号不能为空" }, { status: 400 });
    }

    if (!password || password.trim() === "") {
      return NextResponse.json({ error: "密码不能为空" }, { status: 400 });
    }

    // Find user
    let user = await prisma.user.findUnique({
      where: { username: finalUsername },
    });

    if (user) {
      // Case 1: Existing User
      if (user.password && user.password !== password) {
        return NextResponse.json({ error: "账号或密码错误 (Invalid Credentials)" }, { status: 401 });
      }
      // If user exists but has no password (from legacy auto-gen), we should probably allow login or force set password.
      // For MVP, if it matches or is legacy empty, we let them in or check strict match.
      // Strict match is preferred:
      if (user.password !== password && user.password !== null) {
         return NextResponse.json({ error: "账号或密码错误 (Invalid Credentials)" }, { status: 401 });
      }
    } else {
      // Case 2 & 3: New User Registration
      if (!inviteCode || inviteCode.trim() === "") {
        return NextResponse.json({ error: "账号不存在，且邀请码无效 (Invalid Invite Code for new registration)" }, { status: 400 });
      }

      const validCode = await prisma.inviteCode.findUnique({
        where: { code: inviteCode.trim() },
      });

      if (!validCode || validCode.used) {
        return NextResponse.json({ error: "账号不存在，且邀请码无效 (Invalid Invite Code for new registration)" }, { status: 400 });
      }

      // Proceed with Registration
      user = await prisma.$transaction(async (tx) => {
        const randomDisplayName = `Challenger_${Math.floor(Math.random() * 10000)}`;
        const newUser = await tx.user.create({
          data: {
            username: finalUsername,
            password: password,
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

        await tx.adminLog.create({
          data: {
            action: "USER_REGISTER",
            details: `新用户 ${finalUsername} 使用密钥 ${validCode.code} 完成注册`
          }
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
