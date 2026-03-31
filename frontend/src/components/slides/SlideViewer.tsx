import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Slide } from '../../types'
import SlideCard from './SlideCard'

interface Props {
  slides: Slide[]
  title: string
}

export default function SlideViewer({ slides, title }: Props) {
  const [current, setCurrent] = useState(0)
  const [direction, setDirection] = useState<'next' | 'prev'>('next')
  const [fullscreen, setFullscreen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const total = slides.length

  const prev = useCallback(() => {
    setCurrent((c) => {
      if (c === 0) return c
      setDirection('prev')
      return c - 1
    })
  }, [])

  const next = useCallback(() => {
    setCurrent((c) => {
      if (c === total - 1) return c
      setDirection('next')
      return c + 1
    })
  }, [total])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') prev()
      else if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') next()
      else if (e.key === 'Escape') {
        if (fullscreen) setFullscreen(false)
        else navigate(-1)
      }
      else if (e.key === 'f' || e.key === 'F') setFullscreen((f) => !f)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [prev, next, navigate, fullscreen])

  // Preload next slide's image
  useEffect(() => {
    const nextSlide = slides[current + 1]
    if (nextSlide?.image_query) {
      const img = new Image()
      img.src = `https://source.unsplash.com/1920x1080/?${encodeURIComponent(nextSlide.image_query)}`
    }
  }, [current, slides])

  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        No slides found
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={`${
        fullscreen
          ? 'fixed inset-0 z-50 bg-black'
          : 'relative w-full aspect-video rounded-2xl overflow-hidden shadow-2xl bg-black'
      }`}
    >
      {/* Slide */}
      <div className="w-full h-full">
        <SlideCard
          key={`${current}-${direction}`}
          slide={slides[current]}
          current={current}
          total={total}
          direction={direction}
        />
      </div>

      {/* Side nav arrows */}
      <button
        onClick={prev}
        disabled={current === 0}
        className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/20 hover:bg-black/40 text-white backdrop-blur-sm transition-all disabled:opacity-0 disabled:pointer-events-none"
        aria-label="Previous slide"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <button
        onClick={next}
        disabled={current === total - 1}
        className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/20 hover:bg-black/40 text-white backdrop-blur-sm transition-all disabled:opacity-0 disabled:pointer-events-none"
        aria-label="Next slide"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-5 py-4 bg-gradient-to-b from-black/30 to-transparent pointer-events-none">
        <button
          onClick={() => navigate(-1)}
          className="pointer-events-auto flex items-center gap-2 text-white/60 hover:text-white transition-colors"
          style={{ fontSize: 'clamp(10px, 1.2vw, 13px)' }}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span className="font-medium tracking-wide uppercase">{title}</span>
        </button>

        <button
          onClick={() => setFullscreen((f) => !f)}
          className="pointer-events-auto p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          title="Toggle fullscreen (F)"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d={
                fullscreen
                  ? 'M9 9L4 4m0 0l5 0m-5 0v5M15 9l5-5m0 0l-5 0m5 0v5M9 15l-5 5m0 0l5 0m-5 0v-5M15 15l5 5m0 0l-5 0m5 0v-5'
                  : 'M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4'
              }
            />
          </svg>
        </button>
      </div>

      {/* Bottom click zones for mobile */}
      <div className="absolute inset-0 flex pointer-events-none">
        <div className="flex-1 pointer-events-auto cursor-pointer" onClick={prev} />
        <div className="flex-1 pointer-events-auto cursor-pointer" onClick={next} />
      </div>
    </div>
  )
}
