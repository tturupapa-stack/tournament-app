'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { ArrowLeft, Trophy, Loader2, RefreshCw, AlertCircle } from 'lucide-react'
import { TournamentBracket, BracketMatch } from '@/components/bracket/TournamentBracket'

interface Tournament {
  id: string
  name: string
  game: string
}

export default function AdminBracketPage() {
  const params = useParams()
  const id = params.id as string

  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [matches, setMatches] = useState<BracketMatch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setError(null)
    setLoading(true)
    try {
      const [tournamentRes, bracketRes] = await Promise.all([
        fetch(`/api/tournaments/${id}`),
        fetch(`/api/tournaments/${id}/bracket`)
      ])

      if (!tournamentRes.ok || !bracketRes.ok) {
        throw new Error('데이터를 불러오는데 실패했습니다')
      }

      const tournamentData = await tournamentRes.json()
      const bracketData = await bracketRes.json()

      setTournament(tournamentData)
      setMatches(bracketData)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  async function handleSetWinner(matchId: string, winnerName: string) {
    setActionLoading(matchId)
    try {
      const res = await fetch(`/api/tournaments/${id}/bracket`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId, winnerName })
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || '결과 저장에 실패했습니다')
      }

      toast.success(`${winnerName} 승리!`)
      fetchData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '결과 저장에 실패했습니다')
    } finally {
      setActionLoading(null)
    }
  }

  async function handleRegenerateBracket() {
    if (!confirm('대진표를 재생성하면 기존 결과가 모두 삭제됩니다. 계속하시겠습니까?')) {
      return
    }

    setActionLoading('regenerate')
    try {
      const res = await fetch(`/api/tournaments/${id}/bracket`, { method: 'POST' })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || '대진표 재생성에 실패했습니다')
      }
      toast.success('대진표가 재생성되었습니다!')
      fetchData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '대진표 재생성에 실패했습니다')
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b">
          <div className="container mx-auto px-4 py-4">
            <Link
              href={`/admin/tournaments/${id}`}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              대회 관리로 돌아가기
            </Link>
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">
          <Card className="border-destructive">
            <CardContent className="py-16 text-center">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
              <p className="text-destructive text-lg font-semibold mb-4">{error}</p>
              <Button onClick={fetchData} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                다시 시도
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <Link
            href={`/admin/tournaments/${id}`}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            대회 관리로 돌아가기
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3">
              <Trophy className="h-6 w-6" />
              {tournament?.name} - 대진표 관리
            </h1>
            <p className="text-muted-foreground mt-1">{tournament?.game}</p>
          </div>
          <Button
            variant="outline"
            onClick={handleRegenerateBracket}
            disabled={actionLoading === 'regenerate'}
          >
            {actionLoading === 'regenerate' ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            대진표 재생성
          </Button>
        </div>

        {matches.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>대진표가 아직 생성되지 않았습니다</p>
            </CardContent>
          </Card>
        ) : (
          <TournamentBracket
            matches={matches}
            isAdmin={true}
            onSetWinner={handleSetWinner}
            actionLoading={actionLoading}
          />
        )}
      </main>
    </div>
  )
}
