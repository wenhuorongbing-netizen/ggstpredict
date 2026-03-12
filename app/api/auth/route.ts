import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = body;

    // Basic validation
    if (!username || username.trim().length < 2) {
      return NextResponse.json({ error: '用户代号至少需要 2 个字符' }, { status: 400 });
    }
    if (!password || password.length < 4) {
      return NextResponse.json({ error: '密钥长度不足（至少 4 位）' }, { status: 400 });
    }

    const trimmedUsername = username.trim();

    // Find user
    let user = await prisma.user.findUnique({
      where: { username: trimmedUsername },
    });

    if (user) {
      if (user.password !== password) {
        return NextResponse.json({ error: '密钥错误，请重新确认' }, { status: 401 });
      }
    } else {
      // Auto-registration
      user = await prisma.user.create({
        data: {
          username: trimmedUsername,
          password,
          points: 1000,
          role: trimmedUsername.toLowerCase() === 'admin' ? 'ADMIN' : 'USER',
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
