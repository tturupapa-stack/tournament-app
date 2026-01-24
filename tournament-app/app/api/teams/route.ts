import { NextRequest, NextResponse } from 'next/server'
import { updateTeamName } from '@/lib/services/tournament'
import { createClient } from '@/lib/supabase/server'

// GET /api/teams?tournament_id=xxx - Get teams for tournament
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tournamentId = searchParams.get('tournament_id')

    if (!tournamentId) {
      return NextResponse.json({ error: 'tournament_id가 필요합니다' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('teams')
      .select(`
        *,
        team_members (
          *,
          participant:participants (*)
        )
      `)
      .eq('tournament_id', tournamentId)
      .order('created_at', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('GET /api/teams error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// PUT /api/teams - Update team name
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { teamId, name } = body

    if (!teamId || !name) {
      return NextResponse.json({ error: 'teamId와 name이 필요합니다' }, { status: 400 })
    }

    const result = await updateTeamName(teamId, name)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('PUT /api/teams error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
