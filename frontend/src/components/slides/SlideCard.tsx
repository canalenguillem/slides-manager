import { useState } from 'react'
import { Slide, SlideContent } from '../../types'

interface Props {
  slide: Slide
  current: number
  total: number
  direction: 'next' | 'prev'
}

const GRADIENTS = [
  'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
  'linear-gradient(135deg, #141e30 0%, #243b55 100%)',
  'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)',
  'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
  'linear-gradient(135deg, #200122 0%, #6f0000 100%)',
  'linear-gradient(135deg, #093028 0%, #237a57 100%)',
  'linear-gradient(135deg, #3b1f8c 0%, #1f3c88 100%)',
  'linear-gradient(135deg, #1a1a2e 0%, #e94560 100%)',
]

function getGradient(index: number): string {
  return GRADIENTS[index % GRADIENTS.length]
}

function SlideBackground({ slide }: { slide: Slide }) {
  const [imgFailed, setImgFailed] = useState(false)
  const gradient = getGradient(slide.index)

  // Prefer stored image_url from backend; fall back to on-the-fly Unsplash query
  const imageUrl = !imgFailed
    ? (slide.image_url ?? (slide.image_query
        ? `https://source.unsplash.com/1920x1080/?${encodeURIComponent(slide.image_query)}`
        : null))
    : null

  return (
    <div className="absolute inset-0" style={{ background: gradient }}>
      {imageUrl && (
        <img
          key={imageUrl}
          src={imageUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          onError={() => setImgFailed(true)}
        />
      )}
      {/* Layered overlays for max readability */}
      <div className="absolute inset-0 bg-black/55" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20" />
    </div>
  )
}

function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="rounded-full transition-all duration-300"
          style={{
            width: i === current ? '24px' : '6px',
            height: '6px',
            background: i === current ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.3)',
          }}
        />
      ))}
    </div>
  )
}

// Hero layout: slide with only title (or first slide)
function HeroSlide({ slide, current, total }: { slide: Slide; current: number; total: number }) {
  const subtitle = slide.content.find(c => c.type === 'text')

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center text-center overflow-hidden">
      <SlideBackground slide={slide} />

      <div className="relative z-10 flex flex-col items-center justify-center px-[8%] max-w-5xl mx-auto w-full">
        {/* Category chip */}
        <div
          className="mb-8 px-4 py-1.5 rounded-full border border-white/20 bg-white/10 backdrop-blur-sm text-white/70 font-medium tracking-widest uppercase"
          style={{ fontSize: 'clamp(10px, 1.2vw, 14px)' }}
        >
          Presentation
        </div>

        <h1
          className="font-black text-white leading-[1.05] tracking-tight"
          style={{ fontSize: 'clamp(42px, 7.5vw, 100px)' }}
        >
          {slide.title}
        </h1>

        {subtitle && (
          <p
            className="mt-6 text-white/70 max-w-2xl leading-relaxed font-light"
            style={{ fontSize: 'clamp(16px, 2.2vw, 30px)' }}
          >
            {subtitle.text}
          </p>
        )}

        <div className="mt-12 flex flex-col items-center gap-4">
          <ProgressDots current={current} total={total} />
          <p
            className="text-white/30 font-light tracking-widest uppercase"
            style={{ fontSize: 'clamp(9px, 1vw, 12px)' }}
          >
            {total} slides · ← → navigate · F fullscreen
          </p>
        </div>
      </div>
    </div>
  )
}

// Bullet item
function BulletItem({ item, index }: { item: SlideContent; index: number }) {
  const isNumbered = item.type === 'numbered'

  return (
    <li
      className="flex items-start gap-4 leading-snug text-white/90"
      style={{ fontSize: 'clamp(14px, 2.2vw, 26px)', animationDelay: `${index * 60}ms` }}
    >
      <span
        className="shrink-0 rounded-full flex items-center justify-center font-semibold text-white"
        style={{
          width: 'clamp(20px, 2.2vw, 30px)',
          height: 'clamp(20px, 2.2vw, 30px)',
          minWidth: 'clamp(20px, 2.2vw, 30px)',
          marginTop: '0.2em',
          background: isNumbered ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.25)',
          fontSize: isNumbered ? 'clamp(10px, 1.2vw, 14px)' : 'clamp(8px, 1vw, 11px)',
        }}
      >
        {isNumbered ? index + 1 : ''}
        {!isNumbered && (
          <span className="w-1.5 h-1.5 rounded-full bg-white block" />
        )}
      </span>
      <span>{item.text}</span>
    </li>
  )
}

// Content layout: title + bullets/text
function ContentSlide({ slide, current, total }: { slide: Slide; current: number; total: number }) {
  const bullets = slide.content.filter(c => c.type === 'bullet' || c.type === 'numbered')
  const texts = slide.content.filter(c => c.type === 'text')
  const headings = slide.content.filter(c => c.type === 'heading2' || c.type === 'heading3')

  const visibleBullets = bullets.slice(0, 5)
  const hasMore = bullets.length > 5

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden">
      <SlideBackground slide={slide} />

      <div className="relative z-10 flex flex-col h-full px-[7%] py-[5%]">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-[4%]">
          <ProgressDots current={current} total={total} />
          <span
            className="text-white/30 font-mono"
            style={{ fontSize: 'clamp(10px, 1.1vw, 13px)' }}
          >
            {current + 1} / {total}
          </span>
        </div>

        {/* Title */}
        {slide.title && (
          <h2
            className="font-bold text-white leading-tight tracking-tight mb-[4%]"
            style={{ fontSize: 'clamp(28px, 5.5vw, 72px)' }}
          >
            {slide.title}
          </h2>
        )}

        {/* Accent line */}
        <div className="w-16 h-0.5 bg-white/30 mb-[4%] rounded-full" />

        {/* Text paragraphs */}
        {texts.length > 0 && (
          <div className="flex flex-col gap-[2%] mb-[3%]">
            {texts.map((item, i) => (
              <p
                key={i}
                className="text-white/80 leading-relaxed font-light"
                style={{ fontSize: 'clamp(13px, 2vw, 24px)' }}
              >
                {item.text}
              </p>
            ))}
          </div>
        )}

        {/* Headings */}
        {headings.length > 0 && (
          <div className="flex flex-col gap-2 mb-[3%]">
            {headings.map((item, i) => (
              <p
                key={i}
                className="text-white/70 font-semibold"
                style={{ fontSize: 'clamp(13px, 1.8vw, 22px)' }}
              >
                {item.text}
              </p>
            ))}
          </div>
        )}

        {/* Bullets */}
        {visibleBullets.length > 0 && (
          <ul className="flex flex-col gap-[2.5%] flex-1">
            {visibleBullets.map((item, i) => (
              <BulletItem key={i} item={item} index={i} />
            ))}
            {hasMore && (
              <li
                className="text-white/30 italic"
                style={{ fontSize: 'clamp(11px, 1.5vw, 18px)' }}
              >
                + {bullets.length - 5} more…
              </li>
            )}
          </ul>
        )}
      </div>
    </div>
  )
}

export default function SlideCard({ slide, current, total, direction }: Props) {
  const isHero = slide.content.length === 0 || (slide.type === 'title' && slide.index === 0)
  const animClass = direction === 'next' ? 'slide-enter-right' : 'slide-enter-left'

  return (
    <div key={`${slide.index}-${direction}`} className={`w-full h-full ${animClass}`}>
      {isHero ? (
        <HeroSlide slide={slide} current={current} total={total} />
      ) : (
        <ContentSlide slide={slide} current={current} total={total} />
      )}
    </div>
  )
}
