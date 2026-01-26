import type { Participant, Team, TeamInsert, ParticipantInsert } from '@/types/database'
import { JOKER_PARTICIPANT } from '@/lib/constants'

interface TeamWithMembers {
  name: string
  avgSkill: number
  hasJoker: boolean
  members: Participant[]
}

/**
 * 완전탐색으로 모든 가능한 2인 1조 조합 중 팀 간 평균 차이가 최소인 조합을 찾음
 *
 * 알고리즘:
 * 1. 모든 가능한 2인 1조 조합 생성
 * 2. 각 조합의 팀 평균 차이(최대 - 최소) 계산
 * 3. 차이가 가장 작은 조합 선택
 * 4. 홀수인 경우: 먼저 조커를 추가한 후 완전탐색
 *
 * 인원이 많으면(16명 초과) 그리디 알고리즘으로 폴백
 */
export function createBalancedTeams(participants: Participant[]): TeamWithMembers[] {
  if (participants.length < 1) {
    return []
  }

  let allParticipants = [...participants]
  let hasJoker = false

  // 홀수인 경우 조커 추가
  if (allParticipants.length % 2 === 1) {
    hasJoker = true
    const joker: Participant = {
      id: 'joker',
      tournament_id: allParticipants[0].tournament_id,
      nickname: '🃏 조커 (관리자)',
      skill: JOKER_PARTICIPANT.skill,
      skill_value: JOKER_PARTICIPANT.skill_value,
      card_tier: '브론즈',
      profile_image_url: null,
      card_image_url: null,
      is_joker: true,
      created_at: new Date().toISOString()
    }
    allParticipants.push(joker)
  }

  // 16명 초과시 그리디 알고리즘 사용 (완전탐색은 조합 수 폭발)
  if (allParticipants.length > 16) {
    return createBalancedTeamsGreedy(allParticipants, hasJoker)
  }

  // 완전탐색으로 최적 조합 찾기
  const bestPairing = findOptimalPairing(allParticipants)

  return bestPairing.map((pair, index) => {
    const jokerMember = pair.find(p => p.is_joker)
    return {
      name: `팀 ${index + 1}`,
      members: pair,
      avgSkill: (pair[0].skill_value + pair[1].skill_value) / 2,
      hasJoker: !!jokerMember
    }
  })
}

/**
 * 완전탐색으로 최적의 페어링 찾기
 */
function findOptimalPairing(participants: Participant[]): [Participant, Participant][] {
  let bestPairing: [Participant, Participant][] = []
  let bestDiff = Infinity

  function generatePairings(
    remaining: Participant[],
    current: [Participant, Participant][]
  ) {
    // 모든 참가자가 매칭되면 평가
    if (remaining.length === 0) {
      const avgSkills = current.map(pair => (pair[0].skill_value + pair[1].skill_value) / 2)
      const maxAvg = Math.max(...avgSkills)
      const minAvg = Math.min(...avgSkills)
      const diff = maxAvg - minAvg

      if (diff < bestDiff) {
        bestDiff = diff
        bestPairing = current.map(pair => [...pair] as [Participant, Participant])
      }
      return
    }

    // 첫 번째 참가자를 고정하고 나머지와 페어링
    const first = remaining[0]
    const rest = remaining.slice(1)

    for (let i = 0; i < rest.length; i++) {
      const partner = rest[i]
      const newRemaining = rest.filter((_, idx) => idx !== i)
      const newPair: [Participant, Participant] = [first, partner]

      generatePairings(newRemaining, [...current, newPair])
    }
  }

  generatePairings(participants, [])
  return bestPairing
}

/**
 * 그리디 알고리즘 (16명 초과시 폴백)
 * 팀을 하나씩 만들 때마다 전체 균형을 고려
 */
function createBalancedTeamsGreedy(participants: Participant[], hasJoker: boolean): TeamWithMembers[] {
  const sorted = [...participants].sort((a, b) => a.skill_value - b.skill_value)
  const teams: TeamWithMembers[] = []
  const used = new Set<string>()

  while (used.size < sorted.length) {
    // 아직 매칭 안 된 참가자들
    const available = sorted.filter(p => !used.has(p.id))

    if (available.length < 2) break

    // 전체 평균 계산
    const totalAvg = available.reduce((sum, p) => sum + p.skill_value, 0) / available.length

    let bestPair: [Participant, Participant] | null = null
    let bestDiffFromTarget = Infinity

    // 모든 가능한 2인 조합 중 평균에 가장 가까운 조합 선택
    for (let i = 0; i < available.length; i++) {
      for (let j = i + 1; j < available.length; j++) {
        const pairAvg = (available[i].skill_value + available[j].skill_value) / 2
        const diffFromTarget = Math.abs(pairAvg - totalAvg)

        if (diffFromTarget < bestDiffFromTarget) {
          bestDiffFromTarget = diffFromTarget
          bestPair = [available[i], available[j]]
        }
      }
    }

    if (bestPair) {
      used.add(bestPair[0].id)
      used.add(bestPair[1].id)
      const jokerMember = bestPair.find(p => p.is_joker)
      teams.push({
        name: `팀 ${teams.length + 1}`,
        members: bestPair,
        avgSkill: (bestPair[0].skill_value + bestPair[1].skill_value) / 2,
        hasJoker: !!jokerMember
      })
    }
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
