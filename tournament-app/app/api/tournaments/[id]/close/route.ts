import { NextRequest, NextResponse } from 'next/server'
import { closeTournamentAndCreateTeams } from '@/lib/services/tournament'

type RouteContext = {
  params: Promise<{ id: string }>
}

// POST /api/tournaments/[id]/close - Close tournament and create teams
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params
    const result = await closeTournamentAndCreateTeams(id)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      teams: result.teams
    })
  } catch (error) {
    console.error('POST /api/tournaments/[id]/close error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
