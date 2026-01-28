'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Trophy,
  Users,
  Calendar,
  Loader2,
  Lock,
  Unlock,
  Trash2,
  Settings,
  Swords,
  Pencil,
  Check,
  X
} from 'lucide-react'
import { Input } from '@/components/ui/input'
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
  bracket: BracketMatch[]
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

interface BracketMatch {
  id: string
  round: number
  match_order: number
  team1_name: string
  team2_name: string
  winner_name: string | null
}

export default function AdminTournamentPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [updatingSkill, setUpdatingSkill] = useState<string | null>(null)
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null)
  const [editingTeamName, setEditingTeamName] = useState('')

  useEffect(() => {
    fetchTournament()
  }, [id])

  async function fetchTournament() {
    try {
      const res = await fetch(`/api/tournaments/${id}`)
      if (res.ok) {
        const data = await res.json()
        setTournament(data)
      } else {
        toast.error('대회를 찾을 수 없습니다')
        router.push('/admin')
      }
    } catch (error) {
      console.error('Error fetching tournament:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleClose() {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/tournaments/${id}/close`, { method: 'POST' })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || '대회 마감에 실패했습니다')
      }
      toast.success('대회가 마감되고 팀이 편성되었습니다!')
      fetchTournament()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '대회 마감에 실패했습니다')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleReopen() {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/tournaments/${id}/reopen`, { method: 'POST' })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || '대회 재개에 실패했습니다')
      }
      toast.success('대회가 다시 모집중으로 변경되었습니다!')
      fetchTournament()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '대회 재개에 실패했습니다')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleDelete() {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/tournaments/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        throw new Error('대회 삭제에 실패했습니다')
      }
      toast.success('대회가 삭제되었습니다')
      router.push('/admin')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '대회 삭제에 실패했습니다')
    } finally {
      setActionLoading(false)
      setDeleteDialogOpen(false)
    }
  }

  async function handleDeleteParticipant(participantId: string) {
    try {
      const res = await fetch(`/api/participants?id=${participantId}`, { method: 'DELETE' })
      if (!res.ok) {
        throw new Error('참가자 삭제에 실패했습니다')
      }
      toast.success('참가자가 삭제되었습니다')
      fetchTournament()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '참가자 삭제에 실패했습니다')
    }
  }

  async function handleUpdateSkill(participantId: string, newSkill: string) {
    setUpdatingSkill(participantId)
    try {
      const res = await fetch('/api/participants', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: participantId, skill: newSkill })
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || '레벨 변경에 실패했습니다')
      }
      toast.success('실력 레벨이 변경되었습니다')
      fetchTournament()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '레벨 변경에 실패했습니다')
    } finally {
      setUpdatingSkill(null)
    }
  }

  async function handleGenerateBracket() {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/tournaments/${id}/bracket`, { method: 'POST' })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || '대진표 생성에 실패했습니다')
      }
      toast.success('대진표가 생성되었습니다!')
      fetchTournament()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '대진표 생성에 실패했습니다')
    } finally {
      setActionLoading(false)
    }
  }

  function startEditingTeam(teamId: string, currentName: string) {
    setEditingTeamId(teamId)
    setEditingTeamName(currentName)
  }

  function cancelEditingTeam() {
    setEditingTeamId(null)
    setEditingTeamName('')
  }

  async function handleUpdateTeamName(teamId: string) {
    if (!editingTeamName.trim()) {
      toast.error('팀명을 입력해주세요')
      return
    }
    try {
      const res = await fetch('/api/teams', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId: teamId, name: editingTeamName.trim() })
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || '팀명 변경에 실패했습니다')
      }
      toast.success('팀명이 변경되었습니다')
      setEditingTeamId(null)
      setEditingTeamName('')
      fetchTournament()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '팀명 변경에 실패했습니다')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!tournament) return null

  const participantCount = tournament.participants?.filter(p => !p.is_joker).length || 0
  const isOpen = tournament.status === 'open'

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

      <main className="container mx-auto px-4 py-8">
        {/* Tournament Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3">
              <Trophy className="h-6 w-6" />
              {tournament.name}
            </h1>
            <p className="text-muted-foreground mt-1">{tournament.game}</p>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                {participantCount} / {tournament.max_participants}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {tournament.deadline}
              </span>
              <Badge className={isOpen ? 'bg-green-500 hover:bg-green-500/90' : ''} variant={isOpen ? 'default' : 'secondary'}>
                {isOpen ? '모집중' : '마감'}
              </Badge>
            </div>
          </div>

          <div className="flex gap-2">
            {isOpen ? (
              <Button onClick={handleClose} disabled={actionLoading || participantCount < 1}>
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Lock className="h-4 w-4 mr-2" />}
                대회 마감
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={handleReopen} disabled={actionLoading}>
                  {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Unlock className="h-4 w-4 mr-2" />}
                  다시 모집
                </Button>
                {tournament.teams?.length > 0 && (
                  <Link href={`/admin/tournaments/${id}/bracket`}>
                    <Button variant="outline">
                      <Swords className="h-4 w-4 mr-2" />
                      대진표 관리
                    </Button>
                  </Link>
                )}
              </>
            )}

            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive" size="icon">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>대회 삭제</DialogTitle>
                  <DialogDescription>
                    정말로 이 대회를 삭제하시겠습니까? 모든 참가자, 팀, 대진표 정보가 함께 삭제됩니다.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                    취소
                  </Button>
                  <Button variant="destructive" onClick={handleDelete} disabled={actionLoading}>
                    {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    삭제
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="participants" className="space-y-6">
          <TabsList>
            <TabsTrigger value="participants">참가자 ({participantCount})</TabsTrigger>
            {tournament.teams?.length > 0 && (
              <TabsTrigger value="teams">팀 ({tournament.teams.length})</TabsTrigger>
            )}
          </TabsList>

          {/* Participants Tab */}
          <TabsContent value="participants">
            <Card>
              <CardHeader>
                <CardTitle>참가자 목록</CardTitle>
                <CardDescription>대회에 등록된 참가자들</CardDescription>
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
                        {isOpen && <TableHead className="text-right">관리</TableHead>}
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
                              {isOpen ? (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild disabled={updatingSkill === participant.id}>
                                    <button className="cursor-pointer">
                                      {updatingSkill === participant.id ? (
                                        <Badge variant="outline" className="gap-1">
                                          <Loader2 className="h-3 w-3 animate-spin" />
                                          {participant.skill}
                                        </Badge>
                                      ) : (
                                        <Badge variant="outline" className="hover:bg-muted">
                                          {participant.skill}
                                        </Badge>
                                      )}
                                    </button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="start">
                                    {Object.keys(SKILLS).map((skillName) => (
                                      <DropdownMenuItem
                                        key={skillName}
                                        onClick={() => handleUpdateSkill(participant.id, skillName)}
                                        className={participant.skill === skillName ? 'bg-muted' : ''}
                                      >
                                        {skillName}
                                      </DropdownMenuItem>
                                    ))}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              ) : (
                                <Badge variant="outline">{participant.skill}</Badge>
                              )}
                            </TableCell>
                            {isOpen && (
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteParticipant(participant.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Teams Tab */}
          {tournament.teams?.length > 0 && (
            <TabsContent value="teams">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>팀 구성</CardTitle>
                    <CardDescription>자동 편성된 팀 목록</CardDescription>
                  </div>
                  {tournament.bracket?.length === 0 && (
                    <Button onClick={handleGenerateBracket} disabled={actionLoading}>
                      {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Swords className="h-4 w-4 mr-2" />}
                      대진표 생성
                    </Button>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {tournament.teams.map((team) => (
                      <Card key={team.id} className={team.has_joker ? 'border-yellow-500/50' : ''}>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base flex items-center gap-2">
                            {editingTeamId === team.id ? (
                              <div className="flex items-center gap-1 flex-1">
                                <Input
                                  value={editingTeamName}
                                  onChange={(e) => setEditingTeamName(e.target.value)}
                                  className="h-7 text-sm"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleUpdateTeamName(team.id)
                                    if (e.key === 'Escape') cancelEditingTeam()
                                  }}
                                />
                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleUpdateTeamName(team.id)}>
                                  <Check className="h-4 w-4 text-green-500" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={cancelEditingTeam}>
                                  <X className="h-4 w-4 text-red-500" />
                                </Button>
                              </div>
                            ) : (
                              <>
                                {team.name}
                                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => startEditingTeam(team.id, team.name)}>
                                  <Pencil className="h-3 w-3" />
                                </Button>
                              </>
                            )}
                            {team.has_joker && <Badge variant="outline">조커</Badge>}
                          </CardTitle>
                          <CardDescription>
                            평균 실력: {team.avg_skill.toFixed(1)}
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
                                ) : null}
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
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </main>
    </div>
  )
}
