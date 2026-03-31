import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { presentationsApi } from '../services/api'
import { PresentationDetail } from '../types'
import SlideViewer from '../components/slides/SlideViewer'

export default function PresentationView() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [presentation, setPresentation] = useState<PresentationDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    presentationsApi
      .get(id)
      .then((res) => setPresentation(res.data))
      .catch(() => setError('Presentation not found'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading presentation...</p>
        </div>
      </div>
    )
  }

  if (error || !presentation) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-gray-500">{error || 'Presentation not found'}</p>
        <button onClick={() => navigate('/dashboard')} className="btn-secondary">
          Back to dashboard
        </button>
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-4"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Dashboard
        </button>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{presentation.title}</h1>
            {presentation.description && (
              <p className="text-gray-500 mt-1">{presentation.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
            </svg>
            {presentation.slide_count} slides
          </div>
        </div>
      </div>

      <SlideViewer slides={presentation.slides} title={presentation.title} />

      <div className="mt-4 text-center text-xs text-gray-400">
        Use ← → arrow keys to navigate · F to toggle fullscreen · Esc to go back
      </div>
    </div>
  )
}
