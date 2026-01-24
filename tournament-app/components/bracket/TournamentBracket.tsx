'use client'

import { useMemo, useEffect, useRef, useState } from 'react'
import { Loader2, Crown } from 'lucide-react'
import { type AnimatingMatch } from '@/hooks'

/**
 * Sanitize text to prevent XSS attacks by escaping HTML entities.
 * While JSX auto-escapes content, this provides an additional defense layer for API data.
 * Escapes: & < > " ' to their HTML entity equivalents.
 */
const sanitizeText = (text: string): string => {
  if (!text || typeof text !== 'string') return ''
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
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
      <svg width="0" height="0" className="absolute" aria-hidden="true">
        <defs>
          {/* Static gold gradient */}
          <linearGradient id="ucl-goldGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#DAA520" />
            <stop offset="50%" stopColor="#FFD700" />
            <stop offset="100%" stopColor="#DAA520" />
          </linearGradient>
          {/* Silver gradient for inactive lines */}
          <linearGradient id="ucl-silverGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(192, 192, 192, 0.2)" />
            <stop offset="50%" stopColor="rgba(192, 192, 192, 0.4)" />
            <stop offset="100%" stopColor="rgba(192, 192, 192, 0.2)" />
          </linearGradient>
          {/* Animated energy flow gradient */}
          <linearGradient id="ucl-energyFlowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#DAA520">
              <animate attributeName="stop-color" values="#DAA520;#FFE55C;#FFD700;#DAA520" dur="2s" repeatCount="indefinite" />
            </stop>
            <stop offset="25%" stopColor="#FFD700">
              <animate attributeName="stop-color" values="#FFD700;#DAA520;#FFE55C;#FFD700" dur="2s" repeatCount="indefinite" />
            </stop>
            <stop offset="50%" stopColor="#FFE55C">
              <animate attributeName="stop-color" values="#FFE55C;#FFD700;#DAA520;#FFE55C" dur="2s" repeatCount="indefinite" />
            </stop>
            <stop offset="75%" stopColor="#FFD700">
              <animate attributeName="stop-color" values="#FFD700;#FFE55C;#FFD700;#DAA520" dur="2s" repeatCount="indefinite" />
            </stop>
            <stop offset="100%" stopColor="#DAA520">
              <animate attributeName="stop-color" values="#DAA520;#FFD700;#FFE55C;#DAA520" dur="2s" repeatCount="indefinite" />
            </stop>
          </linearGradient>
          {/* Gold glow filter */}
          <filter id="ucl-glowGold" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* Intense gold glow for active lines */}
          <filter id="ucl-glowGoldIntense" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="6" result="blur1" />
            <feGaussianBlur stdDeviation="2" result="blur2" />
            <feMerge>
              <feMergeNode in="blur1" />
              <feMergeNode in="blur2" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* Silver glow filter */}
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

                      const defaultColor = 'rgba(192, 192, 192, 0.4)'
                      const activeColor = '#FFD700'

                      return (
                        <g key={`connector-${matchIndex}`}>
                          {/* Left vertical down to match */}
                          <line
                            x1={x1}
                            y1={CONNECTOR_HEIGHT / 2}
                            x2={x1}
                            y2={CONNECTOR_HEIGHT}
                            stroke={match1Done ? activeColor : defaultColor}
                            strokeWidth={match1Done ? '2.5' : '2'}
                            strokeLinecap="round"
                            style={match1Done ? { filter: 'drop-shadow(0 0 4px rgba(255, 215, 0, 0.8))' } : undefined}
                          />
                          {/* Right vertical down to match */}
                          <line
                            x1={x2}
                            y1={CONNECTOR_HEIGHT / 2}
                            x2={x2}
                            y2={CONNECTOR_HEIGHT}
                            stroke={match2Done ? activeColor : defaultColor}
                            strokeWidth={match2Done ? '2.5' : '2'}
                            strokeLinecap="round"
                            style={match2Done ? { filter: 'drop-shadow(0 0 4px rgba(255, 215, 0, 0.8))' } : undefined}
                          />
                          {/* Left horizontal (x1 to xMid) */}
                          <line
                            x1={x1}
                            y1={CONNECTOR_HEIGHT / 2}
                            x2={xMid}
                            y2={CONNECTOR_HEIGHT / 2}
                            stroke={match1Done ? activeColor : defaultColor}
                            strokeWidth={match1Done ? '2.5' : '2'}
                            strokeLinecap="round"
                            style={match1Done ? { filter: 'drop-shadow(0 0 4px rgba(255, 215, 0, 0.8))' } : undefined}
                          />
                          {/* Right horizontal (xMid to x2) */}
                          <line
                            x1={xMid}
                            y1={CONNECTOR_HEIGHT / 2}
                            x2={x2}
                            y2={CONNECTOR_HEIGHT / 2}
                            stroke={match2Done ? activeColor : defaultColor}
                            strokeWidth={match2Done ? '2.5' : '2'}
                            strokeLinecap="round"
                            style={match2Done ? { filter: 'drop-shadow(0 0 4px rgba(255, 215, 0, 0.8))' } : undefined}
                          />
                          {/* Corner glow effect */}
                          <circle
                            cx={xMid}
                            cy={CONNECTOR_HEIGHT / 2}
                            r={bothDone ? 4 : 3}
                            fill={bothDone ? activeColor : defaultColor}
                            style={bothDone ? { filter: 'drop-shadow(0 0 6px rgba(255, 215, 0, 0.9))' } : undefined}
                          />
                          {/* Center vertical up to next round */}
                          <line
                            x1={xMid}
                            y1={0}
                            x2={xMid}
                            y2={CONNECTOR_HEIGHT / 2}
                            stroke={bothDone ? activeColor : defaultColor}
                            strokeWidth={bothDone ? '2.5' : '2'}
                            strokeLinecap="round"
                            style={bothDone ? { filter: 'drop-shadow(0 0 4px rgba(255, 215, 0, 0.8))' } : undefined}
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

// Explosion particles data type - enhanced with color variety
interface ExplosionParticle {
  id: number
  x: number
  y: number
  duration: number
  color: 'gold' | 'silver' | 'white'
  size: number
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
  const [showExplosion, setShowExplosion] = useState(false)
  const [explosionParticles, setExplosionParticles] = useState<ExplosionParticle[]>([])
  const prevAnimationPhaseRef = useRef(0)

  // Track animation phase changes and trigger explosion effect when winner is revealed
  // Using ref to track previous phase avoids the synchronous setState issue
  useEffect(() => {
    const prevPhase = prevAnimationPhaseRef.current
    prevAnimationPhaseRef.current = animationPhase

    // Only trigger when crossing the threshold from below 2 to 2 or above
    if (isAnimating && animatingWinnerName && animationPhase >= 2 && prevPhase < 2) {
      // Use requestAnimationFrame to defer state update out of effect body
      requestAnimationFrame(() => {
        setShowExplosion(true)
        // Generate random explosion particles - ENHANCED: 24 particles with color variety
        const colors: Array<'gold' | 'silver' | 'white'> = ['gold', 'silver', 'white']
        const particles = Array.from({ length: 24 }, (_, i) => {
          const angle = (i / 24) * Math.PI * 2
          const distance = 40 + Math.random() * 80
          return {
            id: i,
            x: Math.cos(angle) * distance + (Math.random() - 0.5) * 30,
            y: Math.sin(angle) * distance * 0.7 - 20 + (Math.random() - 0.5) * 20,
            duration: 0.5 + Math.random() * 0.5,
            color: colors[Math.floor(Math.random() * colors.length)],
            size: 3 + Math.random() * 4,
          }
        })
        setExplosionParticles(particles)
      })
    }
  }, [isAnimating, animationPhase, animatingWinnerName])

  // Separate effect for cleanup timer
  useEffect(() => {
    if (showExplosion) {
      const timer = setTimeout(() => {
        setShowExplosion(false)
        setExplosionParticles([])
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [showExplosion])

  const handleTeamClick = (teamName: string) => {
    if (isAdmin && !hasWinner && !isMatchLoading && onSetWinner && teamName !== 'TBD') {
      onSetWinner(match.id, teamName)
    }
  }

  const getTeamClassName = (teamName: string, isWinner: boolean) => {
    const baseClass =
      'text-sm transition-all duration-300 select-none whitespace-nowrap tracking-wide font-medium'

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
      return 'ucl-crown ucl-crown-bounce'
    }
    return 'ucl-crown'
  }

  return (
    <div
      className={`
        relative flex items-center justify-center gap-3
        ${isLastRound ? 'ucl-match-card ucl-match-card-finals' : 'ucl-match-card'}
        ${isLastRound ? 'text-base py-4 px-5' : 'text-sm py-3 px-4'}
        ${isAnimating && animationPhase >= 1 ? 'ucl-match-highlight' : ''}
      `}
      style={{ width: `${width}px` }}
    >
      {/* Explosion particles - ENHANCED with color variety */}
      {showExplosion && (
        <div className="ucl-explosion-container">
          {explosionParticles.map((particle) => (
            <div
              key={particle.id}
              className={`ucl-explosion-particle ucl-explosion-particle-${particle.color}`}
              style={{
                left: '50%',
                top: '50%',
                width: `${particle.size}px`,
                height: `${particle.size}px`,
                '--x': `${particle.x}px`,
                '--y': `${particle.y}px`,
                '--duration': `${particle.duration}s`,
              } as React.CSSProperties}
            />
          ))}
        </div>
      )}

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
          <Crown
            className={`h-4 w-4 ${getCrownClassName(match.team1_name)}`}
            aria-hidden="true"
          />
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
          <Crown
            className={`h-4 w-4 ${getCrownClassName(match.team2_name)}`}
            aria-hidden="true"
          />
        )}
        {isMatchLoading && (
          <Loader2 className="h-3 w-3 animate-spin text-[var(--ucl-silver)]" aria-hidden="true" />
        )}
      </div>
    </div>
  )
}
