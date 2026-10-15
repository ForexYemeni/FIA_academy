export interface User {
  id: string
  email: string
  name: string
  phone?: string
  password: string
  role: 'admin' | 'trainer' | 'student'
  avatar?: string | null
  title?: string | null
  bio?: string | null
  created_at?: string
  updated_at?: string
}

export interface Course {
  id: string
  title: string
  slug?: string | null
  short_description?: string | null
  description?: string | null
  category?: string | null
  specialization?: string | null
  level?: string
  price_type?: string
  price: number
  currency?: string
  duration_hours?: number
  modules_count?: number
  lessons_count?: number
  pass_score?: number
  attempts?: number
  certificate_type?: string | null
  cover?: string | null
  status: string
  rating?: number
  enrolled?: number
  featured?: boolean
  trainer_id?: string | null
  created_at?: string
  updated_at?: string
}

export interface Trainer {
  id: string
  name: string
  title?: string | null
  specialization?: string | null
  bio?: string | null
  avatar?: string | null
  email: string
  password?: string | null
  phone?: string | null
  courses_count?: number
  years_experience?: number
  created_at?: string
}

export interface Certificate {
  id: string
  certificate_number: string
  student_name: string
  course_title?: string | null
  issued_by?: string
  issued_at?: string
  status: string
  has_external_accreditation?: boolean
  external_accreditation_body?: string | null
}

export interface Payment {
  id: string
  amount: number
  currency?: string
  method?: string | null
  status: string
  reference?: string | null
  date?: string
  user_id?: string | null
  course_id?: string | null
}

export interface Partner {
  id: string
  name: string
  logo?: string
  description?: string | null
  website?: string | null
  status?: string
  since?: string | null
}

export interface License {
  id: string
  issuing_body: string
  type?: string | null
  number?: string | null
  issued_at?: string | null
  expires_at?: string | null
  status: string
  verification_url?: string | null
}

export interface PaymentMethod {
  id: string
  name: string
  icon?: string
  type?: string
  currency?: string
  wallet_id?: string | null
  description?: string | null
  instructions?: string | null
  enabled?: boolean
}

export interface SiteSettings {
  id?: string
  academy_name: string
  phone?: string
  email?: string
  address?: string
  telegram_bot_token?: string
  telegram_channel_id?: string
  updated_at?: string
}
