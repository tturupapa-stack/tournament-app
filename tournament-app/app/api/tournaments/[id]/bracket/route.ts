import { NextRequest, NextResponse } from 'next/server'
import { generateBracket, updateMatchWinner } from '@/lib/services/tournament'
import { createClient } from '@/lib/supabase/server'

type RouteContext = {
  params: Promise<{ id: string }>
}

// GET /api/tournaments/[id]/bracket - Get bracket matches
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('bracket_matches')
      .select('*')
      .eq('tournament_id', id)
      .order('round', { ascending: true })
      .order('match_order', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('GET /api/tournaments/[id]/bracket error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// POST /api/tournaments/[id]/bracket - Generate bracket
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params
    const result = await generateBracket(id)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      matches: result.matches
    })
  } catch (error) {
    console.error('POST /api/tournaments/[id]/bracket error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// PUT /api/tournaments/[id]/bracket - Update match result
export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const body = await request.json()
    const { matchId, winnerName } = body

    if (!matchId || !winnerName) {
      return NextResponse.json(
        { error: 'matchId와 winnerName이 필요합니다' },
        { status: 400 }
      )
    }

    const result = await updateMatchWinner(matchId, winnerName)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('PUT /api/tournaments/[id]/bracket error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
