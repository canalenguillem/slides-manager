import { Link } from 'react-router-dom'
import { Presentation } from '../../types'

interface Props {
  presentation: Presentation
  onDelete: (id: string) => void
}

export default function PresentationCard({ presentation, onDelete }: Props) {
  const formatted = new Date(presentation.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

  return (
    <article className="card p-5 flex flex-col gap-4 hover:shadow-md transition-shadow animate-fade-in">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{presentation.title}</h3>
          {presentation.description && (
            <p className="text-sm text-gray-500 mt-1 line-clamp-2">
              {presentation.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0 bg-indigo-50 text-indigo-700 text-xs font-medium px-2 py-1 rounded-full">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
          </svg>
          {presentation.slide_count} slides
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">{formatted}</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onDelete(presentation.id)}
            className="text-xs text-gray-400 hover:text-red-600 transition-colors px-2 py-1 rounded hover:bg-red-50"
          >
            Delete
          </button>
          <Link
            to={`/presentations/${presentation.id}`}
            className="btn-primary text-xs px-3 py-1.5"
          >
            View slides
          </Link>
        </div>
      </div>
    </article>
  )
}
