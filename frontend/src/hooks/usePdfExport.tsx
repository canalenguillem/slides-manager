import { useCallback, useState } from 'react'
import { createRoot } from 'react-dom/client'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import { Slide } from '../types'
import SlideCard from '../components/slides/SlideCard'

const SLIDE_W = 1280
const SLIDE_H = 720

// PDF page size matching 16:9 (A4-landscape width)
const PDF_W_MM = 297
const PDF_H_MM = (PDF_W_MM * 9) / 16 // 167.0625

function waitForImages(el: HTMLElement, timeoutMs = 6000): Promise<void> {
  const imgs = Array.from(el.querySelectorAll('img'))
  if (imgs.length === 0) return Promise.resolve()
  return Promise.race([
    Promise.all(
      imgs.map(
        (img) =>
          new Promise<void>((resolve) => {
            if (img.complete && img.naturalWidth > 0) return resolve()
            img.onload = () => resolve()
            img.onerror = () => resolve()
          })
      )
    ),
    new Promise<void>((resolve) => setTimeout(resolve, timeoutMs)),
  ]).then(() => {})
}

export function usePdfExport() {
  const [exporting, setExporting] = useState(false)
  const [progress, setProgress] = useState(0)

  const exportPdf = useCallback(async (slides: Slide[], title: string) => {
    setExporting(true)
    setProgress(0)

    const container = document.createElement('div')
    container.style.cssText = [
      `position:fixed`,
      `left:-${SLIDE_W + 50}px`,
      `top:0`,
      `width:${SLIDE_W}px`,
      `height:${SLIDE_H}px`,
      `overflow:hidden`,
      `z-index:-1`,
    ].join(';')
    document.body.appendChild(container)

    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: [PDF_W_MM, PDF_H_MM],
    })

    const root = createRoot(container)

    for (let i = 0; i < slides.length; i++) {
      await new Promise<void>((resolve) => {
        root.render(
          <SlideCard
            slide={slides[i]}
            current={i}
            total={slides.length}
            direction="next"
          />
        )
        // Give React one tick to commit, then wait for images
        setTimeout(() => waitForImages(container).then(resolve), 80)
      })

      const canvas = await html2canvas(container, {
        width: SLIDE_W,
        height: SLIDE_H,
        scale: 1,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#000000',
        logging: false,
      })

      const imgData = canvas.toDataURL('image/jpeg', 0.92)
      if (i > 0) pdf.addPage()
      pdf.addImage(imgData, 'JPEG', 0, 0, PDF_W_MM, PDF_H_MM)

      setProgress(Math.round(((i + 1) / slides.length) * 100))
    }

    root.unmount()
    document.body.removeChild(container)

    pdf.save(`${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`)
    setExporting(false)
    setProgress(0)
  }, [])

  return { exportPdf, exporting, progress }
}
