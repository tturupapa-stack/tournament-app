'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Trophy, Loader2, AlertCircle, RefreshCw } from 'lucide-react'
import { TournamentBracket, BracketMatch } from '@/components/bracket/TournamentBracket'

interface Tournament {
  id: string
  name: string
  game: string
}

export default function BracketPage() {
  const params = useParams()
  const id = params.id as string

  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [matches, setMatches] = useState<BracketMatch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchData()
  }, [fetchData])

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
              href={`/tournament/${id}`}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              대회로 돌아가기
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
            href={`/tournament/${id}`}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            대회로 돌아가기
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Trophy className="h-6 w-6" />
            {tournament?.name} - 대진표
          </h1>
          <p className="text-muted-foreground mt-1">{tournament?.game}</p>
        </div>

        {matches.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>대진표가 아직 생성되지 않았습니다</p>
            </CardContent>
          </Card>
        ) : (
          <TournamentBracket matches={matches} isAdmin={false} />
        )}
      </main>
    </div>
  )
}
