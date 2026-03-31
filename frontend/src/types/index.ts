export interface User {
  id: string
  email: string
  username: string
  is_active: boolean
  created_at: string
}

export interface SlideContent {
  type: 'bullet' | 'text' | 'heading2' | 'heading3' | 'numbered'
  text: string
}

export interface Slide {
  index: number
  title: string
  content: SlideContent[]
  type: 'title' | 'content'
  raw: string
  image_query?: string
  image_url?: string | null
}

export interface Presentation {
  id: string
  title: string
  description: string | null
  slide_count: number
  created_at: string
  updated_at: string
}

export interface PresentationDetail extends Presentation {
  slides: Slide[]
}

export interface APIKey {
  id: string
  provider: 'openai' | 'leonardo'
  is_active: boolean
  created_at: string
}

export interface AuthToken {
  access_token: string
  token_type: string
}
