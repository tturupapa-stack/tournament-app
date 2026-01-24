export type Database = {
  public: {
    Tables: {
      tournaments: {
        Row: {
          id: string
          name: string
          game: string
          max_participants: number
          deadline: string
          description: string | null
          status: 'open' | 'closed'
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          game: string
          max_participants?: number
          deadline: string
          description?: string | null
          status?: 'open' | 'closed'
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          game?: string
          max_participants?: number
          deadline?: string
          description?: string | null
          status?: 'open' | 'closed'
          created_at?: string
        }
      }
      participants: {
        Row: {
          id: string
          tournament_id: string
          nickname: string
          skill: string
          skill_value: number
          card_tier: string
          profile_image_url: string | null
          card_image_url: string | null
          is_joker: boolean
          created_at: string
        }
        Insert: {
          id?: string
          tournament_id: string
          nickname: string
          skill: string
          skill_value: number
          card_tier?: string
          profile_image_url?: string | null
          card_image_url?: string | null
          is_joker?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          tournament_id?: string
          nickname?: string
          skill?: string
          skill_value?: number
          card_tier?: string
          profile_image_url?: string | null
          card_image_url?: string | null
          is_joker?: boolean
          created_at?: string
        }
      }
      teams: {
        Row: {
          id: string
          tournament_id: string
          name: string
          avg_skill: number
          has_joker: boolean
          created_at: string
        }
        Insert: {
          id?: string
          tournament_id: string
          name: string
          avg_skill: number
          has_joker?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          tournament_id?: string
          name?: string
          avg_skill?: number
          has_joker?: boolean
          created_at?: string
        }
      }
      team_members: {
        Row: {
          id: string
          team_id: string
          participant_id: string
        }
        Insert: {
          id?: string
          team_id: string
          participant_id: string
        }
        Update: {
          id?: string
          team_id?: string
          participant_id?: string
        }
      }
      bracket_matches: {
        Row: {
          id: string
          tournament_id: string
          round: number
          match_order: number
          team1_name: string
          team2_name: string
          winner_name: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tournament_id: string
          round: number
          match_order: number
          team1_name: string
          team2_name: string
          winner_name?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          tournament_id?: string
          round?: number
          match_order?: number
          team1_name?: string
          team2_name?: string
          winner_name?: string | null
          created_at?: string
        }
      }
    }
  }
}

// Convenience types
export type Tournament = Database['public']['Tables']['tournaments']['Row']
export type TournamentInsert = Database['public']['Tables']['tournaments']['Insert']
export type TournamentUpdate = Database['public']['Tables']['tournaments']['Update']

export type Participant = Database['public']['Tables']['participants']['Row']
export type ParticipantInsert = Database['public']['Tables']['participants']['Insert']
export type ParticipantUpdate = Database['public']['Tables']['participants']['Update']

export type Team = Database['public']['Tables']['teams']['Row']
export type TeamInsert = Database['public']['Tables']['teams']['Insert']
export type TeamUpdate = Database['public']['Tables']['teams']['Update']

export type TeamMember = Database['public']['Tables']['team_members']['Row']
export type TeamMemberInsert = Database['public']['Tables']['team_members']['Insert']

export type BracketMatch = Database['public']['Tables']['bracket_matches']['Row']
export type BracketMatchInsert = Database['public']['Tables']['bracket_matches']['Insert']
export type BracketMatchUpdate = Database['public']['Tables']['bracket_matches']['Update']

// Extended types with relations
export type TeamWithMembers = Team & {
  members: (TeamMember & { participant: Participant })[]
}

export type TournamentWithDetails = Tournament & {
  participants: Participant[]
  teams: TeamWithMembers[]
  bracket_matches: BracketMatch[]
}
