import { createClient, createAdminClient } from '@/lib/supabase/server'
import type {
  Tournament,
  TournamentInsert,
  TournamentUpdate,
  Participant,
  Team,
  TeamWithMembers,
  BracketMatch
} from '@/types/database'
import { createBalancedTeams } from '@/lib/utils/team-balancing'
import { JOKER_PARTICIPANT, SKILLS } from '@/lib/constants'

// ===== Tournament CRUD =====

export async function getTournaments(): Promise<Tournament[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tournaments')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function getOpenTournaments(): Promise<Tournament[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tournaments')
    .select('*')
    .eq('status', 'open')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function getTournamentById(id: string): Promise<Tournament | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tournaments')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null // Not found
    throw error
  }
  return data
}

export async function getTournamentWithDetails(id: string): Promise<{
  tournament: Tournament
  participants: Participant[]
  teams: TeamWithMembers[]
  bracket: BracketMatch[]
} | null> {
  const supabase = await createClient()

  // Get tournament
  const { data: tournament, error: tourError } = await supabase
    .from('tournaments')
    .select('*')
    .eq('id', id)
    .single()

  if (tourError) {
    if (tourError.code === 'PGRST116') return null
    throw tourError
  }

  // Get participants
  const { data: participants, error: partError } = await supabase
    .from('participants')
    .select('*')
    .eq('tournament_id', id)
    .order('created_at', { ascending: true })

  if (partError) throw partError

  // Get teams with members
  const { data: teams, error: teamError } = await supabase
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

  if (teamError) throw teamError

  // Get bracket matches
  const { data: bracket, error: bracketError } = await supabase
    .from('bracket_matches')
    .select('*')
    .eq('tournament_id', id)
    .order('round', { ascending: true })
    .order('match_order', { ascending: true })

  if (bracketError) throw bracketError

  // Transform teams to include members
  const teamsWithMembers: TeamWithMembers[] = (teams || []).map(team => ({
    ...team,
    members: team.team_members?.map((tm: { participant: Participant }) => ({
      ...tm,
      participant: tm.participant
    })) || []
  }))

  return {
    tournament,
    participants: participants || [],
    teams: teamsWithMembers,
    bracket: bracket || []
  }
}

export async function createTournament(data: TournamentInsert): Promise<Tournament> {
  const supabase = await createClient()
  const { data: tournament, error } = await supabase
    .from('tournaments')
    .insert(data)
    .select()
    .single()

  if (error) throw error
  return tournament
}

export async function updateTournament(id: string, data: TournamentUpdate): Promise<Tournament> {
  const supabase = await createClient()
  const { data: tournament, error } = await supabase
    .from('tournaments')
    .update(data)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return tournament
}

