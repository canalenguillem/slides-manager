import { useState, useRef, DragEvent, ChangeEvent, FormEvent } from 'react'
import { presentationsApi } from '../../services/api'
import { Presentation } from '../../types'

interface Props {
  onSuccess: (presentation: Presentation) => void
  onCancel: () => void
}

export default function UploadForm({ onSuccess, onCancel }: Props) {
  const [mode, setMode] = useState<'file' | 'paste'>('file')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [pasteContent, setPasteContent] = useState('')
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [provider, setProvider] = useState<'unsplash' | 'leonardo'>('leonardo')
  const [model, setModel] = useState('gpt-image-1.5')
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFileDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped?.name.endsWith('.md')) {
      setFile(dropped)
      if (!title) setTitle(dropped.name.replace('.md', ''))
    } else {
      setError('Only .md files are accepted')
    }
  }

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected) {
      setFile(selected)
      if (!title) setTitle(selected.name.replace('.md', ''))
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (mode === 'file' && !file) return setError('Please select a Markdown file')
    if (mode === 'paste' && !pasteContent.trim()) return setError('Please paste some Markdown content')
    if (!title.trim()) return setError('Please enter a title')

    setLoading(true)
    setError('')

    const formData = new FormData()
    formData.append('title', title.trim())
    if (description.trim()) formData.append('description', description.trim())
    formData.append('provider', provider)
    formData.append('model', model)

    if (mode === 'file' && file) {
      formData.append('file', file)
    } else {
      const blob = new Blob([pasteContent], { type: 'text/markdown' })
      formData.append('file', blob, 'presentation.md')
    }

    try {
      const res = await presentationsApi.upload(formData)
      onSuccess(res.data)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(msg || 'Upload failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-slide-up">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">New Presentation</h2>
          <p className="text-sm text-gray-500 mt-1">Upload a Markdown file or paste content directly</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          <div>
            <label className="label">Title *</label>
            <input
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="My awesome presentation"
              required
            />
          </div>

          <div>
            <label className="label">Description</label>
            <input
              className="input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
            />
          </div>

          {/* Image provider */}
          <div>
            <label className="label">Image generation</label>
            <div className="flex items-center gap-3">
              <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
                <button
                  type="button"
                  onClick={() => setProvider('unsplash')}
                  className={`px-3 py-1.5 transition-colors ${provider === 'unsplash' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Unsplash
                </button>
                <button
                  type="button"
                  onClick={() => setProvider('leonardo')}
                  className={`px-3 py-1.5 transition-colors ${provider === 'leonardo' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Leonardo
                </button>
              </div>
              {provider === 'leonardo' && (
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="input py-1.5 text-sm flex-1"
                >
                  <option value="gpt-image-1.5">GPT Image 1.5</option>
                  <option value="phoenix">Phoenix</option>
                </select>
              )}
            </div>
          </div>

          {/* Mode toggle */}
          <div className="flex rounded-lg border border-gray-200 p-1 gap-1">
            <button
              type="button"
              onClick={() => { setMode('file'); setError('') }}
              className={`flex-1 text-sm py-1.5 rounded-md transition-colors font-medium ${
                mode === 'file'
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Upload file
            </button>
            <button
              type="button"
              onClick={() => { setMode('paste'); setError('') }}
              className={`flex-1 text-sm py-1.5 rounded-md transition-colors font-medium ${
                mode === 'paste'
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Paste content
            </button>
          </div>

          {mode === 'file' ? (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleFileDrop}
              onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                dragging
                  ? 'border-indigo-400 bg-indigo-50'
                  : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
              }`}
            >
              <input
                ref={fileRef}
                type="file"
                accept=".md"
                className="hidden"
                onChange={handleFileSelect}
              />
              {file ? (
                <div className="flex items-center justify-center gap-2 text-indigo-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm font-medium">{file.name}</span>
                </div>
              ) : (
                <div className="text-gray-400">
                  <svg className="w-10 h-10 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="text-sm">Drop your .md file here or <span className="text-indigo-600">browse</span></p>
                </div>
              )}
            </div>
          ) : (
            <textarea
              className="input font-mono text-sm resize-none"
              rows={10}
              value={pasteContent}
              onChange={(e) => setPasteContent(e.target.value)}
              placeholder={`# My Presentation\n\n---\n\n## Slide 1\n\n- Bullet point\n- Another point\n\n---\n\n## Slide 2\n\nContent here...`}
            />
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onCancel} className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'Processing...' : 'Create presentation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
