import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types
export interface Database {
  public: {
    Tables: {
      babies: {
        Row: {
          id: string
          name: string
          created_at: string
          user_id: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
          user_id: string
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
          user_id?: string
        }
      }
      feedings: {
        Row: {
          id: string
          baby_id: string
          timestamp: string
          amount: number
          type: 'breast' | 'formula' | 'solid'
          notes: string | null
          created_at: string
          user_id: string
        }
        Insert: {
          id?: string
          baby_id: string
          timestamp: string
          amount: number
          type: 'breast' | 'formula' | 'solid'
          notes?: string | null
          created_at?: string
          user_id: string
        }
        Update: {
          id?: string
          baby_id?: string
          timestamp?: string
          amount?: number
          type?: 'breast' | 'formula' | 'solid'
          notes?: string | null
          created_at?: string
          user_id?: string
        }
      }
      diaper_changes: {
        Row: {
          id: string
          baby_id: string
          timestamp: string
          type: 'wet' | 'dirty' | 'both'
          notes: string | null
          created_at: string
          user_id: string
        }
        Insert: {
          id?: string
          baby_id: string
          timestamp: string
          type: 'wet' | 'dirty' | 'both'
          notes?: string | null
          created_at?: string
          user_id: string
        }
        Update: {
          id?: string
          baby_id?: string
          timestamp?: string
          type?: 'wet' | 'dirty' | 'both'
          notes?: string | null
          created_at?: string
          user_id?: string
        }
      }
      sleep_sessions: {
        Row: {
          id: string
          baby_id: string
          start_time: string
          end_time: string | null
          notes: string | null
          created_at: string
          user_id: string
        }
        Insert: {
          id?: string
          baby_id: string
          start_time: string
          end_time?: string | null
          notes?: string | null
          created_at?: string
          user_id: string
        }
        Update: {
          id?: string
          baby_id?: string
          start_time?: string
          end_time?: string | null
          notes?: string | null
          created_at?: string
          user_id?: string
        }
      }
    }
  }
} 