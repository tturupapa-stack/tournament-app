import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Trophy, Calendar, Users, GamepadIcon } from 'lucide-react'

export const revalidate = 0 // Disable caching for real-time data

async function getTournaments() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tournaments')
    .select(`
      *,
      participants:participants(count)
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching tournaments:', error)
    return []
  }

  return data || []
}

export default async function HomePage() {
  const tournaments = await getTournaments()

  const openTournaments = tournaments.filter(t => t.status === 'open')
  const closedTournaments = tournaments.filter(t => t.status === 'closed')

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <Trophy className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">e스포츠 토너먼트</h1>
              <p className="text-sm text-muted-foreground">참가 신청 및 대회 정보</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Open Tournaments Section */}
        {openTournaments.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center gap-2 mb-6">
              <Badge className="bg-green-500 hover:bg-green-500/90">모집중</Badge>
              <h2 className="text-xl font-semibold">참가 신청 가능한 대회</h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {openTournaments.map((tournament) => (
                <Link key={tournament.id} href={`/tournament/${tournament.id}`}>
                  <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{tournament.name}</CardTitle>
                          <CardDescription className="flex items-center gap-1 mt-1">
                            <GamepadIcon className="h-3 w-3" />
                            {tournament.game}
                          </CardDescription>
                        </div>
                        <Badge className="bg-green-500 hover:bg-green-500/90">
                          모집중
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          <span>
                            {tournament.participants?.[0]?.count || 0} / {tournament.max_participants}명
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>마감: {tournament.deadline}</span>
                        </div>
                        {tournament.description && (
                          <p className="text-xs line-clamp-2 mt-2 whitespace-pre-line">{tournament.description}</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Closed Tournaments Section */}
        {closedTournaments.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-6">
              <Badge variant="secondary">마감</Badge>
              <h2 className="text-xl font-semibold">진행중/완료된 대회</h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {closedTournaments.map((tournament) => (
                <Link key={tournament.id} href={`/tournament/${tournament.id}`}>
                  <Card className="h-full hover:shadow-md transition-shadow cursor-pointer opacity-80 hover:opacity-100">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{tournament.name}</CardTitle>
                          <CardDescription className="flex items-center gap-1 mt-1">
                            <GamepadIcon className="h-3 w-3" />
                            {tournament.game}
                          </CardDescription>
                        </div>
                        <Badge variant="secondary">마감</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          <span>{tournament.participants?.[0]?.count || 0}명 참가</span>
                        </div>
                        {tournament.description && (
                          <p className="text-xs line-clamp-2 mt-2 whitespace-pre-line">{tournament.description}</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Empty State */}
        {tournaments.length === 0 && (
          <div className="text-center py-16">
            <Trophy className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium">등록된 대회가 없습니다</h3>
            <p className="text-muted-foreground">새로운 대회가 등록되면 여기에 표시됩니다.</p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t mt-auto">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          <p>e스포츠 토너먼트 관리 시스템</p>
        </div>
      </footer>
    </div>
  )
}
