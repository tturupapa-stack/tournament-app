import { NextRequest, NextResponse } from 'next/server'

// POST /api/admin/login - Admin login
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { password } = body

    const adminPassword = process.env.ADMIN_PASSWORD

    if (!adminPassword) {
      console.error('ADMIN_PASSWORD not set')
      return NextResponse.json({ error: '서버 설정 오류' }, { status: 500 })
    }

    if (password !== adminPassword) {
      return NextResponse.json({ error: '비밀번호가 틀렸습니다' }, { status: 401 })
    }

    // Create response with auth cookie
    const response = NextResponse.json({ success: true })

    response.cookies.set('admin_auth', 'authenticated', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    })

    return response
  } catch (error) {
    console.error('POST /api/admin/login error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// POST /api/admin/logout - Admin logout
export async function DELETE() {
  const response = NextResponse.json({ success: true })
  response.cookies.delete('admin_auth')
  return response
}
