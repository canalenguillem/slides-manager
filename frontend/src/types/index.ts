export interface User {
  id: string
  email: string
  username: string
  is_active: boolean
  created_at: string
}

export interface SlideContent {
  type: 'bullet' | 'text' | 'heading2' | 'heading3' | 'numbered' | 'table'
  text: string
}

export interface SlideStyle {
  text_color?: string      // hex, default '#ffffff'
  bold?: boolean
  italic?: boolean
  overlay_color?: string   // hex, default '#000000'
  overlay_opacity?: number // 0-100, default 55
}

export interface Slide {
  index: number
  title: string
  content: SlideContent[]
  type: 'title' | 'content'
  raw: string
  image_query?: string
  image_url?: string | null
  style?: SlideStyle
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
