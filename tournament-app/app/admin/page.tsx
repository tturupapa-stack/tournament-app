'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
  Plus,
  Users,
  Settings,
  LogOut,
  Loader2,
  Calendar,
  Gamepad
} from 'lucide-react'

interface Tournament {
  id: string
  name: string
  game: string
  max_participants: number
  deadline: string
  status: 'open' | 'closed'
  participants: { count: number }[]
}

export default function AdminDashboardPage() {
  const router = useRouter()
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTournaments()
  }, [])

  async function fetchTournaments() {
    try {
      const res = await fetch('/api/tournaments')
      if (res.ok) {
        const data = await res.json()
        setTournaments(data)
      }
    } catch (error) {
      console.error('Error fetching tournaments:', error)
      toast.error('대회 목록을 불러올 수 없습니다')
    } finally {
      setLoading(false)
    }
  }

  async function handleLogout() {
    try {
      await fetch('/api/admin/login', { method: 'DELETE' })
      toast.success('로그아웃 되었습니다')
      router.push('/admin/login')
      router.refresh()
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const openCount = tournaments.filter(t => t.status === 'open').length
  const closedCount = tournaments.filter(t => t.status === 'closed').length
  const totalParticipants = tournaments.reduce(
    (sum, t) => sum + (t.participants?.[0]?.count || 0),
    0
  )

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Trophy className="h-6 w-6" />
            <span className="font-semibold">관리자 대시보드</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/admin/create">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                대회 생성
              </Button>
            </Link>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>전체 대회</CardDescription>
              <CardTitle className="text-3xl">{tournaments.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>모집중</CardDescription>
              <CardTitle className="text-3xl text-green-500">{openCount}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>마감</CardDescription>
              <CardTitle className="text-3xl">{closedCount}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>총 참가자</CardDescription>
              <CardTitle className="text-3xl">{totalParticipants}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Tournament List */}
        <Card>
          <CardHeader>
            <CardTitle>대회 목록</CardTitle>
            <CardDescription>모든 대회 관리</CardDescription>
          </CardHeader>
          <CardContent>
            {tournaments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>등록된 대회가 없습니다</p>
                <Link href="/admin/create">
                  <Button className="mt-4">
                    <Plus className="h-4 w-4 mr-2" />
                    첫 대회 생성하기
                  </Button>
                </Link>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>대회명</TableHead>
                    <TableHead>게임</TableHead>
                    <TableHead>참가자</TableHead>
                    <TableHead>마감일</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead className="text-right">관리</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tournaments.map((tournament) => (
                    <TableRow key={tournament.id}>
                      <TableCell className="font-medium">{tournament.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Gamepad className="h-3 w-3" />
                          {tournament.game}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {tournament.participants?.[0]?.count || 0} / {tournament.max_participants}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {tournament.deadline}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={tournament.status === 'open' ? 'default' : 'secondary'}
                          className={tournament.status === 'open' ? 'bg-green-500' : ''}
                        >
                          {tournament.status === 'open' ? '모집중' : '마감'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/admin/tournaments/${tournament.id}`}>
                          <Button variant="outline" size="sm">
                            <Settings className="h-3 w-3 mr-1" />
                            관리
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
