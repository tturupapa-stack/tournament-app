'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Trophy, Loader2, AlertCircle, RefreshCw, WifiOff } from 'lucide-react'
import { TournamentBracket, BracketMatch } from '@/components/bracket/TournamentBracket'
import {
  useRealtimeSubscription,
  useWinnerAnimation,
  isValidUUID,
  ANIMATION_TIMING,
  type BracketMatchPayload,
  type SubscriptionStatus,
} from '@/hooks'

interface Tournament {
  id: string
  name: string
  game: string
}

// CSS Custom Properties interface for type-safe inline styles
interface CustomCSSProperties extends React.CSSProperties {
  '--duration'?: string
  '--delay'?: string
}

// Star data type
interface StarData {
  id: number
  left: string
  top: string
  size: number
  duration: number
  delay: number
  opacity: number
}

// Starfield Component - Generate twinkling stars (client-side only to avoid hydration mismatch)
function Starfield({ count = 100 }: { count?: number }) {
  const [stars, setStars] = useState<StarData[]>([])

  useEffect(() => {
    // Generate stars only on client side to avoid hydration mismatch
    setStars(
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        size: Math.random() * 2 + 1,
        duration: Math.random() * 3 + 2,
        delay: Math.random() * 5,
        opacity: Math.random() * 0.5 + 0.3,
      }))
    )
  }, [count])

  if (stars.length === 0) return <div className="ucl-starfield" />

  return (
    <div className="ucl-starfield">
      {stars.map((star) => (
        <div
          key={star.id}
          className="ucl-star"
          style={
            {
              left: star.left,
              top: star.top,
              width: `${star.size}px`,
              height: `${star.size}px`,
              opacity: star.opacity,
              '--duration': `${star.duration}s`,
              '--delay': `${star.delay}s`,
            } as CustomCSSProperties
          }
        />
      ))}
    </div>
  )
}

// Particle data type
interface ParticleData {
  id: number
  left: string
  duration: number
  delay: number
  size: number
}

// Floating Particles Component - Subtle gold particles (client-side only)
function FloatingParticles({ count = 15 }: { count?: number }) {
  const [particles, setParticles] = useState<ParticleData[]>([])

  useEffect(() => {
    setParticles(
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        duration: Math.random() * 20 + 15,
        delay: Math.random() * 10,
        size: Math.random() * 3 + 2,
      }))
    )
  }, [count])

  if (particles.length === 0) return <div className="ucl-particles" />

  return (
    <div className="ucl-particles">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="ucl-particle"
          style={
            {
              left: particle.left,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              '--duration': `${particle.duration}s`,
              '--delay': `${particle.delay}s`,
            } as CustomCSSProperties
          }
        />
      ))}
    </div>
  )
}

// Confetti data type
interface ConfettiData {
  id: number
  left: string
  duration: number
  delay: number
  size: number
  color: string
  rotation: number
  isCircle: boolean
}

// Confetti Component - Champion celebration (client-side only)
function Confetti({ count = 50 }: { count?: number }) {
  const [confettiPieces, setConfettiPieces] = useState<ConfettiData[]>([])

  useEffect(() => {
    const colors = ['gold', 'silver', 'white']
    setConfettiPieces(
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        duration: Math.random() * 2 + 2,
        delay: Math.random() * 1,
        size: Math.random() * 8 + 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        isCircle: Math.random() > 0.5,
      }))
    )
  }, [count])

  if (confettiPieces.length === 0) return null

  return (
    <div className="ucl-confetti-container">
      {confettiPieces.map((piece) => (
        <div
          key={piece.id}
          className={`ucl-confetti ucl-confetti-${piece.color}`}
          style={
            {
              left: piece.left,
              width: `${piece.size}px`,
              height: `${piece.size}px`,
              '--duration': `${piece.duration}s`,
              '--delay': `${piece.delay}s`,
              transform: `rotate(${piece.rotation}deg)`,
              borderRadius: piece.isCircle ? '50%' : '0',
            } as CustomCSSProperties
          }
        />
      ))}
    </div>
  )
}

