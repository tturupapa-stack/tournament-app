'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

// Animation timing constants
export const ANIMATION_TIMING = {
  /** Phase 1: Match highlight starts */
  HIGHLIGHT: 0,
  /** Phase 2: Winner name reveal with glow effect */
  WINNER_REVEAL: 500,
  /** Phase 3: Loser name fadeout with strikethrough */
  LOSER_FADE: 800,
  /** Phase 4: Crown icon bounce animation */
  CROWN_APPEAR: 1000,
  /** Phase 5: Connector line flows with gold color */
  LINE_ACTIVE: 1200,
  /** Phase 6: Next round typing effect */
  NEXT_ROUND: 1500,
  /** Animation complete, cleanup and reset */
  TOTAL_DURATION: 2500,
  /** Delay between queued animations */
  QUEUE_DELAY: 300,
  /** Delay before champion celebration */
  CHAMPION_DELAY: 3000,
} as const

export interface AnimatingMatch {
  matchId: string
  winnerName: string
  timestamp: number
}

interface UseWinnerAnimationOptions {
  onAnimationStart?: (match: AnimatingMatch) => void
  onAnimationComplete?: (match: AnimatingMatch) => void
}

interface UseWinnerAnimationReturn {
  animatingMatch: AnimatingMatch | null
  animationPhase: number
  queueAnimation: (match: AnimatingMatch) => void
  clearAnimations: () => void
  isProcessing: boolean
}

export function useWinnerAnimation(
  options: UseWinnerAnimationOptions = {}
): UseWinnerAnimationReturn {
  const { onAnimationStart, onAnimationComplete } = options

  const [animatingMatch, setAnimatingMatch] = useState<AnimatingMatch | null>(null)
  const [animationPhase, setAnimationPhase] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)

  const animationQueueRef = useRef<AnimatingMatch[]>([])
  const timeoutsRef = useRef<NodeJS.Timeout[]>([])
  const onAnimationStartRef = useRef(onAnimationStart)
  const onAnimationCompleteRef = useRef(onAnimationComplete)
  // Internal ref to track processing state without triggering re-renders in callbacks
  const isProcessingInternalRef = useRef(false)

  // Keep callback refs updated
  useEffect(() => {
    onAnimationStartRef.current = onAnimationStart
  }, [onAnimationStart])

  useEffect(() => {
    onAnimationCompleteRef.current = onAnimationComplete
  }, [onAnimationComplete])

  // Clear all pending timeouts
  const clearTimeouts = useCallback(() => {
    timeoutsRef.current.forEach((timeoutId) => clearTimeout(timeoutId))
    timeoutsRef.current = []
  }, [])

  // Helper to add timeout with tracking
  const addTimeout = useCallback((callback: () => void, delay: number) => {
    const timeoutId = setTimeout(callback, delay)
    timeoutsRef.current.push(timeoutId)
    return timeoutId
  }, [])

  // Ref to hold the processNextAnimation function for self-referencing
  const processNextAnimationRef = useRef<() => void>(() => {})

  // Process the next animation in queue
  const processNextAnimation = useCallback(() => {
    if (animationQueueRef.current.length === 0) {
      isProcessingInternalRef.current = false
      setIsProcessing(false)
      return
    }

    isProcessingInternalRef.current = true
    setIsProcessing(true)
    const nextAnimation = animationQueueRef.current.shift()

    if (nextAnimation) {
      setAnimatingMatch(nextAnimation)
      onAnimationStartRef.current?.(nextAnimation)

      // Animation sequence
      setAnimationPhase(1) // Start immediately

      addTimeout(() => setAnimationPhase(2), ANIMATION_TIMING.WINNER_REVEAL)
      addTimeout(() => setAnimationPhase(3), ANIMATION_TIMING.LOSER_FADE)
      addTimeout(() => setAnimationPhase(4), ANIMATION_TIMING.CROWN_APPEAR)
      addTimeout(() => setAnimationPhase(5), ANIMATION_TIMING.LINE_ACTIVE)
      addTimeout(() => setAnimationPhase(6), ANIMATION_TIMING.NEXT_ROUND)

      addTimeout(() => {
        setAnimationPhase(0)
        setAnimatingMatch(null)
        onAnimationCompleteRef.current?.(nextAnimation)

        // Process next animation after delay using ref
        addTimeout(() => {
          processNextAnimationRef.current()
        }, ANIMATION_TIMING.QUEUE_DELAY)
      }, ANIMATION_TIMING.TOTAL_DURATION)
    }
  }, [addTimeout])

  // Keep processNextAnimationRef updated
  useEffect(() => {
    processNextAnimationRef.current = processNextAnimation
  }, [processNextAnimation])

  // Queue a new animation
  const queueAnimation = useCallback(
    (match: AnimatingMatch) => {
      // Prevent duplicate animations for the same match
      const isDuplicate =
        animationQueueRef.current.some((m) => m.matchId === match.matchId) ||
        animatingMatch?.matchId === match.matchId

      if (isDuplicate) {
        return
      }

      animationQueueRef.current.push(match)

      // Start processing if not already (use internal ref for synchronous check)
      if (!isProcessingInternalRef.current) {
        processNextAnimation()
      }
    },
    [animatingMatch, processNextAnimation]
  )

  // Clear all animations (both current and queued)
  const clearAnimations = useCallback(() => {
    clearTimeouts()
    animationQueueRef.current = []
    isProcessingInternalRef.current = false
    setIsProcessing(false)
    setAnimatingMatch(null)
    setAnimationPhase(0)
  }, [clearTimeouts])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimeouts()
    }
  }, [clearTimeouts])

  return {
    animatingMatch,
    animationPhase,
    queueAnimation,
    clearAnimations,
    isProcessing,
  }
}
