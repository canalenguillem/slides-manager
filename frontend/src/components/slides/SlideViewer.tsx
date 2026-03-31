import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Slide } from '../../types'
import SlideCard from './SlideCard'

interface Props {
  slides: Slide[]
  title: string
}

export default function SlideViewer({ slides, title }: Props) {
  const [current, setCurrent] = useState(0)
  const [fullscreen, setFullscreen] = useState(false)
  const navigate = useNavigate()
  const total = slides.length

  const prev = useCallback(() => {
    setCurrent((c) => Math.max(0, c - 1))
  }, [])

  const next = useCallback(() => {
    setCurrent((c) => Math.min(total - 1, c + 1))
  }, [total])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prev()
      else if (e.key === 'ArrowRight') next()
      else if (e.key === 'Escape') navigate(-1)
      else if (e.key === 'f' || e.key === 'F') setFullscreen((f) => !f)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [prev, next, navigate])

  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        No slides found
      </div>
    )
  }

  const slide = slides[current]
  const isTitleSlide = slide.type === 'title' && slide.index === 0

  return (
    <div
      className={`${
        fullscreen
          ? 'fixed inset-0 z-50'
          : 'relative w-full aspect-video rounded-2xl overflow-hidden shadow-2xl'
      }`}
    >
      {/* Slide background */}
      <div
        className={`w-full h-full ${
          isTitleSlide
            ? 'bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-700'
            : 'bg-white'
        }`}
      >
        <SlideCard slide={slide} current={current} total={total} />
      </div>

      {/* Controls overlay */}
      <div className="absolute inset-0 flex items-center justify-between pointer-events-none">
        <button
          onClick={prev}
          disabled={current === 0}
          className={`pointer-events-auto ml-4 p-3 rounded-full transition-all ${
            isTitleSlide
              ? 'bg-white/10 hover:bg-white/20 text-white'
              : 'bg-gray-900/5 hover:bg-gray-900/10 text-gray-700'
          } disabled:opacity-20 disabled:cursor-default`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <button
          onClick={next}
          disabled={current === total - 1}
          className={`pointer-events-auto mr-4 p-3 rounded-full transition-all ${
            isTitleSlide
              ? 'bg-white/10 hover:bg-white/20 text-white'
              : 'bg-gray-900/5 hover:bg-gray-900/10 text-gray-700'
          } disabled:opacity-20 disabled:cursor-default`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 py-4">
        <button
          onClick={() => navigate(-1)}
          className={`flex items-center gap-2 text-sm font-medium transition-colors ${
            isTitleSlide ? 'text-white/70 hover:text-white' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          {title}
        </button>

        <button
          onClick={() => setFullscreen((f) => !f)}
          className={`p-2 rounded-lg transition-colors ${
            isTitleSlide ? 'text-white/70 hover:text-white hover:bg-white/10' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
          }`}
          title="Toggle fullscreen (F)"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d={fullscreen
                ? "M9 9L4 4m0 0l5 0m-5 0v5M15 9l5-5m0 0l-5 0m5 0v5M9 15l-5 5m0 0l5 0m-5 0v-5M15 15l5 5m0 0l-5 0m5 0v-5"
                : "M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
              }
            />
          </svg>
        </button>
      </div>
    </div>
  )
}
