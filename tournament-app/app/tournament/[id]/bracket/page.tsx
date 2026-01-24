'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, AlertCircle, RefreshCw, WifiOff, Trophy } from 'lucide-react'
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
  type: 'normal' | 'large' | 'gold'
}

// Shooting star data type
interface ShootingStarData {
  id: number
  left: string
  top: string
  duration: number
  delay: number
  angle: number
}

// Helper function to generate star data - ENHANCED
function generateStars(count: number): StarData[] {
  return Array.from({ length: count }, (_, i) => {
    const random = Math.random()
    let type: 'normal' | 'large' | 'gold' = 'normal'
    // 5% gold, 15% large, 80% normal
    if (random > 0.95) type = 'gold'
    else if (random > 0.80) type = 'large'

    // Enhanced size variety: 1px ~ 4px
    let size: number
    if (type === 'gold') {
      size = Math.random() * 1.5 + 3 // 3px ~ 4.5px
    } else if (type === 'large') {
      size = Math.random() * 1.5 + 2 // 2px ~ 3.5px
    } else {
      size = Math.random() * 1.5 + 0.8 // 0.8px ~ 2.3px
    }

    // Enhanced duration variety: 1s ~ 6s
    let duration: number
    if (type === 'gold') {
      duration = Math.random() * 2 + 4 // 4s ~ 6s
    } else if (type === 'large') {
      duration = Math.random() * 2 + 2.5 // 2.5s ~ 4.5s
    } else {
      duration = Math.random() * 4 + 1 // 1s ~ 5s
    }

    return {
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      size,
      duration,
      delay: Math.random() * 10, // more varied delay
      opacity: type === 'gold' ? 0.95 : type === 'large' ? 0.8 : Math.random() * 0.6 + 0.2,
      type,
    }
  })
}

// Helper function to generate shooting stars
function generateShootingStars(count: number): ShootingStarData[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: `${Math.random() * 70}%`,
    top: `${Math.random() * 50}%`,
    duration: Math.random() * 1.5 + 2, // 2s ~ 3.5s
    delay: Math.random() * 15 + i * 8, // staggered, every 8s+ apart
    angle: Math.random() * 20 - 10, // -10deg ~ +10deg variation
  }))
}