// Champion Celebration Overlay
interface ChampionCelebrationProps {
  championName: string
  onComplete: () => void
}

function ChampionCelebration({ championName, onComplete }: ChampionCelebrationProps) {
  const [phase, setPhase] = useState<'flash' | 'reveal' | 'fadeout'>('flash')
  const timeoutsRef = useRef<NodeJS.Timeout[]>([])

  useEffect(() => {
    // Clear previous timeouts on re-render
    timeoutsRef.current.forEach(clearTimeout)
    timeoutsRef.current = []

    const flashTimer = setTimeout(() => setPhase('reveal'), 1000)
    const fadeTimer = setTimeout(() => setPhase('fadeout'), 5000)
    const completeTimer = setTimeout(() => onComplete(), 5500)

    timeoutsRef.current.push(flashTimer, fadeTimer, completeTimer)

    return () => {
      timeoutsRef.current.forEach(clearTimeout)
      timeoutsRef.current = []
    }
  }, [onComplete])

  return (
    <>
      {/* Gold Flash */}
      {phase === 'flash' && <div className="ucl-gold-flash-overlay" />}

      {/* Confetti */}
      <Confetti count={100} />

      {/* Champion Container */}
      <div className={`ucl-champion-container ${phase === 'fadeout' ? 'ucl-celebration-fadeout' : ''}`}>
        <Trophy className="h-32 w-32 text-[var(--ucl-gold)] ucl-champion-trophy" />
        <div className="ucl-champion-text">CHAMPION</div>
        <div className="ucl-champion-name">{championName}</div>
      </div>
    </>
  )
}

