import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { TournamentUpdate } from '@/types/database'

type RouteContext = {
  params: Promise<{ id: string }>
}

// GET /api/tournaments/[id] - Get tournament details with participants, teams, bracket
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params
    const supabase = await createClient()

    // Get tournament
    const { data: tournament, error: tourError } = await supabase
      .from('tournaments')
      .select('*')
      .eq('id', id)
      .single()

    if (tourError) {
      if (tourError.code === 'PGRST116') {
        return NextResponse.json({ error: '대회를 찾을 수 없습니다' }, { status: 404 })
      }
      return NextResponse.json({ error: tourError.message }, { status: 500 })
    }

    // Get participants
    const { data: participants } = await supabase
      .from('participants')
      .select('*')
      .eq('tournament_id', id)
      .order('created_at', { ascending: true })

    // Get teams with members
    const { data: teams } = await supabase
      .from('teams')
      .select(`
        *,
        team_members (
          *,
          participant:participants (*)
        )
      `)
      .eq('tournament_id', id)
      .order('created_at', { ascending: true })

    // Get bracket matches
    const { data: bracket } = await supabase
      .from('bracket_matches')
      .select('*')
      .eq('tournament_id', id)
      .order('round', { ascending: true })
      .order('match_order', { ascending: true })

    return NextResponse.json({
      ...tournament,
      participants: participants || [],
      teams: teams || [],
      bracket: bracket || []
    })
  } catch (error) {
    console.error('GET /api/tournaments/[id] error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// PUT /api/tournaments/[id] - Update tournament
export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params
    const body = await request.json()

    const updateData: TournamentUpdate = {}

    if (body.name !== undefined) updateData.name = body.name.trim()
    if (body.game !== undefined) updateData.game = body.game.trim()
    if (body.deadline !== undefined) updateData.deadline = body.deadline
    if (body.max_participants !== undefined) updateData.max_participants = body.max_participants
    if (body.description !== undefined) updateData.description = body.description?.trim() || null
    if (body.status !== undefined) updateData.status = body.status

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('tournaments')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: '대회를 찾을 수 없습니다' }, { status: 404 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('PUT /api/tournaments/[id] error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// DELETE /api/tournaments/[id] - Delete tournament
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params
    const supabase = await createClient()

    const { error } = await supabase
      .from('tournaments')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/tournaments/[id] error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
