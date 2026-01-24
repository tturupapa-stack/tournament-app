import { NextRequest, NextResponse } from 'next/server'
import { reopenTournament } from '@/lib/services/tournament'

type RouteContext = {
  params: Promise<{ id: string }>
}

// POST /api/tournaments/[id]/reopen - Reopen tournament
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params
    const result = await reopenTournament(id)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('POST /api/tournaments/[id]/reopen error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
