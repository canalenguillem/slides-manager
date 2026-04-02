import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { presentationsApi } from '../services/api'
import { PresentationDetail, Slide, SlideContent } from '../types'

const LEONARDO_MODELS = [
  { value: 'gpt-image-1.5', label: 'GPT Image 1.5 (Recommended)' },
  { value: 'phoenix', label: 'Leonardo Phoenix' },
]

const CONTENT_TYPES: SlideContent['type'][] = ['bullet', 'numbered', 'text', 'heading2', 'heading3']

interface SlideState {
  title: string
  content: SlideContent[]
  image_url?: string | null
  image_query?: string
  saving: boolean
  saved: boolean
  generating: boolean
  error: string
}

function initSlideStates(slides: Slide[]): SlideState[] {
  return slides.map((s) => ({
    title: s.title,
    content: s.content.map((c) => ({ ...c })),
    image_url: s.image_url,
    image_query: s.image_query,
    saving: false,
    saved: false,
    generating: false,
    error: '',
  }))
}

export default function EditPresentation() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [presentation, setPresentation] = useState<PresentationDetail | null>(null)
  const [slides, setSlides] = useState<SlideState[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [model, setModel] = useState('gpt-image-1.5')

  useEffect(() => {
    if (!id) return
    presentationsApi
      .get(id)
      .then((res) => {
        setPresentation(res.data)
        setSlides(initSlideStates(res.data.slides))
      })
      .catch(() => setError('Presentation not found'))
      .finally(() => setLoading(false))
  }, [id])

  const updateSlideField = (index: number, patch: Partial<SlideState>) => {
    setSlides((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)))
  }

  const handleSaveSlide = async (index: number) => {
    if (!id) return
    updateSlideField(index, { saving: true, error: '', saved: false })
    try {
      await presentationsApi.updateSlide(id, index, {
        title: slides[index].title,
        content: slides[index].content,
      })
      updateSlideField(index, { saving: false, saved: true })
      setTimeout(() => updateSlideField(index, { saved: false }), 2500)
    } catch {
      updateSlideField(index, { saving: false, error: 'Failed to save' })
    }
  }

  const handleGenerateImage = async (index: number) => {
    if (!id) return
    updateSlideField(index, { generating: true, error: '' })
    try {
      const res = await presentationsApi.generateSlideImage(id, index, model)
      updateSlideField(index, {
        generating: false,
        image_url: res.data.image_url,
        image_query: res.data.image_query,
      })
    } catch {
      updateSlideField(index, { generating: false, error: 'Image generation failed' })
    }
  }

  const handleContentChange = (slideIdx: number, contentIdx: number, text: string) => {
    setSlides((prev) =>
      prev.map((s, i) => {
        if (i !== slideIdx) return s
        const content = s.content.map((c, ci) => (ci === contentIdx ? { ...c, text } : c))
        return { ...s, content }
      })
    )
  }

  const handleContentTypeChange = (slideIdx: number, contentIdx: number, type: SlideContent['type']) => {
    setSlides((prev) =>
      prev.map((s, i) => {
        if (i !== slideIdx) return s
        const content = s.content.map((c, ci) => (ci === contentIdx ? { ...c, type } : c))
        return { ...s, content }
      })
    )
  }

  const handleAddContent = (slideIdx: number) => {
    setSlides((prev) =>
      prev.map((s, i) =>
        i === slideIdx ? { ...s, content: [...s.content, { type: 'bullet', text: '' }] } : s
      )
    )
  }

  const handleRemoveContent = (slideIdx: number, contentIdx: number) => {
    setSlides((prev) =>
      prev.map((s, i) => {
        if (i !== slideIdx) return s
        return { ...s, content: s.content.filter((_, ci) => ci !== contentIdx) }
      })
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !presentation) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-gray-500">{error || 'Not found'}</p>
        <button onClick={() => navigate('/dashboard')} className="btn-secondary">Back</button>
      </div>
    )
  }

  return (
    <div className="animate-fade-in max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <button
            onClick={() => navigate(`/presentations/${id}`)}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to presentation
          </button>
          <h1 className="text-xl font-bold text-gray-900">{presentation.title}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{slides.length} slides</p>
        </div>

        {/* Model selector */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-600 whitespace-nowrap">Image model</label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="input py-1.5 text-sm"
          >
            {LEONARDO_MODELS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Slide cards */}
      <div className="flex flex-col gap-6">
        {slides.map((slide, slideIdx) => (
          <div key={slideIdx} className="card p-0 overflow-hidden">
            {/* Image preview bar */}
            <div className="relative h-32 bg-gray-900 flex items-center justify-center">
              {slide.image_url ? (
                <img
                  src={slide.image_url}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover opacity-70"
                />
              ) : (
                <span className="text-gray-500 text-sm">No image</span>
              )}
              <div className="absolute inset-0 bg-black/30" />
              <div className="relative z-10 flex items-center gap-3">
                <button
                  onClick={() => handleGenerateImage(slideIdx)}
                  disabled={slide.generating}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/90 hover:bg-white text-gray-800 text-sm font-medium transition-colors disabled:opacity-60"
                >
                  {slide.generating ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
                      Generating…
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Regenerate image
                    </>
                  )}
                </button>
              </div>
              {/* Slide number badge */}
              <span className="absolute top-2 left-3 z-10 text-xs font-mono text-white/60">
                {slideIdx + 1} / {slides.length}
              </span>
              {/* Prompt tooltip */}
              {slide.image_query && (
                <span className="absolute bottom-2 left-3 right-3 z-10 text-xs text-white/50 truncate">
                  {slide.image_query}
                </span>
              )}
            </div>

            {/* Editor */}
            <div className="p-5 flex flex-col gap-4">
              {/* Title */}
              <div>
                <label className="label">Title</label>
                <input
                  className="input"
                  value={slide.title}
                  onChange={(e) => updateSlideField(slideIdx, { title: e.target.value })}
                  placeholder="Slide title"
                />
              </div>

              {/* Content items */}
              <div>
                <label className="label">Content</label>
                <div className="flex flex-col gap-2">
                  {slide.content.map((item, contentIdx) => (
                    <div key={contentIdx} className="flex items-center gap-2">
                      <select
                        value={item.type}
                        onChange={(e) => handleContentTypeChange(slideIdx, contentIdx, e.target.value as SlideContent['type'])}
                        className="input py-1.5 text-sm w-32 shrink-0"
                      >
                        {CONTENT_TYPES.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                      <input
                        className="input py-1.5 text-sm flex-1"
                        value={item.text}
                        onChange={(e) => handleContentChange(slideIdx, contentIdx, e.target.value)}
                        placeholder="Text..."
                      />
                      <button
                        onClick={() => handleRemoveContent(slideIdx, contentIdx)}
                        className="shrink-0 text-gray-400 hover:text-red-500 transition-colors p-1"
                        title="Remove"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => handleAddContent(slideIdx)}
                    className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center gap-1 mt-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add item
                  </button>
                </div>
              </div>

              {/* Footer actions */}
              <div className="flex items-center justify-between pt-1">
                {slide.error ? (
                  <p className="text-sm text-red-600">{slide.error}</p>
                ) : slide.saved ? (
                  <p className="text-sm text-green-600">Saved</p>
                ) : (
                  <span />
                )}
                <button
                  onClick={() => handleSaveSlide(slideIdx)}
                  disabled={slide.saving}
                  className="btn-primary text-sm py-1.5 px-4"
                >
                  {slide.saving ? 'Saving…' : 'Save slide'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
