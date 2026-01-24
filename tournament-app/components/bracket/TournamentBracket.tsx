'use client'

import { useMemo } from 'react'
import { Crown, Loader2 } from 'lucide-react'

export interface BracketMatch {
  id: string
  round: number
  match_order: number
  team1_name: string
  team2_name: string
  winner_name: string | null
}

interface TournamentBracketProps {
  matches: BracketMatch[]
  isAdmin?: boolean
  onSetWinner?: (matchId: string, winnerName: string) => void
  actionLoading?: string | null
}

// Bracket layout constants
const MATCH_WIDTH = 200
const BASE_GAP = 40
const CONNECTOR_HEIGHT = 40
const ROUND_GAP = 20

export function TournamentBracket({
  matches,
  isAdmin = false,
  onSetWinner,
  actionLoading
}: TournamentBracketProps) {
  // Group matches by round with memoization
  const { matchesByRound, rounds, totalRounds } = useMemo(() => {
    const grouped = matches.reduce((acc, match) => {
      if (!acc[match.round]) {
        acc[match.round] = []
      }
      acc[match.round].push(match)
      return acc
    }, {} as Record<number, BracketMatch[]>)

    const roundKeys = Object.keys(grouped).map(Number).sort()

    return {
      matchesByRound: grouped,
      rounds: roundKeys,
      totalRounds: roundKeys.length
    }
  }, [matches])

  // Get round label
  const getRoundLabel = (roundIndex: number, isLastRound: boolean) => {
    if (isLastRound) return '🏆 결승'
    const roundsFromEnd = totalRounds - 1 - roundIndex
    if (roundsFromEnd === 1) return '준결승'
    if (roundsFromEnd === 2) return '8강'
    if (roundsFromEnd === 3) return '16강'
    return `${roundIndex + 1}라운드`
  }

  // Calculate total width needed for first round (most matches)
  const firstRoundMatches = matchesByRound[rounds[0]]?.length || 0
  const totalWidth = firstRoundMatches * MATCH_WIDTH + (firstRoundMatches - 1) * BASE_GAP

  return (
    <div className="relative overflow-x-auto overflow-y-auto py-8">
      <div
        className="flex flex-col items-center mx-auto"
        style={{ width: `${Math.max(totalWidth + 100, 500)}px` }}
      >
        {/* Render from top (finals) to bottom (first round) */}
        {[...rounds].reverse().map((round, reverseIndex) => {
          const roundIndex = rounds.length - 1 - reverseIndex
          const isLastRound = roundIndex === rounds.length - 1
          const isFirstRound = roundIndex === 0
          const matchesInRound = matchesByRound[round]
          const spacingMultiplier = Math.pow(2, roundIndex)
          const gap = BASE_GAP * spacingMultiplier + MATCH_WIDTH * (spacingMultiplier - 1)

          return (
            <div key={round} className="relative w-full flex flex-col items-center">
              {/* Round Label */}
              <div className="text-center mb-1">
                <span className={`text-xs font-medium ${isLastRound ? 'text-yellow-500' : 'text-muted-foreground'}`}>
                  {getRoundLabel(roundIndex, isLastRound)}
                </span>
              </div>

              {/* Matches */}
              <div
                className="flex justify-center items-center"
                style={{ gap: `${gap}px` }}
              >
                {matchesInRound.map((match) => (
                  <MatchRow
                    key={match.id}
                    match={match}
                    isAdmin={isAdmin}
                    onSetWinner={onSetWinner}
                    actionLoading={actionLoading}
                    isLastRound={isLastRound}
                    width={MATCH_WIDTH}
                  />
                ))}
              </div>

              {/* Connector Lines down to next round (below current matches) */}
              {!isFirstRound && (
                <svg
                  className="w-full pointer-events-none"
                  style={{ height: `${CONNECTOR_HEIGHT}px` }}
                  preserveAspectRatio="none"
                >
                  {(() => {
                    // Get the matches from the round below (more matches)
                    const belowRoundIndex = roundIndex - 1
                    const belowRound = rounds[belowRoundIndex]
                    const belowMatches = matchesByRound[belowRound] || []
                    const belowSpacingMultiplier = Math.pow(2, belowRoundIndex)
                    const belowGap = BASE_GAP * belowSpacingMultiplier + MATCH_WIDTH * (belowSpacingMultiplier - 1)

                    return belowMatches.map((_, matchIndex) => {
                      if (matchIndex % 2 === 1) return null

                      const matchCount = belowMatches.length
                      const matchPlusGap = MATCH_WIDTH + belowGap

                      // Calculate center positions for below round
                      const totalRowWidth = matchCount * MATCH_WIDTH + (matchCount - 1) * belowGap
                      const startX = (totalWidth - totalRowWidth) / 2 + 50

                      const x1 = startX + matchIndex * matchPlusGap + MATCH_WIDTH / 2
                      const x2 = startX + (matchIndex + 1) * matchPlusGap + MATCH_WIDTH / 2
                      const xMid = (x1 + x2) / 2

                      const match1 = belowMatches[matchIndex]
                      const match2 = belowMatches[matchIndex + 1]
                      const match1Done = !!match1?.winner_name
                      const match2Done = !!match2?.winner_name
                      const bothDone = match1Done && match2Done

                      const defaultStroke = 'stroke-muted-foreground/30'
                      const activeStroke = 'stroke-green-500'

                      return (
                        <g key={`connector-${matchIndex}`}>
                          {/* Left vertical down to match */}
                          <line x1={x1} y1={CONNECTOR_HEIGHT / 2} x2={x1} y2={CONNECTOR_HEIGHT} className={match1Done ? activeStroke : defaultStroke} strokeWidth="2" />
                          {/* Right vertical down to match */}
                          <line x1={x2} y1={CONNECTOR_HEIGHT / 2} x2={x2} y2={CONNECTOR_HEIGHT} className={match2Done ? activeStroke : defaultStroke} strokeWidth="2" />
                          {/* Left horizontal (x1 to xMid) */}
                          <line x1={x1} y1={CONNECTOR_HEIGHT / 2} x2={xMid} y2={CONNECTOR_HEIGHT / 2} className={match1Done ? activeStroke : defaultStroke} strokeWidth="2" />
                          {/* Right horizontal (xMid to x2) */}
                          <line x1={xMid} y1={CONNECTOR_HEIGHT / 2} x2={x2} y2={CONNECTOR_HEIGHT / 2} className={match2Done ? activeStroke : defaultStroke} strokeWidth="2" />
                          {/* Center vertical up to next round */}
                          <line x1={xMid} y1={0} x2={xMid} y2={CONNECTOR_HEIGHT / 2} className={bothDone ? activeStroke : defaultStroke} strokeWidth="2" />
                        </g>
                      )
                    })
                  })()}
                </svg>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

interface MatchRowProps {
  match: BracketMatch
  isAdmin: boolean
  onSetWinner?: (matchId: string, winnerName: string) => void
  actionLoading?: string | null
  isLastRound: boolean
  width: number
}

function MatchRow({ match, isAdmin, onSetWinner, actionLoading, isLastRound, width }: MatchRowProps) {
  const isMatchLoading = actionLoading === match.id
  const hasWinner = !!match.winner_name

  const handleTeamClick = (teamName: string) => {
    if (isAdmin && !hasWinner && !isMatchLoading && onSetWinner && teamName !== 'TBD') {
      onSetWinner(match.id, teamName)
    }
  }

  const getTeamStyle = (teamName: string, isWinner: boolean) => {
    const baseStyle = "text-sm transition-all duration-200 select-none whitespace-nowrap"

    if (isWinner) {
      return `${baseStyle} text-green-500 font-bold`
    }
    if (hasWinner && !isWinner) {
      return `${baseStyle} text-muted-foreground/40 line-through`
    }
    if (teamName === 'TBD') {
      return `${baseStyle} text-muted-foreground/30 italic`
    }
    if (isAdmin) {
      return `${baseStyle} text-foreground hover:text-primary cursor-pointer`
    }
    return `${baseStyle} text-foreground`
  }

  return (
    <div
      className={`flex items-center justify-center gap-2 ${isLastRound ? 'text-base' : 'text-sm'}`}
      style={{ width: `${width}px` }}
    >
      {/* Team 1 */}
      <div
        role={isAdmin && !hasWinner ? "button" : undefined}
        tabIndex={isAdmin && !hasWinner && match.team1_name !== 'TBD' ? 0 : -1}
        className={`flex items-center gap-1 ${getTeamStyle(match.team1_name, match.winner_name === match.team1_name)}`}
        onClick={() => handleTeamClick(match.team1_name)}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && match.team1_name !== 'TBD') {
            e.preventDefault()
            handleTeamClick(match.team1_name)
          }
        }}
      >
        {match.winner_name === match.team1_name && <Crown className="h-3 w-3 text-yellow-500" />}
        {match.team1_name}
        {isMatchLoading && <Loader2 className="h-3 w-3 animate-spin" />}
      </div>

      {/* VS */}
      <span className="text-[10px] text-muted-foreground/50 font-medium">vs</span>

      {/* Team 2 */}
      <div
        role={isAdmin && !hasWinner ? "button" : undefined}
        tabIndex={isAdmin && !hasWinner && match.team2_name !== 'TBD' ? 0 : -1}
        className={`flex items-center gap-1 ${getTeamStyle(match.team2_name, match.winner_name === match.team2_name)}`}
        onClick={() => handleTeamClick(match.team2_name)}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && match.team2_name !== 'TBD') {
            e.preventDefault()
            handleTeamClick(match.team2_name)
          }
        }}
      >
        {match.team2_name}
        {match.winner_name === match.team2_name && <Crown className="h-3 w-3 text-yellow-500" />}
        {isMatchLoading && <Loader2 className="h-3 w-3 animate-spin" />}
      </div>
    </div>
  )
}
