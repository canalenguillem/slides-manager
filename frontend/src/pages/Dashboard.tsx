import { useState, useEffect } from 'react'
import { presentationsApi } from '../services/api'
import { Presentation } from '../types'
import PresentationCard from '../components/presentations/PresentationCard'
import UploadForm from '../components/presentations/UploadForm'
import { useAuth } from '../contexts/AuthContext'

export default function Dashboard() {
  const { user } = useAuth()
  const [presentations, setPresentations] = useState<Presentation[]>([])
  const [loading, setLoading] = useState(true)
  const [showUpload, setShowUpload] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    presentationsApi
      .list()
      .then((res) => setPresentations(res.data))
      .catch(() => setError('Failed to load presentations'))
      .finally(() => setLoading(false))
  }, [])

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this presentation?')) return
    try {
      await presentationsApi.delete(id)
      setPresentations((prev) => prev.filter((p) => p.id !== id))
    } catch {
      alert('Failed to delete presentation')
    }
  }

  const handleUploadSuccess = (presentation: Presentation) => {
    setPresentations((prev) => [presentation, ...prev])
    setShowUpload(false)
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome, {user?.username}
          </h1>
          <p className="text-gray-500 mt-1">
            {presentations.length} presentation{presentations.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={() => setShowUpload(true)} className="btn-primary gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Presentation
        </button>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3 mb-6">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card p-5 h-36 animate-pulse bg-gray-100" />
          ))}
        </div>
      ) : presentations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No presentations yet</h3>
          <p className="text-gray-500 mb-6 max-w-sm">
            Upload a Markdown file and we'll turn it into a beautiful presentation
          </p>
          <button onClick={() => setShowUpload(true)} className="btn-primary">
            Upload your first .md file
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {presentations.map((p) => (
            <PresentationCard key={p.id} presentation={p} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {showUpload && (
        <UploadForm
          onSuccess={handleUploadSuccess}
          onCancel={() => setShowUpload(false)}
        />
      )}
    </div>
  )
}
