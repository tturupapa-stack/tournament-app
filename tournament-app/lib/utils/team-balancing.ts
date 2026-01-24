import type { Participant, Team, TeamInsert, ParticipantInsert } from '@/types/database'
import { JOKER_PARTICIPANT } from '@/lib/constants'

interface TeamWithMembers {
  name: string
  avgSkill: number
  hasJoker: boolean
  members: Participant[]
}

/**
 * 실력 평균을 맞춰서 2인 1조 팀 자동 생성
 *
 * 알고리즘:
 * 1. 참가자를 실력 순으로 정렬 (높음 -> 낮음, skill_value가 낮을수록 높은 실력)
 * 2. 가장 높은 실력자와 가장 낮은 실력자를 매칭
 * 3. 두 번째로 높은 실력자와 두 번째로 낮은 실력자를 매칭
 * 4. 반복...
 * 5. 홀수인 경우: 남은 1명을 조커(관리자)와 팀 구성
 *
 * 이렇게 하면 각 팀의 실력 평균이 비슷해집니다.
 */
export function createBalancedTeams(participants: Participant[]): TeamWithMembers[] {
  if (participants.length < 1) {
    return []
  }

  // 실력 순으로 정렬 (skill_value가 낮을수록 높은 실력)
  const sortedParticipants = [...participants].sort(
    (a, b) => a.skill_value - b.skill_value
  )

  const teams: TeamWithMembers[] = []

  // 양 끝에서 매칭
  let left = 0
  let right = sortedParticipants.length - 1

  while (left < right) {
    const team: TeamWithMembers = {
      name: `팀 ${teams.length + 1}`,
      members: [sortedParticipants[left], sortedParticipants[right]],
      avgSkill: (sortedParticipants[left].skill_value + sortedParticipants[right].skill_value) / 2,
      hasJoker: false
    }
    teams.push(team)
    left++
    right--
  }

  // 홀수인 경우 남은 참가자를 조커(관리자)와 팀 구성
  if (left === right) {
    const lastParticipant = sortedParticipants[left]

    // 조커(관리자) 생성 - 세미프로 레벨로 고정
    const joker: Participant = {
      id: 'joker',
      tournament_id: lastParticipant.tournament_id,
      nickname: '🃏 조커 (관리자)',
      skill: JOKER_PARTICIPANT.skill,
      skill_value: JOKER_PARTICIPANT.skill_value,
      card_tier: '브론즈',
      profile_image_url: null,
      card_image_url: null,
      is_joker: true,
      created_at: new Date().toISOString()
    }

    const team: TeamWithMembers = {
      name: `팀 ${teams.length + 1}`,
      members: [lastParticipant, joker],
      avgSkill: (lastParticipant.skill_value + joker.skill_value) / 2,
      hasJoker: true
    }
    teams.push(team)
  }

  return teams
}

/**
 * 다음 카드 등급을 반환
 */
export function getNextCardTier(currentTier: string): string | null {
  const tiers = ['브론즈', '실버', '골드', '스페셜', '레전드']
  const currentIndex = tiers.indexOf(currentTier)

  if (currentIndex === -1 || currentIndex >= tiers.length - 1) {
    return null // 유효하지 않은 등급이거나 이미 최대 등급
  }

  return tiers[currentIndex + 1]
}
