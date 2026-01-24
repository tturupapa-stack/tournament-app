'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

// Type definitions for Supabase payload
export interface BracketMatchPayload {
  new: {
    id: string
    round: number
    match_order: number
    team1_name: string
    team2_name: string
    winner_name: string | null
    tournament_id: string
  }
  old: {
    id: string
    round: number
    match_order: number
    team1_name: string
    team2_name: string
    winner_name: string | null
    tournament_id: string
  }
}

// Type guard for BracketMatchPayload
export const isBracketMatchPayload = (payload: unknown): payload is BracketMatchPayload => {
  if (payload === null || typeof payload !== 'object') return false

  const p = payload as Record<string, unknown>
  if (!('new' in p) || p.new === null || typeof p.new !== 'object') return false

  const newMatch = p.new as Record<string, unknown>
  return (
    typeof newMatch.id === 'string' &&
    typeof newMatch.round === 'number' &&
    typeof newMatch.match_order === 'number' &&
    typeof newMatch.team1_name === 'string' &&
    typeof newMatch.team2_name === 'string' &&
    (newMatch.winner_name === null || typeof newMatch.winner_name === 'string') &&
    typeof newMatch.tournament_id === 'string'
  )
}

// UUID validation
export const isValidUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

export type SubscriptionStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

interface UseRealtimeSubscriptionOptions {
  tournamentId: string
  onMatchUpdate: (payload: BracketMatchPayload) => void
  onDataRefresh?: (matches: BracketMatchPayload['new'][]) => void
  onStatusChange?: (status: SubscriptionStatus) => void
  enablePollingFallback?: boolean
  pollingInterval?: number
}

interface UseRealtimeSubscriptionReturn {
  status: SubscriptionStatus
  error: string | null
  reconnect: () => void
}

