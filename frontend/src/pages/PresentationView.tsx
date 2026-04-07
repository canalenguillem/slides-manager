import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { presentationsApi } from '../services/api'
import { PresentationDetail } from '../types'
import SlideViewer from '../components/slides/SlideViewer'

export default function PresentationView() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [presentation, setPresentation] = useState<PresentationDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [generatingImages, setGeneratingImages] = useState(false)
  const [imageMsg, setImageMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [imgProvider, setImgProvider] = useState<'unsplash' | 'leonardo'>('leonardo')
  const [imgModel, setImgModel] = useState('gpt-image-1.5')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    presentationsApi
      .get(id)
      .then((res) => setPresentation(res.data))
      .catch(() => setError('Presentation not found'))
      .finally(() => setLoading(false))
  }, [id])

  const handleDeleteSlide = async (index: number) => {
    if (!id || !presentation) return
    await presentationsApi.deleteSlide(id, index)
    const updatedSlides = presentation.slides.filter((_, i) => i !== index).map((s, i) => ({ ...s, index: i }))
    setPresentation({ ...presentation, slides: updatedSlides, slide_count: updatedSlides.length })
  }

  const handleGenerateImages = async () => {
    if (!id || !presentation) return
    setGeneratingImages(true)
    setImageMsg(null)
    try {
      const res = await presentationsApi.generateImages(id, imgProvider, imgModel)
      setPresentation(res.data)
      setImageMsg({ type: 'success', text: `Images generated for ${presentation.slide_count} slides` })
    } catch {
      setImageMsg({ type: 'error', text: 'Failed to generate images. Check your Unsplash key in Settings.' })
    } finally {
      setGeneratingImages(false)
      setTimeout(() => setImageMsg(null), 5000)
    }
  }

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

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{presentation.title}</h1>
            {presentation.description && (
              <p className="text-gray-500 mt-1">{presentation.description}</p>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
              {presentation.slide_count} slides
            </div>

            <Link to={`/presentations/${id}/edit`} className="btn-secondary gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit slides
            </Link>

            {/* Provider selector */}
            <div className="flex items-center rounded-lg border border-gray-200 overflow-hidden text-sm">
              <button
                onClick={() => setImgProvider('unsplash')}
                className={`px-3 py-1.5 transition-colors ${imgProvider === 'unsplash' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Unsplash
              </button>
              <button
                onClick={() => setImgProvider('leonardo')}
                className={`px-3 py-1.5 transition-colors ${imgProvider === 'leonardo' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Leonardo
              </button>
            </div>

            {imgProvider === 'leonardo' && (
              <select
                value={imgModel}
                onChange={(e) => setImgModel(e.target.value)}
                className="input py-1.5 text-sm"
              >
                <option value="gpt-image-1.5">GPT Image 1.5</option>
                <option value="phoenix">Phoenix</option>
              </select>
            )}

            <button
              onClick={handleGenerateImages}
              disabled={generatingImages}
              className="btn-secondary gap-2"
              title="Regenerate slide background images"
            >
              {generatingImages ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Generate images
                </>
              )}
            </button>
          </div>
        </div>

        {imageMsg && (
          <div className={`mt-3 text-sm px-4 py-2.5 rounded-lg animate-fade-in ${
            imageMsg.type === 'success'
              ? 'bg-green-50 text-green-700'
              : 'bg-red-50 text-red-700'
          }`}>
            {imageMsg.text}
          </div>
        )}
      </div>

      <SlideViewer slides={presentation.slides} title={presentation.title} onDeleteSlide={handleDeleteSlide} />

      <div className="mt-4 text-center text-xs text-gray-400">
        Use ← → arrow keys to navigate · F to toggle fullscreen · Esc to go back
      </div>
    </div>
  )
}
