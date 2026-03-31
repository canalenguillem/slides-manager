import { useState, useEffect, FormEvent } from 'react'
import { apiKeysApi } from '../services/api'
import { APIKey } from '../types'

const PROVIDERS = [
  {
    id: 'unsplash' as const,
    name: 'Unsplash',
    description: 'Stock photos automatically matched to each slide topic. Free key at unsplash.com/developers',
    placeholder: 'your-unsplash-access-key',
  },
  {
    id: 'openai' as const,
    name: 'OpenAI',
    description: 'GPT models for text generation and improvement',
    placeholder: 'sk-...',
  },
  {
    id: 'leonardo' as const,
    name: 'Leonardo AI',
    description: 'Image generation for slides',
    placeholder: 'leo-...',
  },
]

interface ProviderCardProps {
  provider: (typeof PROVIDERS)[0]
  apiKey: APIKey | undefined
  onSave: (provider: string, key: string) => Promise<void>
  onToggle: (provider: string, active: boolean) => Promise<void>
  onDelete: (provider: string) => Promise<void>
}

function ProviderCard({ provider, apiKey, onSave, onToggle, onDelete }: ProviderCardProps) {
  const [editing, setEditing] = useState(false)
  const [key, setKey] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async (e: FormEvent) => {
    e.preventDefault()
    if (!key.trim()) return
    setLoading(true)
    setError('')
    try {
      await onSave(provider.id, key.trim())
      setKey('')
      setEditing(false)
    } catch {
      setError('Failed to save key. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Remove ${provider.name} API key?`)) return
    setLoading(true)
    try {
      await onDelete(provider.id)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-900">{provider.name}</h3>
          <p className="text-sm text-gray-500 mt-0.5">{provider.description}</p>
        </div>
        <div className="flex items-center gap-2">
          {apiKey ? (
            <span className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
              apiKey.is_active
                ? 'bg-green-50 text-green-700'
                : 'bg-gray-100 text-gray-500'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${apiKey.is_active ? 'bg-green-500' : 'bg-gray-400'}`} />
              {apiKey.is_active ? 'Active' : 'Disabled'}
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-amber-50 text-amber-700">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              Not configured
            </span>
          )}
        </div>
      </div>

      {apiKey && !editing && (
        <div className="flex items-center gap-2 mb-4">
          <div className="flex-1 bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-500 font-mono">
            ••••••••••••••••••••
          </div>
          <button
            onClick={() => onToggle(provider.id, !apiKey.is_active)}
            className="btn-secondary text-xs px-3 py-2"
          >
            {apiKey.is_active ? 'Disable' : 'Enable'}
          </button>
        </div>
      )}

      {editing ? (
        <form onSubmit={handleSave} className="flex flex-col gap-3">
          <input
            type="password"
            className="input font-mono text-sm"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder={provider.placeholder}
            autoFocus
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setEditing(false); setKey(''); setError('') }}
              className="btn-secondary flex-1 text-xs"
            >
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 text-xs">
              {loading ? 'Saving...' : 'Save key'}
            </button>
          </div>
        </form>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={() => setEditing(true)}
            className="btn-primary text-xs flex-1"
          >
            {apiKey ? 'Update key' : 'Add key'}
          </button>
          {apiKey && (
            <button
              onClick={handleDelete}
              disabled={loading}
              className="btn-danger text-xs px-3"
            >
              Remove
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default function Settings() {
  const [apiKeys, setApiKeys] = useState<APIKey[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiKeysApi
      .list()
      .then((res) => setApiKeys(res.data))
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async (provider: string, key: string) => {
    const res = await apiKeysApi.save({ provider, key })
    setApiKeys((prev) => {
      const exists = prev.find((k) => k.provider === provider)
      return exists
        ? prev.map((k) => (k.provider === provider ? res.data : k))
        : [...prev, res.data]
    })
  }

  const handleToggle = async (provider: string, active: boolean) => {
    const res = await apiKeysApi.update(provider, { is_active: active })
    setApiKeys((prev) =>
      prev.map((k) => (k.provider === provider ? res.data : k))
    )
  }

  const handleDelete = async (provider: string) => {
    await apiKeysApi.delete(provider)
    setApiKeys((prev) => prev.filter((k) => k.provider !== provider))
  }

  return (
    <div className="animate-fade-in max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">Manage your API keys and account preferences</p>
      </div>

      <section>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900">API Keys</h2>
          <p className="text-sm text-gray-500 mt-1">
            Your keys are encrypted and never exposed to the frontend. They are used exclusively
            by the backend for AI-powered features.
          </p>
        </div>

        {loading ? (
          <div className="flex flex-col gap-4">
            {PROVIDERS.map((p) => (
              <div key={p.id} className="card p-6 h-36 animate-pulse bg-gray-100" />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {PROVIDERS.map((p) => (
              <ProviderCard
                key={p.id}
                provider={p}
                apiKey={apiKeys.find((k) => k.provider === p.id)}
                onSave={handleSave}
                onToggle={handleToggle}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