export function useRealtimeSubscription({
  tournamentId,
  onMatchUpdate,
  onDataRefresh,
  onStatusChange,
  enablePollingFallback = true,
  pollingInterval = 3000,
}: UseRealtimeSubscriptionOptions): UseRealtimeSubscriptionReturn {
  const [status, setStatus] = useState<SubscriptionStatus>('connecting')
  const [error, setError] = useState<string | null>(null)

  const channelRef = useRef<RealtimeChannel | null>(null)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const lastDataHashRef = useRef<string>('')
  const maxReconnectAttempts = 5
  const onMatchUpdateRef = useRef(onMatchUpdate)
  const onDataRefreshRef = useRef(onDataRefresh)
  const onStatusChangeRef = useRef(onStatusChange)

  // Keep callback refs updated
  useEffect(() => {
    onMatchUpdateRef.current = onMatchUpdate
  }, [onMatchUpdate])

  useEffect(() => {
    onDataRefreshRef.current = onDataRefresh
  }, [onDataRefresh])

  useEffect(() => {
    onStatusChangeRef.current = onStatusChange
  }, [onStatusChange])

  const updateStatus = useCallback((newStatus: SubscriptionStatus) => {
    setStatus(newStatus)
    onStatusChangeRef.current?.(newStatus)
  }, [])

  const clearPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }
  }, [])

  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
  }, [])

  const startPollingFallback = useCallback(async () => {
    if (!enablePollingFallback) return

    clearPolling()

    console.log('Starting polling fallback for realtime updates')

    const poll = async () => {
      try {
        const response = await fetch(`/api/tournaments/${tournamentId}/bracket`)
        if (response.ok) {
          const data = await response.json()

          // Create a simple hash to detect changes
          const dataHash = JSON.stringify(data.map((m: BracketMatchPayload['new']) => ({
            id: m.id,
            winner: m.winner_name,
            t1: m.team1_name,
            t2: m.team2_name
          })))

          // Only update if data changed
          if (dataHash !== lastDataHashRef.current) {
            console.log('Polling: data changed, updating...')
            lastDataHashRef.current = dataHash

            // Call the data refresh callback with all matches
            if (onDataRefreshRef.current) {
              onDataRefreshRef.current(data)
            }
          }
        }
      } catch (err) {
        console.error('Polling error:', err)
      }
    }

    // Run immediately first
    poll()

    pollingIntervalRef.current = setInterval(poll, pollingInterval)
  }, [enablePollingFallback, tournamentId, pollingInterval, clearPolling])

  const cleanup = useCallback(() => {
    clearPolling()
    clearReconnectTimeout()

    if (channelRef.current) {
      const supabase = createClient()
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }
  }, [clearPolling, clearReconnectTimeout])

  // Ref to hold the connect function for self-referencing in callbacks
  const connectRef = useRef<() => void>(() => {})

  const connect = useCallback(() => {
    // Validate UUID before connecting
    if (!isValidUUID(tournamentId)) {
      const errorMessage = 'Invalid tournament ID format'
      if (process.env.NODE_ENV === 'development') {
        console.error(`[useRealtimeSubscription] UUID validation failed:`, {
          tournamentId,
          expectedFormat: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
        })
      }
      setError(errorMessage)
      updateStatus('error')
      return
    }

    cleanup()
    updateStatus('connecting')
    setError(null)

    const supabase = createClient()

    const channel = supabase
      .channel(`bracket-changes-${tournamentId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bracket_matches',
          filter: `tournament_id=eq.${tournamentId}`,
        },
        (payload: unknown) => {
          if (isBracketMatchPayload(payload)) {
            onMatchUpdateRef.current(payload)
          } else {
            console.warn('Invalid payload received:', payload)
          }
        }
      )
      .on('system', { event: '*' }, (payload) => {
        console.log('Realtime system event:', payload)
      })
      .subscribe((subscriptionStatus, err) => {
        if (subscriptionStatus === 'SUBSCRIBED') {
          console.log('Realtime connected successfully')
          updateStatus('connected')
          clearPolling()
          reconnectAttemptsRef.current = 0
        } else if (subscriptionStatus === 'CLOSED') {
          console.warn('Realtime connection closed')
          updateStatus('disconnected')

          // Attempt reconnection with exponential backoff
          if (reconnectAttemptsRef.current < maxReconnectAttempts) {
            const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000)
            reconnectAttemptsRef.current += 1
            console.log(`Attempting reconnection in ${delay}ms (attempt ${reconnectAttemptsRef.current})`)

            reconnectTimeoutRef.current = setTimeout(() => {
              connectRef.current()
            }, delay)
          } else {
            console.log('Max reconnection attempts reached, falling back to polling')
            startPollingFallback()
          }
        } else if (subscriptionStatus === 'CHANNEL_ERROR') {
          console.error('Realtime channel error:', err)
          setError(err?.message || 'Connection error')
          updateStatus('error')
          startPollingFallback()
        }
      })

    channelRef.current = channel
  }, [tournamentId, cleanup, updateStatus, clearPolling, startPollingFallback])

  // Keep connectRef updated
  useEffect(() => {
    connectRef.current = connect
  }, [connect])

  const reconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0
    connect()
  }, [connect])

  // Track status in ref for timeout check (avoid dependency issues)
  const statusRef = useRef(status)
  useEffect(() => {
    statusRef.current = status
  }, [status])

  useEffect(() => {
    if (!tournamentId) return

    let fallbackTimeout: NodeJS.Timeout | null = null
    let isCleanedUp = false

    // Use requestAnimationFrame to defer connect call out of effect body
    const frameId = requestAnimationFrame(() => {
      if (!isCleanedUp) {
        connectRef.current()
      }
    })

    // Start polling fallback after timeout if realtime doesn't connect
    fallbackTimeout = setTimeout(() => {
      if (!isCleanedUp && statusRef.current !== 'connected') {
        console.log('Realtime connection timeout, starting polling fallback')
        startPollingFallback()
      }
    }, 5000)

    return () => {
      isCleanedUp = true
      cancelAnimationFrame(frameId)
      if (fallbackTimeout) clearTimeout(fallbackTimeout)
      cleanup()
    }
  }, [tournamentId, cleanup, startPollingFallback])

  return {
    status,
    error,
    reconnect,
  }
}
