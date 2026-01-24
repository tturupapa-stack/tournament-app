'use client'

import { useMemo, useEffect, useRef } from 'react'
import { Crown, Loader2 } from 'lucide-react'
import { ANIMATION_TIMING, type AnimatingMatch } from '@/hooks'

/**
 * Sanitize text to prevent XSS attacks by removing potentially dangerous characters.
 * While JSX auto-escapes content, this provides an additional defense layer for API data.
 */
const sanitizeText = (text: string): string => {
  if (!text || typeof text !== 'string') return ''
  return text.replace(/[<>]/g, '')
}

export interface BracketMatch {
  id: string
  round: number
  match_order: number
  team1_name: string
  team2_name: string
  winner_name: string | null
}

// Re-export for backwards compatibility
export type { AnimatingMatch }

interface TournamentBracketProps {
  matches: BracketMatch[]
  isAdmin?: boolean
  onSetWinner?: (matchId: string, winnerName: string) => void
  actionLoading?: string | null
  animatingMatch?: AnimatingMatch | null
  animationPhase?: number
  onAnimationComplete?: () => void
}

// Bracket layout constants
const MATCH_WIDTH = 220
const BASE_GAP = 50
const CONNECTOR_HEIGHT = 50

export function TournamentBracket({
  matches,
  isAdmin = false,
  onSetWinner,
  actionLoading,
  animatingMatch,
  animationPhase = 0,
  onAnimationComplete,
}: TournamentBracketProps) {
  // Track previous animating match for cleanup
  const prevAnimatingMatchRef = useRef<string | null>(null)
  const onAnimationCompleteRef = useRef(onAnimationComplete)

  // Keep callback ref updated
  useEffect(() => {
    onAnimationCompleteRef.current = onAnimationComplete
  }, [onAnimationComplete])

  // Notify when animation completes (when animatingMatch changes from something to null)
  useEffect(() => {
    if (prevAnimatingMatchRef.current && !animatingMatch) {
      onAnimationCompleteRef.current?.()
    }
    prevAnimatingMatchRef.current = animatingMatch?.matchId ?? null
  }, [animatingMatch])

  // Group matches by round with memoization
  const { matchesByRound, rounds, totalRounds } = useMemo(() => {
    const grouped = matches.reduce(
      (acc, match) => {
        if (!acc[match.round]) {
          acc[match.round] = []
        }
        acc[match.round].push(match)
        return acc
      },
      {} as Record<number, BracketMatch[]>
    )

    const roundKeys = Object.keys(grouped).map(Number).sort()

    return {
      matchesByRound: grouped,
      rounds: roundKeys,
      totalRounds: roundKeys.length,
    }
  }, [matches])

  // Get round label
  const getRoundLabel = (roundIndex: number, isLastRound: boolean) => {
    if (isLastRound) return 'FINAL'
    const roundsFromEnd = totalRounds - 1 - roundIndex
    if (roundsFromEnd === 1) return 'SEMI-FINALS'
    if (roundsFromEnd === 2) return 'QUARTER-FINALS'
    if (roundsFromEnd === 3) return 'ROUND OF 16'
    return `ROUND ${roundIndex + 1}`
  }

  // Calculate total width needed for first round (most matches)
  const firstRoundMatches = matchesByRound[rounds[0]]?.length || 0
  const totalWidth = firstRoundMatches * MATCH_WIDTH + (firstRoundMatches - 1) * BASE_GAP

  return (
    <div className="relative overflow-x-auto overflow-y-auto py-10 px-6">
      {/* SVG Definitions - defined once for all connector lines */}
      <svg width="0" height="0" className="absolute">
        <defs>
          <linearGradient id="ucl-goldGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#DAA520" />
            <stop offset="50%" stopColor="#FFD700" />
            <stop offset="100%" stopColor="#DAA520" />
          </linearGradient>
          <linearGradient id="ucl-silverGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(192, 192, 192, 0.2)" />
            <stop offset="50%" stopColor="rgba(192, 192, 192, 0.4)" />
            <stop offset="100%" stopColor="rgba(192, 192, 192, 0.2)" />
          </linearGradient>
          <filter id="ucl-glowGold" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="ucl-glowSilver" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      </svg>

      <div
        className="flex flex-col items-center mx-auto"
        style={{ width: `${Math.max(totalWidth + 120, 600)}px` }}
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
              <div className="text-center mb-3">
                <span
                  className={`
                    font-semibold tracking-[0.2em] text-xs
                    ${isLastRound ? 'ucl-round-label-finals text-sm' : 'ucl-round-label'}
                  `}
                >
                  {getRoundLabel(roundIndex, isLastRound)}
                </span>
              </div>

              {/* Matches */}
              <div className="flex justify-center items-center" style={{ gap: `${gap}px` }}>
                {matchesInRound.map((match) => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    isAdmin={isAdmin}
                    onSetWinner={onSetWinner}
                    actionLoading={actionLoading}
                    isLastRound={isLastRound}
                    width={MATCH_WIDTH}
                    isAnimating={animatingMatch?.matchId === match.id}
                    animationPhase={animatingMatch?.matchId === match.id ? animationPhase : 0}
                    animatingWinnerName={
                      animatingMatch?.matchId === match.id ? animatingMatch.winnerName : undefined
                    }
                  />
                ))}
              </div>

              {/* Connector Lines down to next round (below current matches) */}
              {!isFirstRound && (
                <svg
                  className="w-full pointer-events-none"
                  style={{ height: `${CONNECTOR_HEIGHT}px` }}
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  {(() => {
                    // Get the matches from the round below (more matches)
                    const belowRoundIndex = roundIndex - 1
                    const belowRound = rounds[belowRoundIndex]
                    const belowMatches = matchesByRound[belowRound] || []
                    const belowSpacingMultiplier = Math.pow(2, belowRoundIndex)
                    const belowGap =
                      BASE_GAP * belowSpacingMultiplier + MATCH_WIDTH * (belowSpacingMultiplier - 1)

                    return belowMatches.map((_, matchIndex) => {
                      if (matchIndex % 2 === 1) return null

                      const matchCount = belowMatches.length
                      const matchPlusGap = MATCH_WIDTH + belowGap

                      // Calculate center positions for below round
                      const totalRowWidth = matchCount * MATCH_WIDTH + (matchCount - 1) * belowGap
                      const startX = (totalWidth - totalRowWidth) / 2 + 60

                      const x1 = startX + matchIndex * matchPlusGap + MATCH_WIDTH / 2
                      const x2 = startX + (matchIndex + 1) * matchPlusGap + MATCH_WIDTH / 2
                      const xMid = (x1 + x2) / 2

                      const match1 = belowMatches[matchIndex]
                      const match2 = belowMatches[matchIndex + 1]
                      const match1Done = !!match1?.winner_name
                      const match2Done = !!match2?.winner_name
                      const bothDone = match1Done && match2Done

                      const defaultStroke = 'url(#ucl-silverGradient)'
                      const activeStroke = 'url(#ucl-goldGradient)'

                      return (
                        <g key={`connector-${matchIndex}`}>
                          {/* Left vertical down to match */}
                          <line
                            x1={x1}
                            y1={CONNECTOR_HEIGHT / 2}
                            x2={x1}
                            y2={CONNECTOR_HEIGHT}
                            stroke={match1Done ? activeStroke : defaultStroke}
                            strokeWidth={match1Done ? '2.5' : '2'}
                            filter={match1Done ? 'url(#ucl-glowGold)' : 'url(#ucl-glowSilver)'}
                            className={
                              match1Done ? 'ucl-connector-active' : 'ucl-connector-default'
                            }
                          />
                          {/* Right vertical down to match */}
                          <line
                            x1={x2}
                            y1={CONNECTOR_HEIGHT / 2}
                            x2={x2}
                            y2={CONNECTOR_HEIGHT}
                            stroke={match2Done ? activeStroke : defaultStroke}
                            strokeWidth={match2Done ? '2.5' : '2'}
                            filter={match2Done ? 'url(#ucl-glowGold)' : 'url(#ucl-glowSilver)'}
                            className={
                              match2Done ? 'ucl-connector-active' : 'ucl-connector-default'
                            }
                          />
                          {/* Left horizontal (x1 to xMid) */}
                          <line
                            x1={x1}
                            y1={CONNECTOR_HEIGHT / 2}
                            x2={xMid}
                            y2={CONNECTOR_HEIGHT / 2}
                            stroke={match1Done ? activeStroke : defaultStroke}
                            strokeWidth={match1Done ? '2.5' : '2'}
                            filter={match1Done ? 'url(#ucl-glowGold)' : 'url(#ucl-glowSilver)'}
                            className={
                              match1Done ? 'ucl-connector-active' : 'ucl-connector-default'
                            }
                          />
                          {/* Right horizontal (xMid to x2) */}
                          <line
                            x1={xMid}
                            y1={CONNECTOR_HEIGHT / 2}
                            x2={x2}
                            y2={CONNECTOR_HEIGHT / 2}
                            stroke={match2Done ? activeStroke : defaultStroke}
                            strokeWidth={match2Done ? '2.5' : '2'}
                            filter={match2Done ? 'url(#ucl-glowGold)' : 'url(#ucl-glowSilver)'}
                            className={
                              match2Done ? 'ucl-connector-active' : 'ucl-connector-default'
                            }
                          />
                          {/* Center vertical up to next round */}
                          <line
                            x1={xMid}
                            y1={0}
                            x2={xMid}
                            y2={CONNECTOR_HEIGHT / 2}
                            stroke={bothDone ? activeStroke : defaultStroke}
                            strokeWidth={bothDone ? '2.5' : '2'}
                            filter={bothDone ? 'url(#ucl-glowGold)' : 'url(#ucl-glowSilver)'}
                            className={bothDone ? 'ucl-connector-active' : 'ucl-connector-default'}
                          />
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

interface MatchCardProps {
  match: BracketMatch
  isAdmin: boolean
  onSetWinner?: (matchId: string, winnerName: string) => void
  actionLoading?: string | null
  isLastRound: boolean
  width: number
  isAnimating?: boolean
  animationPhase?: number
  animatingWinnerName?: string
}

function MatchCard({
  match,
  isAdmin,
  onSetWinner,
  actionLoading,
  isLastRound,
  width,
  isAnimating = false,
  animationPhase = 0,
  animatingWinnerName,
}: MatchCardProps) {
  const isMatchLoading = actionLoading === match.id
  const hasWinner = !!match.winner_name

  const handleTeamClick = (teamName: string) => {
    if (isAdmin && !hasWinner && !isMatchLoading && onSetWinner && teamName !== 'TBD') {
      onSetWinner(match.id, teamName)
    }
  }

  const getTeamClassName = (teamName: string, isWinner: boolean) => {
    const baseClass =
      'text-sm transition-all duration-300 select-none whitespace-nowrap tracking-wide'

    // During animation, apply special animation classes
    if (isAnimating && animatingWinnerName) {
      const isAnimatingWinner = teamName === animatingWinnerName
      const isAnimatingLoser = !isAnimatingWinner && teamName !== 'TBD'

      if (isAnimatingWinner && animationPhase >= 2) {
        return `${baseClass} ucl-winner-reveal ${animationPhase >= 2 ? 'ucl-winner-shimmer' : ''}`
      }
      if (isAnimatingLoser && animationPhase >= 3) {
        return `${baseClass} ucl-loser-fadeout`
      }
    }

    if (isWinner) {
      return `${baseClass} ucl-team-name-winner`
    }
    if (hasWinner && !isWinner) {
      return `${baseClass} ucl-team-name-loser`
    }
    if (teamName === 'TBD') {
      return `${baseClass} ucl-team-name-tbd`
    }
    if (isAdmin) {
      return `${baseClass} ucl-team-name hover:text-white cursor-pointer`
    }
    return `${baseClass} ucl-team-name`
  }

  // Check if crown should be shown with animation
  const shouldShowCrown = (teamName: string) => {
    if (isAnimating && animatingWinnerName === teamName && animationPhase >= 4) {
      return true
    }
    return match.winner_name === teamName && !isAnimating
  }

  const getCrownClassName = (teamName: string) => {
    if (isAnimating && animatingWinnerName === teamName && animationPhase >= 4) {
      return 'h-4 w-4 ucl-crown ucl-crown-bounce'
    }
    return 'h-4 w-4 ucl-crown'
  }

  return (
    <div
      className={`
        flex items-center justify-center gap-3
        ${isLastRound ? 'ucl-match-card ucl-match-card-finals' : 'ucl-match-card'}
        ${isLastRound ? 'text-base py-4 px-5' : 'text-sm py-3 px-4'}
        ${isAnimating && animationPhase >= 1 ? 'ucl-match-highlight' : ''}
      `}
      style={{ width: `${width}px` }}
    >
      {/* Team 1 */}
      <div
        role={isAdmin && !hasWinner && match.team1_name !== 'TBD' ? 'button' : undefined}
        tabIndex={isAdmin && !hasWinner && match.team1_name !== 'TBD' ? 0 : undefined}
        aria-label={
          isAdmin && !hasWinner && match.team1_name !== 'TBD'
            ? `Select ${match.team1_name} as winner`
            : undefined
        }
        className={`flex items-center gap-2 ${getTeamClassName(match.team1_name, match.winner_name === match.team1_name)}`}
        onClick={() => handleTeamClick(match.team1_name)}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && match.team1_name !== 'TBD') {
            e.preventDefault()
            handleTeamClick(match.team1_name)
          }
        }}
      >
        {shouldShowCrown(match.team1_name) && (
          <Crown className={getCrownClassName(match.team1_name)} aria-hidden="true" />
        )}
        <span>{sanitizeText(match.team1_name)}</span>
        {isMatchLoading && (
          <Loader2 className="h-3 w-3 animate-spin text-[var(--ucl-silver)]" aria-hidden="true" />
        )}
      </div>

      {/* VS Separator */}
      <span className="ucl-vs text-xs font-medium px-1">VS</span>

      {/* Team 2 */}
      <div
        role={isAdmin && !hasWinner && match.team2_name !== 'TBD' ? 'button' : undefined}
        tabIndex={isAdmin && !hasWinner && match.team2_name !== 'TBD' ? 0 : undefined}
        aria-label={
          isAdmin && !hasWinner && match.team2_name !== 'TBD'
            ? `Select ${match.team2_name} as winner`
            : undefined
        }
        className={`flex items-center gap-2 ${getTeamClassName(match.team2_name, match.winner_name === match.team2_name)}`}
        onClick={() => handleTeamClick(match.team2_name)}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && match.team2_name !== 'TBD') {
            e.preventDefault()
            handleTeamClick(match.team2_name)
          }
        }}
      >
        <span>{sanitizeText(match.team2_name)}</span>
        {shouldShowCrown(match.team2_name) && (
          <Crown className={getCrownClassName(match.team2_name)} aria-hidden="true" />
        )}
        {isMatchLoading && (
          <Loader2 className="h-3 w-3 animate-spin text-[var(--ucl-silver)]" aria-hidden="true" />
        )}
      </div>
    </div>
  )
}
