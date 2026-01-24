import { NextRequest, NextResponse } from 'next/server'
import { generatePlayerCard } from '@/lib/services/card'
import { createClient } from '@/lib/supabase/server'
import { SKILLS } from '@/lib/constants'

export const maxDuration = 30 // Vercel function timeout

// POST /api/card/generate - Generate player card
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()

    const profileImage = formData.get('profileImage') as File | null
    const nickname = formData.get('nickname') as string
    const skill = formData.get('skill') as string
    const cardTier = (formData.get('cardTier') as string) || '브론즈'
    const participantId = formData.get('participantId') as string | null
    const tournamentId = formData.get('tournamentId') as string | null

    // Validate required fields
    if (!profileImage || !nickname || !skill) {
      return NextResponse.json(
        { error: '필수 필드가 누락되었습니다 (profileImage, nickname, skill)' },
        { status: 400 }
      )
    }

    const skillValue = SKILLS[skill]
    if (!skillValue) {
      return NextResponse.json(
        { error: '유효하지 않은 실력 레벨입니다' },
        { status: 400 }
      )
    }

    // Convert file to buffer
    const bytes = await profileImage.arrayBuffer()
    const profileBuffer = Buffer.from(bytes)

    // Generate card
    const cardBuffer = await generatePlayerCard(
      profileBuffer,
      cardTier,
      nickname,
      skill,
      skillValue
    )

    // Upload to Supabase Storage if participantId is provided
    if (participantId && tournamentId) {
      const supabase = await createClient()

      // Upload profile image
      const profileFileName = `${tournamentId}/${participantId}_profile.png`
      const { error: profileUploadError } = await supabase.storage
        .from('profiles')
        .upload(profileFileName, profileBuffer, {
          contentType: 'image/png',
          upsert: true
        })

      if (profileUploadError) {
        console.error('Profile upload error:', profileUploadError)
      }

      // Upload card image
      const cardFileName = `${tournamentId}/${participantId}_card.png`
      const { error: cardUploadError } = await supabase.storage
        .from('cards')
        .upload(cardFileName, cardBuffer, {
          contentType: 'image/png',
          upsert: true
        })

      if (cardUploadError) {
        console.error('Card upload error:', cardUploadError)
      }

      // Get public URLs
      const { data: profileUrlData } = supabase.storage
        .from('profiles')
        .getPublicUrl(profileFileName)

      const { data: cardUrlData } = supabase.storage
        .from('cards')
        .getPublicUrl(cardFileName)

      // Update participant with image URLs
      const { error: updateError } = await supabase
        .from('participants')
        .update({
          profile_image_url: profileUrlData.publicUrl,
          card_image_url: cardUrlData.publicUrl
        })
        .eq('id', participantId)

      if (updateError) {
        console.error('Participant update error:', updateError)
      }

      return NextResponse.json({
        success: true,
        profileUrl: profileUrlData.publicUrl,
        cardUrl: cardUrlData.publicUrl
      })
    }

    // Return card as base64 if no storage upload needed
    const cardBase64 = cardBuffer.toString('base64')
    return NextResponse.json({
      success: true,
      cardBase64: `data:image/png;base64,${cardBase64}`
    })
  } catch (error) {
    console.error('POST /api/card/generate error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