export async function deleteTournament(id: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('tournaments')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// ===== Participant Management =====

export async function getParticipants(tournamentId: string): Promise<Participant[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('participants')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data || []
}

export async function addParticipant(
  tournamentId: string,
  data: {
    nickname: string
    skill: string
    skill_value: number
    profile_image_url?: string | null
    card_image_url?: string | null
  }
): Promise<{ success: boolean; error?: string; participant?: Participant }> {
  const supabase = await createClient()

  // Get tournament info
  const { data: tournament, error: tourError } = await supabase
    .from('tournaments')
    .select('max_participants, status')
    .eq('id', tournamentId)
    .single()

  if (tourError) {
    return { success: false, error: '대회를 찾을 수 없습니다.' }
  }

  if (tournament.status !== 'open') {
    return { success: false, error: '마감된 대회입니다.' }
  }

  // Count current participants
  const { count, error: countError } = await supabase
    .from('participants')
    .select('*', { count: 'exact', head: true })
    .eq('tournament_id', tournamentId)

  if (countError) {
    return { success: false, error: '참가자 수를 확인할 수 없습니다.' }
  }

  if ((count || 0) >= tournament.max_participants) {
    return { success: false, error: '정원이 마감되었습니다.' }
  }

  // Check for duplicate nickname
  const { data: existing, error: existingError } = await supabase
    .from('participants')
    .select('id')
    .eq('tournament_id', tournamentId)
    .ilike('nickname', data.nickname)
    .single()

  if (!existingError && existing) {
    return { success: false, error: '이미 사용 중인 닉네임입니다.' }
  }

  // Add participant
  const { data: participant, error: insertError } = await supabase
    .from('participants')
    .insert({
      tournament_id: tournamentId,
      nickname: data.nickname,
      skill: data.skill,
      skill_value: data.skill_value,
      card_tier: '브론즈',
      profile_image_url: data.profile_image_url || null,
      card_image_url: data.card_image_url || null,
      is_joker: false
    })
    .select()
    .single()

  if (insertError) {
    if (insertError.code === '23505') {
      return { success: false, error: '이미 사용 중인 닉네임입니다.' }
    }
    return { success: false, error: '참가 신청에 실패했습니다.' }
  }

  return { success: true, participant }
}

export async function deleteParticipant(id: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('participants')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function updateParticipantSkill(
  id: string,
  skill: string,
  skillValue: number
): Promise<{ success: boolean; error?: string; errorCode?: number; participant?: Participant }> {
  const supabase = await createClient()

  // Check if participant exists and get tournament info
  const { data: existing, error: fetchError } = await supabase
    .from('participants')
    .select('*, tournament:tournaments(status)')
    .eq('id', id)
    .single()

  if (fetchError || !existing) {
    return { success: false, error: '참가자를 찾을 수 없습니다.', errorCode: 404 }
  }

  // Check tournament status - only allow updates for open tournaments
  const tournament = existing.tournament as { status: string } | null
  if (tournament?.status === 'closed') {
    return { success: false, error: '마감된 대회의 참가자 레벨은 변경할 수 없습니다.', errorCode: 400 }
  }

  // Update participant skill
  const { data: participant, error: updateError } = await supabase
    .from('participants')
    .update({
      skill,
      skill_value: skillValue
    })
    .eq('id', id)
    .select()
    .single()

  if (updateError) {
    return { success: false, error: '실력 레벨 업데이트에 실패했습니다.', errorCode: 500 }
  }

  return { success: true, participant }
}

// ===== Team Management =====

export async function closeTournamentAndCreateTeams(tournamentId: string): Promise<{
  success: boolean
  error?: string
  teams?: Team[]
}> {
  const supabase = await createClient()

  // Get participants
  const { data: participants, error: partError } = await supabase
    .from('participants')
    .select('*')
    .eq('tournament_id', tournamentId)

  if (partError) {
    return { success: false, error: '참가자 목록을 불러올 수 없습니다.' }
  }

  if (!participants || participants.length < 1) {
    return { success: false, error: '참가자가 없습니다.' }
  }

  // skill_value를 현재 SKILLS 상수에 맞게 동기화 (레벨 체계 변경 대응)
  for (const p of participants) {
    const currentValue = SKILLS[p.skill]
    if (currentValue && currentValue !== p.skill_value) {
      p.skill_value = currentValue
      await supabase
        .from('participants')
        .update({ skill_value: currentValue })
        .eq('id', p.id)
    }
  }

  // Create balanced teams
  const balancedTeams = createBalancedTeams(participants)

  // Insert teams and members
  const createdTeams: Team[] = []

  for (const team of balancedTeams) {
    // Insert team
    const { data: insertedTeam, error: teamError } = await supabase
      .from('teams')
      .insert({
        tournament_id: tournamentId,
        name: team.name,
        avg_skill: team.avgSkill,
        has_joker: team.hasJoker
      })
      .select()
      .single()

    if (teamError) {
      console.error('Team insert error:', teamError)
      continue
    }

    createdTeams.push(insertedTeam)

    // Insert team members
    for (const member of team.members) {
      // Skip joker if not in DB
      if (member.is_joker) {
        // Insert joker participant first
        const { data: jokerParticipant, error: jokerError } = await supabase
          .from('participants')
          .insert({
            tournament_id: tournamentId,
            nickname: member.nickname,
            skill: member.skill,
            skill_value: member.skill_value,
            is_joker: true
          })
          .select()
          .single()

        if (jokerError) {
          console.error('Joker participant insert error:', jokerError)
        }
        if (!jokerError && jokerParticipant) {
          await supabase
            .from('team_members')
            .insert({
              team_id: insertedTeam.id,
              participant_id: jokerParticipant.id
            })
        }
      } else {
        await supabase
          .from('team_members')
          .insert({
            team_id: insertedTeam.id,
            participant_id: member.id
          })
      }
    }
  }

  // Update tournament status
  const { error: updateError } = await supabase
    .from('tournaments')
    .update({ status: 'closed' })
    .eq('id', tournamentId)

  if (updateError) {
    return { success: false, error: '대회 상태 업데이트에 실패했습니다.' }
  }

  return { success: true, teams: createdTeams }
}

export async function reopenTournament(tournamentId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  // Delete teams and team members (cascade)
  const { error: deleteTeamsError } = await supabase
    .from('teams')
    .delete()
    .eq('tournament_id', tournamentId)

  if (deleteTeamsError) {
    return { success: false, error: '팀 삭제에 실패했습니다.' }
  }

  // Delete joker participants
  const { error: deleteJokerError } = await supabase
    .from('participants')
    .delete()
    .eq('tournament_id', tournamentId)
    .eq('is_joker', true)

  if (deleteJokerError) {
    console.error('Joker delete error:', deleteJokerError)
  }

  // Delete bracket
  const { error: deleteBracketError } = await supabase
    .from('bracket_matches')
    .delete()
    .eq('tournament_id', tournamentId)

  if (deleteBracketError) {
    console.error('Bracket delete error:', deleteBracketError)
  }

  // Update tournament status
  const { error: updateError } = await supabase
    .from('tournaments')
    .update({ status: 'open' })
    .eq('id', tournamentId)

  if (updateError) {
    return { success: false, error: '대회 상태 업데이트에 실패했습니다.' }
  }

  return { success: true }
}

export async function updateTeamName(teamId: string, newName: string): Promise<{ success: boolean; error?: string }> {
  // Validate name
  const cleanedName = newName.trim()
  if (!cleanedName || cleanedName.length > 50) {
    return { success: false, error: '팀 이름은 1-50자 사이여야 합니다.' }
  }

  if (/[<>]/.test(cleanedName)) {
    return { success: false, error: '허용되지 않는 문자가 포함되어 있습니다.' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('teams')
    .update({ name: cleanedName })
    .eq('id', teamId)

  if (error) {
    return { success: false, error: '팀 이름 변경에 실패했습니다.' }
  }

  return { success: true }
}

// ===== Bracket Management =====

export async function generateBracket(tournamentId: string): Promise<{
  success: boolean
  error?: string
  matches?: BracketMatch[]
}> {
  const supabase = await createClient()

  // Get teams
  const { data: teams, error: teamError } = await supabase
    .from('teams')
    .select('*')
    .eq('tournament_id', tournamentId)

  if (teamError || !teams || teams.length < 2) {
    return { success: false, error: '팀이 2개 이상 필요합니다.' }
  }

  // Delete existing bracket
  await supabase
    .from('bracket_matches')
    .delete()
    .eq('tournament_id', tournamentId)

  // Seed teams by avg_skill (descending) - similar skill teams play in round 1
  // Stable sort: teams with same avg_skill are ordered by name
  const seededTeams = [...teams].sort((a, b) => {
    const diff = b.avg_skill - a.avg_skill
    if (diff !== 0) return diff
    return a.name.localeCompare(b.name)
  })

  // Calculate total rounds needed
  const teamCount = seededTeams.length
  const totalRounds = Math.ceil(Math.log2(teamCount))

  // Create bracket matches for all rounds
  const matches: BracketMatch[] = []

  // Round 1 - actual team matchups
  let matchesInRound = Math.ceil(teamCount / 2)
  for (let i = 0; i < matchesInRound; i++) {
    const team1 = seededTeams[i * 2]
    const team2 = seededTeams[i * 2 + 1]

    const { data: match, error } = await supabase
      .from('bracket_matches')
      .insert({
        tournament_id: tournamentId,
        round: 1,
        match_order: i + 1,
        team1_name: team1?.name || 'TBD',
        team2_name: team2?.name || 'BYE'
      })
      .select()
      .single()

    if (!error && match) {
      matches.push(match)

      // Auto-advance if BYE
      if (!team2) {
        await supabase
          .from('bracket_matches')
          .update({ winner_name: team1.name })
          .eq('id', match.id)
      }
    }
  }

  // Create subsequent rounds (semifinals, finals, etc.) with TBD placeholders
  for (let round = 2; round <= totalRounds; round++) {
    matchesInRound = Math.ceil(matchesInRound / 2)

    for (let i = 0; i < matchesInRound; i++) {
      const { data: match, error } = await supabase
        .from('bracket_matches')
        .insert({
          tournament_id: tournamentId,
          round,
          match_order: i + 1,
          team1_name: 'TBD',
          team2_name: 'TBD'
        })
        .select()
        .single()

      if (!error && match) {
        matches.push(match)
      }
    }
  }

  return { success: true, matches }
}

export async function updateMatchWinner(
  matchId: string,
  winnerName: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  // Get current match info
  const { data: currentMatch, error: matchError } = await supabase
    .from('bracket_matches')
    .select('*')
    .eq('id', matchId)
    .single()

  if (matchError || !currentMatch) {
    return { success: false, error: '매치를 찾을 수 없습니다.' }
  }

  // Update winner
  const { error } = await supabase
    .from('bracket_matches')
    .update({ winner_name: winnerName })
    .eq('id', matchId)

  if (error) {
    return { success: false, error: '결과 저장에 실패했습니다.' }
  }

  // Advance winner to next round
  const nextRound = currentMatch.round + 1
  const nextMatchOrder = Math.ceil(currentMatch.match_order / 2)
  const isFirstOfPair = currentMatch.match_order % 2 === 1

  // Find next round match
  const { data: nextMatch, error: nextError } = await supabase
    .from('bracket_matches')
    .select('*')
    .eq('tournament_id', currentMatch.tournament_id)
    .eq('round', nextRound)
    .eq('match_order', nextMatchOrder)
    .single()

  if (!nextError && nextMatch) {
    // Update the appropriate team slot in next match
    const updateField = isFirstOfPair ? 'team1_name' : 'team2_name'
    await supabase
      .from('bracket_matches')
      .update({ [updateField]: winnerName })
      .eq('id', nextMatch.id)
  }

  return { success: true }
}