// Connection Status Badge
function ConnectionBadge({
  status,
  onReconnect,
}: {
  status: SubscriptionStatus
  onReconnect: () => void
}) {
  if (status === 'connected') return null

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div
        className={`
          flex items-center gap-2 px-4 py-2 rounded-lg backdrop-blur-sm
          ${status === 'connecting' ? 'bg-yellow-500/20 border border-yellow-500/50 text-yellow-300' : ''}
          ${status === 'disconnected' ? 'bg-orange-500/20 border border-orange-500/50 text-orange-300' : ''}
          ${status === 'error' ? 'bg-red-500/20 border border-red-500/50 text-red-300' : ''}
        `}
      >
        {status === 'connecting' && (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Connecting...</span>
          </>
        )}
        {(status === 'disconnected' || status === 'error') && (
          <>
            <WifiOff className="h-4 w-4" />
            <span className="text-sm">
              {status === 'error' ? 'Connection error' : 'Disconnected'}
            </span>
            <button
              onClick={onReconnect}
              className="ml-2 px-2 py-1 text-xs bg-white/10 hover:bg-white/20 rounded transition-colors"
            >
              Reconnect
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default function BracketPage() {
  const params = useParams()
  const id = params.id as string

  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [matches, setMatches] = useState<BracketMatch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Champion celebration states
  const [showChampionCelebration, setShowChampionCelebration] = useState(false)
  const [championName, setChampionName] = useState<string | null>(null)
  const championTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Winner animation hook
  const {
    animatingMatch,
    animationPhase,
    queueAnimation,
    clearAnimations,
  } = useWinnerAnimation()

  // Handle animation complete callback
  const handleAnimationComplete = useCallback(() => {
    // Animation complete handling is done internally by the hook
  }, [])

  // Handle realtime match updates
  const handleMatchUpdate = useCallback(
    (payload: BracketMatchPayload) => {
      const updatedMatch = payload.new

      // If a winner was just set
      if (updatedMatch.winner_name) {
        // Queue the animation
        queueAnimation({
          matchId: updatedMatch.id,
          winnerName: updatedMatch.winner_name,
          timestamp: Date.now(),
        })

        // Update matches state with new data
        setMatches((prevMatches) => {
          const newMatches = prevMatches.map((match) => {
            if (match.id === updatedMatch.id) {
              return {
                ...match,
                team1_name: updatedMatch.team1_name,
                team2_name: updatedMatch.team2_name,
                winner_name: updatedMatch.winner_name,
              }
            }
            return match
          })

          // Check if this is a final match - trigger champion celebration
          const maxRound = Math.max(...newMatches.map((m) => m.round))
          const isFinal = updatedMatch.round === maxRound

          if (isFinal && updatedMatch.winner_name) {
            // Clear any previous champion timeout
            if (championTimeoutRef.current) {
              clearTimeout(championTimeoutRef.current)
            }

            // Delay champion celebration to allow winner animation to play first
            championTimeoutRef.current = setTimeout(() => {
              setChampionName(updatedMatch.winner_name)
              setShowChampionCelebration(true)
            }, ANIMATION_TIMING.CHAMPION_DELAY)
          }

          return newMatches
        })
      } else {
        // Just update the match without animation (e.g., team name updates)
        setMatches((prevMatches) =>
          prevMatches.map((match) => {
            if (match.id === updatedMatch.id) {
              return {
                ...match,
                team1_name: updatedMatch.team1_name,
                team2_name: updatedMatch.team2_name,
                winner_name: updatedMatch.winner_name,
              }
            }
            return match
          })
        )
      }
    },
    [queueAnimation]
  )

  // Handle polling data refresh (when realtime is not available)
  const handleDataRefresh = useCallback(
    (newMatches: BracketMatch[]) => {
      setMatches((prevMatches) => {
        // Find matches with new winners (for animation)
        newMatches.forEach((newMatch) => {
          const prevMatch = prevMatches.find((m) => m.id === newMatch.id)
          if (prevMatch && !prevMatch.winner_name && newMatch.winner_name) {
            // New winner detected - queue animation
            queueAnimation({
              matchId: newMatch.id,
              winnerName: newMatch.winner_name,
              timestamp: Date.now(),
            })

            // Check if this is a final match
            const maxRound = Math.max(...newMatches.map((m) => m.round))
            if (newMatch.round === maxRound) {
              if (championTimeoutRef.current) {
                clearTimeout(championTimeoutRef.current)
              }
              championTimeoutRef.current = setTimeout(() => {
                setChampionName(newMatch.winner_name)
                setShowChampionCelebration(true)
              }, ANIMATION_TIMING.CHAMPION_DELAY)
            }
          }
        })

        return newMatches
      })
    },
    [queueAnimation]
  )

  // Realtime subscription hook
  const { status: connectionStatus, reconnect } = useRealtimeSubscription({
    tournamentId: id,
    onMatchUpdate: handleMatchUpdate,
    onDataRefresh: handleDataRefresh,
    enablePollingFallback: true,
    pollingInterval: 2000,
  })

  // Fetch initial data
  const fetchData = useCallback(async () => {
    // Validate UUID before fetching
    if (!isValidUUID(id)) {
      setError('Invalid tournament ID')
      setLoading(false)
      return
    }

    setError(null)
    setLoading(true)
    try {
      const [tournamentRes, bracketRes] = await Promise.all([
        fetch(`/api/tournaments/${id}`),
        fetch(`/api/tournaments/${id}/bracket`),
      ])

      if (!tournamentRes.ok || !bracketRes.ok) {
        throw new Error('Failed to load data')
      }

      const tournamentData = await tournamentRes.json()
      const bracketData = await bracketRes.json()

      setTournament(tournamentData)
      setMatches(bracketData)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearAnimations()
      if (championTimeoutRef.current) {
        clearTimeout(championTimeoutRef.current)
      }
    }
  }, [clearAnimations])

  // Handle champion celebration complete
  const handleChampionCelebrationComplete = useCallback(() => {
    setShowChampionCelebration(false)
    setChampionName(null)
  }, [])

  // Loading State with UCL Theme
  if (loading) {
    return (
      <div className="min-h-screen ucl-bracket-bg flex items-center justify-center">
        <Starfield count={80} />
        <div className="ucl-geometric-pattern" />
        <div className="relative z-10 flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-[var(--ucl-silver)]" />
          <span className="ucl-round-label tracking-widest">LOADING...</span>
        </div>
      </div>
    )
  }

  // Error State with UCL Theme
  if (error) {
    return (
      <div className="min-h-screen ucl-bracket-bg">
        <Starfield count={60} />
        <div className="ucl-geometric-pattern" />

        {/* Header */}
        <header className="ucl-header relative z-10">
          <div className="container mx-auto px-6 py-5">
            <Link
              href={`/tournament/${id}`}
              className="ucl-back-link inline-flex items-center gap-2 text-sm tracking-wide"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Tournament
            </Link>
          </div>
        </header>

        {/* Error Content */}
        <main className="container mx-auto px-6 py-12 relative z-10">
          <div className="ucl-error-card py-16 text-center max-w-md mx-auto">
            <AlertCircle className="h-14 w-14 mx-auto mb-5 text-red-400" />
            <p className="text-red-400 text-lg font-semibold mb-6 tracking-wide">{error}</p>
            <button
              onClick={fetchData}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[var(--ucl-glass-bg)] border border-[var(--ucl-glass-border)] text-[var(--ucl-silver-light)] hover:border-[var(--ucl-silver)] hover:text-white transition-all duration-300"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen ucl-bracket-bg">
      {/* Background Effects */}
      <Starfield count={120} />
      <FloatingParticles count={20} />
      <div className="ucl-geometric-pattern" />

      {/* Header */}
      <header className="ucl-header relative z-10">
        <div className="container mx-auto px-6 py-5">
          <Link
            href={`/tournament/${id}`}
            className="ucl-back-link inline-flex items-center gap-2 text-sm tracking-wide"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Tournament
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-10 relative z-10">
        {/* Title Section */}
        <div className="mb-10 text-center">
          <div className="flex items-center justify-center gap-4 mb-3">
            <Trophy className="h-8 w-8 text-[var(--ucl-gold)]" />
            <h1 className="ucl-title text-3xl md:text-4xl font-bold tracking-wide">
              {tournament?.name}
            </h1>
            <Trophy className="h-8 w-8 text-[var(--ucl-gold)]" />
          </div>
          <p className="ucl-title-gold text-lg font-semibold tracking-[0.3em] uppercase">
            {tournament?.game}
          </p>
        </div>

        {/* Bracket or Empty State */}
        {matches.length === 0 ? (
          <div className="ucl-empty-state py-20 text-center max-w-lg mx-auto">
            <Trophy className="h-16 w-16 mx-auto mb-6 text-[var(--ucl-silver)] opacity-50" />
            <p className="text-[var(--ucl-silver)] text-lg tracking-wide">
              The bracket has not been generated yet
            </p>
          </div>
        ) : (
          <TournamentBracket
            matches={matches}
            isAdmin={false}
            animatingMatch={animatingMatch}
            animationPhase={animationPhase}
            onAnimationComplete={handleAnimationComplete}
          />
        )}
      </main>

      {/* Connection Status Badge */}
      <ConnectionBadge status={connectionStatus} onReconnect={reconnect} />

      {/* Champion Celebration Overlay */}
      {showChampionCelebration && championName && (
        <ChampionCelebration
          championName={championName}
          onComplete={handleChampionCelebrationComplete}
        />
      )}

      {/* Footer Decoration */}
      <div className="fixed bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[var(--ucl-dark-blue)] to-transparent pointer-events-none z-0" />
    </div>
  )
}