// Starfield Component - Generate twinkling stars with variety (client-side only)
function Starfield({ count = 100, shootingStarCount = 3 }: { count?: number; shootingStarCount?: number }) {
  const [stars, setStars] = useState<StarData[]>([])
  const [shootingStars, setShootingStars] = useState<ShootingStarData[]>([])
  const [shootingStarKey, setShootingStarKey] = useState(0)

  useEffect(() => {
    // Generate stars only on client side to avoid hydration mismatch
    setStars(generateStars(count))
    setShootingStars(generateShootingStars(shootingStarCount))
  }, [count, shootingStarCount])

  // Regenerate shooting stars periodically for continuous effect
  useEffect(() => {
    const interval = setInterval(() => {
      setShootingStars(generateShootingStars(shootingStarCount))
      setShootingStarKey(prev => prev + 1)
    }, 30000) // Every 30 seconds

    return () => clearInterval(interval)
  }, [shootingStarCount])

  if (stars.length === 0) return <div className="ucl-starfield" aria-hidden="true" />

  return (
    <div className="ucl-starfield" aria-hidden="true">
      {/* Regular stars */}
      {stars.map((star) => (
        <div
          key={star.id}
          className={`ucl-star ${star.type === 'large' ? 'ucl-star-large' : ''} ${star.type === 'gold' ? 'ucl-star-gold' : ''}`}
          style={
            {
              left: star.left,
              top: star.top,
              width: `${star.size}px`,
              height: `${star.size}px`,
              opacity: star.opacity,
              '--duration': `${star.duration}s`,
              '--delay': `${star.delay}s`,
              '--star-size': `${star.size}px`,
            } as CustomCSSProperties
          }
        />
      ))}
      {/* Shooting stars */}
      {shootingStars.map((shootingStar) => (
        <div
          key={`shooting-${shootingStarKey}-${shootingStar.id}`}
          className="ucl-shooting-star"
          style={
            {
              left: shootingStar.left,
              top: shootingStar.top,
              '--duration': `${shootingStar.duration}s`,
              '--delay': `${shootingStar.delay}s`,
              transform: `rotate(${-45 + shootingStar.angle}deg)`,
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
  isSparkle: boolean
}

// Helper function to generate particle data
function generateParticles(count: number): ParticleData[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    duration: Math.random() * 18 + 12,
    delay: Math.random() * 15,
    size: Math.random() * 4 + 2,
    isSparkle: Math.random() > 0.7,
  }))
}

// Floating Particles Component - Golden dust with sparkles (client-side only)
function FloatingParticles({ count = 20 }: { count?: number }) {
  const [particles, setParticles] = useState<ParticleData[]>([])

  useEffect(() => {
    // Generate particles only on client side to avoid hydration mismatch
    setParticles(generateParticles(count))
  }, [count])

  if (particles.length === 0) return <div className="ucl-particles" aria-hidden="true" />

  return (
    <div className="ucl-particles" aria-hidden="true">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className={`ucl-particle ${particle.isSparkle ? 'ucl-particle-sparkle' : ''}`}
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

// Helper function to generate confetti data - ENHANCED with more colors
function generateConfetti(count: number): ConfettiData[] {
  const colors = ['gold', 'silver', 'white', 'blue'] // Added blue
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    duration: Math.random() * 2.5 + 2.5, // longer duration for slower fall
    delay: Math.random() * 1.5,
    size: Math.random() * 10 + 6, // slightly larger
    color: colors[Math.floor(Math.random() * colors.length)],
    rotation: Math.random() * 360,
    isCircle: Math.random() > 0.6, // more rectangles
  }))
}

// Confetti Component - Champion celebration (client-side only)
function Confetti({ count = 50 }: { count?: number }) {
  const [confettiPieces, setConfettiPieces] = useState<ConfettiData[]>([])

  useEffect(() => {
    // Generate confetti only on client side to avoid hydration mismatch
    setConfettiPieces(generateConfetti(count))
  }, [count])

  if (confettiPieces.length === 0) return null

  return (
    <div className="ucl-confetti-container" aria-hidden="true">
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

// Firework data type
interface FireworkData {
  id: number
  x: string
  y: string
  particles: Array<{
    id: number
    tx: number
    ty: number
    duration: number
    delay: number
    color: string
  }>
}

// Firework Component - ENHANCED with more particles and colors
function Fireworks({ count = 5 }: { count?: number }) {
  const [fireworks, setFireworks] = useState<FireworkData[]>([])

  useEffect(() => {
    // Enhanced color palette: gold, silver, white, blue
    const colors = ['#FFD700', '#FFE55C', '#FFFFFF', '#C0C0C0', '#4a90d9', '#FFF8DC']
    const newFireworks: FireworkData[] = []

    for (let i = 0; i < count; i++) {
      // More particles per firework (18 instead of 12)
      const particles = Array.from({ length: 18 }, (_, j) => {
        const angle = (j / 18) * Math.PI * 2
        const distance = 70 + Math.random() * 80 // larger spread
        return {
          id: j,
          tx: Math.cos(angle) * distance + (Math.random() - 0.5) * 20,
          ty: Math.sin(angle) * distance + (Math.random() - 0.5) * 20,
          duration: 0.7 + Math.random() * 0.5,
          delay: i * 0.25 + Math.random() * 0.15, // slightly faster stagger
          color: colors[Math.floor(Math.random() * colors.length)],
        }
      })

      newFireworks.push({
        id: i,
        x: `${15 + Math.random() * 70}%`, // wider horizontal spread
        y: `${15 + Math.random() * 50}%`, // wider vertical spread
        particles,
      })
    }

    setFireworks(newFireworks)
  }, [count])

  return (
    <div className="ucl-firework-container" aria-hidden="true">
      {fireworks.map((fw) => (
        <div key={fw.id} style={{ position: 'absolute', left: fw.x, top: fw.y }}>
          {fw.particles.map((p) => (
            <div
              key={p.id}
              className="ucl-firework"
              style={{
                background: p.color,
                boxShadow: `0 0 6px ${p.color}`,
                '--tx': `${p.tx}px`,
                '--ty': `${p.ty}px`,
                '--duration': `${p.duration}s`,
                '--delay': `${p.delay}s`,
              } as React.CSSProperties}
            />
          ))}
        </div>
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
  const onCompleteRef = useRef(onComplete)
  const isCleanedUpRef = useRef(false)

  // Keep callback ref updated without triggering effect
  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  useEffect(() => {
    // Reset cleanup flag on mount
    isCleanedUpRef.current = false

    // Clear any existing timeouts to prevent accumulation
    timeoutsRef.current.forEach(clearTimeout)
    timeoutsRef.current = []

    const flashTimer = setTimeout(() => {
      if (!isCleanedUpRef.current) setPhase('reveal')
    }, 1000)
    const fadeTimer = setTimeout(() => {
      if (!isCleanedUpRef.current) setPhase('fadeout')
    }, 5000)
    const completeTimer = setTimeout(() => {
      if (!isCleanedUpRef.current) onCompleteRef.current()
    }, 5500)

    timeoutsRef.current = [flashTimer, fadeTimer, completeTimer]

    return () => {
      isCleanedUpRef.current = true
      timeoutsRef.current.forEach(clearTimeout)
      timeoutsRef.current = []
    }
  }, []) // Empty dependency - only run on mount/unmount

  return (
    <>
      {/* Gold Flash - Intense burst effect */}
      {phase === 'flash' && <div className="ucl-gold-flash-overlay" />}

      {/* Fireworks - ENHANCED: 12 fireworks (increased from 8) */}
      <Fireworks count={12} />

      {/* Confetti - ENHANCED: 120 pieces (increased from 50 default) */}
      <Confetti count={120} />

      {/* Champion Container */}
      <div className={`ucl-champion-container ${phase === 'fadeout' ? 'ucl-celebration-fadeout' : ''}`}>
        <Trophy className="h-36 w-36 text-[var(--ucl-gold)] ucl-champion-trophy" />
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
      if (process.env.NODE_ENV === 'development') {
        console.error('[BracketPage] UUID validation failed:', {
          id,
          expectedFormat: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
        })
      }
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
        <div className="ucl-nebula-overlay" />
        <Starfield count={80} />
        <div className="ucl-geometric-pattern" />
        <div className="ucl-vignette" />
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
        <div className="ucl-nebula-overlay" />
        <Starfield count={60} />
        <div className="ucl-geometric-pattern" />
        <div className="ucl-vignette" />

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
      <div className="ucl-nebula-overlay" />
      <Starfield count={150} />
      <FloatingParticles count={30} />
      <div className="ucl-geometric-pattern" />
      <div className="ucl-vignette" />

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
        <div className="mb-12 text-center">
          <div className="flex items-center justify-center gap-5 mb-4">
            <Trophy className="h-10 w-10 text-[var(--ucl-gold)] ucl-trophy" />
            <h1 className="ucl-title-xl text-3xl md:text-5xl">
              {tournament?.name}
            </h1>
            <Trophy className="h-10 w-10 text-[var(--ucl-gold)] ucl-trophy" />
          </div>
          <p className="ucl-title-gold text-xl font-semibold tracking-[0.4em] uppercase">
            {tournament?.game}
          </p>
        </div>

        {/* Bracket or Empty State */}
        {matches.length === 0 ? (
          <div className="ucl-empty-state py-20 text-center max-w-lg mx-auto">
            <Trophy className="h-20 w-20 mx-auto mb-6 text-[var(--ucl-silver)] opacity-50" />
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
