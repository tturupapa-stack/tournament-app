'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { ArrowLeft, Trophy, Loader2 } from 'lucide-react'

export default function CreateTournamentPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const [name, setName] = useState('')
  const [game, setGame] = useState('')
  const [maxParticipants, setMaxParticipants] = useState('16')
  const [deadline, setDeadline] = useState('')
  const [description, setDescription] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!name.trim() || !game.trim() || !deadline) {
      toast.error('대회명, 게임, 마감일을 입력해주세요')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/tournaments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          game: game.trim(),
          max_participants: parseInt(maxParticipants) || 16,
          deadline,
          description: description.trim() || null
        })
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || '대회 생성에 실패했습니다')
      }

      toast.success('대회가 생성되었습니다!')
      router.push('/admin')
    } catch (error) {
      console.error('Create tournament error:', error)
      toast.error(error instanceof Error ? error.message : '대회 생성에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            대시보드로 돌아가기
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              새 대회 생성
            </CardTitle>
            <CardDescription>새로운 토너먼트 대회를 생성합니다</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">대회명 *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="예: 2024 겨울 토너먼트"
                  maxLength={100}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="game">게임 *</Label>
                <Input
                  id="game"
                  value={game}
                  onChange={(e) => setGame(e.target.value)}
                  placeholder="예: EA Sports FC 25"
                  maxLength={100}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="maxParticipants">최대 참가자 수</Label>
                  <Input
                    id="maxParticipants"
                    type="number"
                    value={maxParticipants}
                    onChange={(e) => setMaxParticipants(e.target.value)}
                    min="2"
                    max="128"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="deadline">마감일 *</Label>
                  <Input
                    id="deadline"
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">설명 (선택)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="대회에 대한 설명을 입력하세요"
                  rows={4}
                />
              </div>

              <div className="flex gap-4">
                <Button type="submit" className="flex-1" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      생성 중...
                    </>
                  ) : (
                    '대회 생성'
                  )}
                </Button>
                <Link href="/admin">
                  <Button type="button" variant="outline">
                    취소
                  </Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
