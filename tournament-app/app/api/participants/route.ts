import { NextRequest, NextResponse } from 'next/server'
import { addParticipant, updateParticipantSkill } from '@/lib/services/tournament'
import { createClient } from '@/lib/supabase/server'
import { SKILLS } from '@/lib/constants'

// POST /api/participants - Add participant to tournament
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tournament_id, nickname, skill, profile_image_url, card_image_url } = body

    // Validate required fields
    if (!tournament_id || !nickname || !skill) {
      return NextResponse.json(
        { error: '필수 필드가 누락되었습니다 (tournament_id, nickname, skill)' },
        { status: 400 }
      )
    }

    // Validate nickname length
    const trimmedNickname = nickname.trim()
    if (trimmedNickname.length < 2 || trimmedNickname.length > 20) {
      return NextResponse.json(
        { error: '닉네임은 2-20자 사이여야 합니다' },
        { status: 400 }
      )
    }

    // Validate skill level
    const skillValue = SKILLS[skill]
    if (!skillValue) {
      return NextResponse.json(
        { error: '유효하지 않은 실력 레벨입니다' },
        { status: 400 }
      )
    }

    const result = await addParticipant(tournament_id, {
      nickname: trimmedNickname,
      skill,
      skill_value: skillValue,
      profile_image_url,
      card_image_url
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json(result.participant, { status: 201 })
  } catch (error) {
    console.error('POST /api/participants error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// PUT /api/participants - Update participant skill level
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, skill } = body

    // Validate required fields
    if (!id || !skill) {
      return NextResponse.json(
        { error: 'id와 skill이 필요합니다' },
        { status: 400 }
      )
    }

    // Validate skill level
    const skillValue = SKILLS[skill]
    if (!skillValue) {
      return NextResponse.json(
        { error: '유효하지 않은 실력 레벨입니다. 가능한 값: 루키, 비기너, 아마추어, 세미프로, 프로' },
        { status: 400 }
      )
    }

    // Update participant skill using service layer
    const result = await updateParticipantSkill(id, skill, skillValue)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.errorCode || 400 })
    }

    return NextResponse.json(result.participant, { status: 200 })
  } catch (error) {
    console.error('PUT /api/participants error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// DELETE /api/participants?id=xxx - Delete participant
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'id가 필요합니다' }, { status: 400 })
    }

    const supabase = await createClient()
    const { error } = await supabase
      .from('participants')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/participants error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
