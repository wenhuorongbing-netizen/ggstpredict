// app/api/auth/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: '请输入账号和密码' }, { status: 400 });
    }

    // 在数据库中查找用户
    let user = await prisma.user.findUnique({
      where: { username },
    });

    if (user) {
      // 用户存在，校验密码
      if (user.password !== password) {
        return NextResponse.json({ error: '密码错误，请重试' }, { status: 401 });
      }
    } else {
      // 用户不存在，直接注册并赠送 1000 积分！
      user = await prisma.user.create({
        data: {
          username,
          password,
          points: 1000,
          // 设定一个管理员账号，比如你的代号叫 admin，这里可以自动赋予权限
          role: username === 'admin' ? 'ADMIN' : 'USER',
        },
      });
    }

    // 登录成功，返回用户信息（安全起见，剔除密码字段）
    const { password: _, ...userWithoutPassword } = user;
    return NextResponse.json({ user: userWithoutPassword });

  } catch (error) {
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}