import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { TournamentInsert } from '@/types/database'

// GET /api/tournaments - Get all tournaments
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    let query = supabase
      .from('tournaments')
      .select('*')
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('GET /api/tournaments error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// POST /api/tournaments - Create a new tournament
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    const { name, game, deadline, max_participants, description } = body

    if (!name || !game || !deadline) {
      return NextResponse.json(
        { error: '필수 필드가 누락되었습니다 (name, game, deadline)' },
        { status: 400 }
      )
    }

    const tournamentData: TournamentInsert = {
      name: name.trim(),
      game: game.trim(),
      deadline,
      max_participants: max_participants || 16,
      description: description?.trim() || null,
      status: 'open'
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('tournaments')
      .insert(tournamentData)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('POST /api/tournaments error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
