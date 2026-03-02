export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            profiles: {
                Row: {
                    id: string
                    handle: string
                    full_name: string | null
                    avatar_url: string | null
                    role: 'fan' | 'crew' | 'admin'
                    created_at: string
                }
                Insert: {
                    id: string
                    handle: string
                    full_name?: string | null
                    avatar_url?: string | null
                    role?: 'fan' | 'crew' | 'admin'
                    created_at?: string
                }
                Update: {
                    id?: string
                    handle?: string
                    full_name?: string | null
                    avatar_url?: string | null
                    role?: 'fan' | 'crew' | 'admin'
                    created_at?: string
                }
            }
            corridors: {
                Row: {
                    id: string
                    name: string
                    accent_color: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    name: string
                    accent_color?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    name?: string
                    accent_color?: string | null
                    created_at?: string
                }
            }
            stages: {
                Row: {
                    id: string
                    corridor_id: string
                    name: string
                    aliases: string[] | null
                    location: unknown // Geography point
                    created_at: string
                }
                Insert: {
                    id?: string
                    corridor_id: string
                    name: string
                    aliases?: string[] | null
                    location: unknown
                    created_at?: string
                }
                Update: {
                    id?: string
                    corridor_id?: string
                    name?: string
                    aliases?: string[] | null
                    location?: unknown
                    created_at?: string
                }
            }
            nganyas: {
                Row: {
                    id: string
                    corridor_id: string
                    name: string
                    tags: string[] | null
                    is_verified: boolean
                    created_by: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    corridor_id: string
                    name: string
                    tags?: string[] | null
                    is_verified?: boolean
                    created_by?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    corridor_id?: string
                    name?: string
                    tags?: string[] | null
                    is_verified?: boolean
                    created_by?: string | null
                    created_at?: string
                }
            }
            nganya_media: {
                Row: {
                    id: string
                    nganya_id: string
                    media_url: string
                    media_type: 'image' | 'video'
                    created_at: string
                }
                Insert: {
                    id?: string
                    nganya_id: string
                    media_url: string
                    media_type: 'image' | 'video'
                    created_at?: string
                }
                Update: {
                    id?: string
                    nganya_id?: string
                    media_url?: string
                    media_type?: 'image' | 'video'
                    created_at?: string
                }
            }
            follows: {
                Row: {
                    user_id: string
                    nganya_id: string
                    notify_live: boolean
                    notify_near: boolean
                    notify_stage: boolean
                    created_at: string
                }
                Insert: {
                    user_id: string
                    nganya_id: string
                    notify_live?: boolean
                    notify_near?: boolean
                    notify_stage?: boolean
                    created_at?: string
                }
                Update: {
                    user_id?: string
                    nganya_id?: string
                    notify_live?: boolean
                    notify_near?: boolean
                    notify_stage?: boolean
                    created_at?: string
                }
            }
            live_sessions: {
                Row: {
                    id: string
                    nganya_id: string
                    corridor_id: string
                    crew_user_id: string
                    status: 'LIVE' | 'OFF'
                    direction: string
                    seats_left: number
                    last_location: unknown | null
                    last_ping_at: string
                    started_at: string
                    ended_at: string | null
                }
                Insert: {
                    id?: string
                    nganya_id: string
                    corridor_id: string
                    crew_user_id: string
                    status?: 'LIVE' | 'OFF'
                    direction: string
                    seats_left?: number
                    last_location?: unknown | null
                    last_ping_at?: string
                    started_at?: string
                    ended_at?: string | null
                }
                Update: {
                    id?: string
                    nganya_id?: string
                    corridor_id?: string
                    crew_user_id?: string
                    status?: 'LIVE' | 'OFF'
                    direction?: string
                    seats_left?: number
                    last_location?: unknown | null
                    last_ping_at?: string
                    started_at?: string
                    ended_at?: string | null
                }
            }
            sightings: {
                Row: {
                    id: string
                    nganya_id: string
                    corridor_id: string
                    user_id: string
                    stage_id: string | null
                    location: unknown
                    direction: string | null
                    note: string | null
                    media_urls: string[] | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    nganya_id: string
                    corridor_id: string
                    user_id: string
                    stage_id?: string | null
                    location: unknown
                    direction?: string | null
                    note?: string | null
                    media_urls?: string[] | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    nganya_id?: string
                    corridor_id?: string
                    user_id?: string
                    stage_id?: string | null
                    location?: unknown
                    direction?: string | null
                    note?: string | null
                    media_urls?: string[] | null
                    created_at?: string
                }
            }
            sighting_votes: {
                Row: {
                    sighting_id: string
                    user_id: string
                    vote: 'SEEN' | 'CAP' | 'DIFF_ROUTE'
                    created_at: string
                }
                Insert: {
                    sighting_id: string
                    user_id: string
                    vote: 'SEEN' | 'CAP' | 'DIFF_ROUTE'
                    created_at?: string
                }
                Update: {
                    sighting_id?: string
                    user_id?: string
                    vote?: 'SEEN' | 'CAP' | 'DIFF_ROUTE'
                    created_at?: string
                }
            }
        }
        Views: {
            v_live_now: {
                Row: {
                    id: string
                    nganya_id: string
                    nganya_name: string
                    tags: string[] | null
                    is_verified: boolean
                    corridor_id: string
                    corridor_name: string
                    status: string
                    direction: string
                    seats_left: number
                    last_location: unknown | null
                    last_ping_at: string
                    last_ping_age_seconds: number
                }
            }
            v_sighting_confidence: {
                Row: {
                    sighting_id: string
                    seen_count: number
                    cap_count: number
                    diff_route_count: number
                    confidence_score: number
                    confidence_level: 'LOW' | 'MED' | 'HIGH'
                }
            }
            v_trending_nganyas: {
                Row: {
                    nganya_id: string
                    corridor_id: string
                    score: number
                }
            }
            v_public_profiles: {
                Row: {
                    id: string
                    handle: string
                    avatar_url: string | null
                }
            }
        }
    }
    Functions: {
        [_ in never]: never
    }
    Enums: {
        [_ in never]: never
    }
    CompositeTypes: {
        [_ in never]: never
    }
}
