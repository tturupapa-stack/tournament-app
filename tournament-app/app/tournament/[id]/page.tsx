'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'
import {
  Trophy,
  ArrowLeft,
  Calendar,
  Users,
  GamepadIcon,
  UserPlus,
  Loader2
} from 'lucide-react'
import { SKILLS } from '@/lib/constants'

interface Tournament {
  id: string
  name: string
  game: string
  max_participants: number
  deadline: string
  description: string | null
  status: 'open' | 'closed'
  participants: Participant[]
  teams: Team[]
}

interface Participant {
  id: string
  nickname: string
  skill: string
  skill_value: number
  card_tier: string
  profile_image_url: string | null
  card_image_url: string | null
  is_joker: boolean
  created_at: string
}

interface Team {
  id: string
  name: string
  avg_skill: number
  has_joker: boolean
  team_members: {
    participant: Participant
  }[]
}

export default function TournamentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Form state
  const [nickname, setNickname] = useState('')
  const [skill, setSkill] = useState('')

  useEffect(() => {
    fetchTournament()
  }, [id])

  async function fetchTournament() {
    try {
      const res = await fetch(`/api/tournaments/${id}`)
      if (!res.ok) {
        throw new Error('Tournament not found')
      }
      const data = await res.json()
      setTournament(data)
    } catch (error) {
      console.error('Error fetching tournament:', error)
      toast.error('대회 정보를 불러올 수 없습니다')
      router.push('/')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!nickname.trim() || !skill) {
      toast.error('닉네임과 실력 레벨을 입력해주세요')
      return
    }

    if (nickname.trim().length < 2 || nickname.trim().length > 20) {
      toast.error('닉네임은 2-20자 사이여야 합니다')
      return
    }

    setSubmitting(true)

    try {
      // 1. Add participant
      const participantRes = await fetch('/api/participants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tournament_id: id,
          nickname: nickname.trim(),
          skill
        })
      })

      if (!participantRes.ok) {
        const error = await participantRes.json()
        throw new Error(error.error || '참가 신청에 실패했습니다')
      }

      toast.success('참가 신청이 완료되었습니다!')

      // Reset form
      setNickname('')
      setSkill('')

      // Refresh data
      fetchTournament()
    } catch (error) {
      console.error('Registration error:', error)
      toast.error(error instanceof Error ? error.message : '참가 신청에 실패했습니다')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-muted-foreground mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!tournament) {
    return null
  }

  const participantCount = tournament.participants?.filter(p => !p.is_joker).length || 0
  const isOpen = tournament.status === 'open'
  const isFull = participantCount >= tournament.max_participants

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            대회 목록으로
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Tournament Info */}
        <div className="mb-8 rounded-lg border p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-3">
                <Trophy className="h-8 w-8" />
                {tournament.name}
              </h1>
              <p className="text-muted-foreground flex items-center gap-2 mt-2 text-sm">
                <GamepadIcon className="h-4 w-4" />
                {tournament.game}
              </p>
            </div>
            <Badge
              className={isOpen ? 'bg-green-500 hover:bg-green-500/90' : ''}
              variant={isOpen ? 'default' : 'secondary'}
            >
              {isOpen ? '모집중' : '마감'}
            </Badge>
          </div>

          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mt-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>{participantCount} / {tournament.max_participants}명</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>마감: {tournament.deadline}</span>
            </div>
          </div>

          {tournament.description && (
            <p className="mt-4 text-sm text-muted-foreground whitespace-pre-line border-t pt-4">
              {tournament.description}
            </p>
          )}
        </div>

        {/* Tabs */}
        <Tabs defaultValue={isOpen ? 'register' : 'teams'} className="space-y-6">
          <TabsList>
            {isOpen && <TabsTrigger value="register">참가 신청</TabsTrigger>}
            <TabsTrigger value="participants">참가자 목록</TabsTrigger>
            {!isOpen && tournament.teams?.length > 0 && (
              <TabsTrigger value="teams">팀 구성</TabsTrigger>
            )}
          </TabsList>

          {/* Registration Form */}
          {isOpen && (
            <TabsContent value="register">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserPlus className="h-5 w-5" />
                    참가 신청
                  </CardTitle>
                  <CardDescription>
                    대회 참가를 위해 정보를 입력해주세요
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isFull ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>정원이 마감되었습니다</p>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="nickname">닉네임 *</Label>
                        <Input
                          id="nickname"
                          value={nickname}
                          onChange={(e) => setNickname(e.target.value)}
                          placeholder="게임 내 닉네임"
                          maxLength={20}
                        />
                        <p className="text-xs text-muted-foreground">2-20자</p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="skill">실력 레벨 *</Label>
                        <Select value={skill} onValueChange={setSkill}>
                          <SelectTrigger>
                            <SelectValue placeholder="실력 레벨 선택" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.keys(SKILLS).map((skillName) => (
                              <SelectItem key={skillName} value={skillName}>
                                {skillName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <Button type="submit" className="w-full" disabled={submitting}>
                        {submitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            처리중...
                          </>
                        ) : (
                          '참가 신청'
                        )}
                      </Button>
                    </form>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Participants List */}
          <TabsContent value="participants">
            <Card>
              <CardHeader>
                <CardTitle>참가자 목록</CardTitle>
                <CardDescription>
                  총 {participantCount}명 참가
                </CardDescription>
              </CardHeader>
              <CardContent>
                {participantCount === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>아직 참가자가 없습니다</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>닉네임</TableHead>
                        <TableHead>실력</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tournament.participants
                        .filter(p => !p.is_joker)
                        .map((participant, index) => (
                          <TableRow key={participant.id}>
                            <TableCell className="font-medium">{index + 1}</TableCell>
                            <TableCell>{participant.nickname}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{participant.skill}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Teams */}
          {!isOpen && tournament.teams?.length > 0 && (
            <TabsContent value="teams">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">팀 구성</h3>
                  <Link href={`/tournament/${id}/bracket`}>
                    <Button variant="outline">대진표 보기</Button>
                  </Link>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {tournament.teams.map((team) => (
                    <Card key={team.id} className={team.has_joker ? 'border-yellow-500/50' : ''}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                          {team.name}
                          {team.has_joker && <Badge variant="outline">조커</Badge>}
                        </CardTitle>
                        <CardDescription>
                          {team.team_members?.length || 0}명
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {team.team_members?.map((tm) => (
                            <div key={tm.participant.id} className="flex items-center gap-2">
                              {tm.participant.is_joker ? (
                                <span className="text-lg">🃏</span>
                              ) : tm.participant.card_image_url ? (
                                <img
                                  src={tm.participant.card_image_url}
                                  alt="Card"
                                  className="w-8 h-auto rounded"
                                />
                              ) : (
                                <div className="w-8 h-10 bg-muted rounded flex items-center justify-center text-xs">
                                  -
                                </div>
                              )}
                              <span className={tm.participant.is_joker ? 'text-yellow-500' : ''}>
                                {tm.participant.nickname}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {tm.participant.skill}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </main>
    </div>
  )
}
