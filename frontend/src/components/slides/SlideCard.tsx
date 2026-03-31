import { Slide, SlideContent } from '../../types'

interface Props {
  slide: Slide
  current: number
  total: number
}

function ContentBlock({ item }: { item: SlideContent }) {
  switch (item.type) {
    case 'bullet':
      return (
        <li className="flex items-start gap-3 text-gray-700 text-lg leading-relaxed">
          <span className="mt-2 w-2 h-2 rounded-full bg-indigo-400 shrink-0" />
          {item.text}
        </li>
      )
    case 'numbered':
      return (
        <li className="text-gray-700 text-lg leading-relaxed list-decimal list-inside">
          {item.text}
        </li>
      )
    case 'heading2':
      return <h2 className="text-2xl font-semibold text-gray-800 mt-4 mb-1">{item.text}</h2>
    case 'heading3':
      return <h3 className="text-xl font-semibold text-indigo-600 mt-3 mb-1">{item.text}</h3>
    default:
      return <p className="text-gray-600 text-lg leading-relaxed">{item.text}</p>
  }
}

export default function SlideCard({ slide, current, total }: Props) {
  const isTitleSlide = slide.type === 'title' && slide.index === 0

  if (isTitleSlide) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-center px-16">
        <div className="mb-6 flex gap-1">
          {Array.from({ length: total }).map((_, i) => (
            <div
              key={i}
              className={`h-1 rounded-full transition-all duration-300 ${
                i === current ? 'bg-indigo-400 w-8' : 'bg-white/30 w-4'
              }`}
            />
          ))}
        </div>
        <h1 className="text-5xl sm:text-7xl font-extrabold text-white leading-tight tracking-tight">
          {slide.title}
        </h1>
        {slide.content.length > 0 && (
          <p className="mt-6 text-xl text-indigo-200 max-w-2xl">
            {slide.content[0].text}
          </p>
        )}
        <p className="mt-12 text-sm text-white/40">
          {total} slides · Use ← → to navigate
        </p>
      </div>
    )
  }

  const bullets = slide.content.filter((c) => c.type === 'bullet' || c.type === 'numbered')
  const texts = slide.content.filter((c) => c.type !== 'bullet' && c.type !== 'numbered')

  return (
    <div className="w-full h-full flex flex-col px-12 py-10">
      <div className="mb-2 flex gap-1">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className={`h-1 rounded-full transition-all duration-300 ${
              i === current ? 'bg-indigo-500 w-8' : 'bg-gray-200 w-4'
            }`}
          />
        ))}
      </div>

      {slide.title && (
        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-8 leading-tight">
          {slide.title}
        </h2>
      )}

      <div className="flex-1 overflow-auto">
        {texts.length > 0 && (
          <div className="flex flex-col gap-3 mb-6">
            {texts.map((item, i) => (
              <ContentBlock key={i} item={item} />
            ))}
          </div>
        )}

        {bullets.length > 0 && (
          <ul className="flex flex-col gap-4">
            {bullets.map((item, i) => (
              <ContentBlock key={i} item={item} />
            ))}
          </ul>
        )}
      </div>

      <div className="mt-6 flex items-center justify-between text-sm text-gray-400 border-t border-gray-100 pt-4">
        <span className="font-medium text-indigo-500">{current + 1} / {total}</span>
        <span>← → to navigate · Esc to exit</span>
      </div>
    </div>
  )
}
