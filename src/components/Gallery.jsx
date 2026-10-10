import { useEffect, useState } from 'react'
import './Gallery.css'

// Læg dine egne screenshots i public/images/gallery/ og ret filnavnene her.
// Indtil billederne er på plads, vises der bare et tomt panel — ingen
// ødelagte billed-ikoner.
const SHOTS = [
  { src: '/images/gallery/01.jpg', caption: 'Downtown ved solnedgang' },
  { src: '/images/gallery/02.jpg', caption: 'Politiets hovedkvarter' },
  { src: '/images/gallery/03.jpg', caption: 'Havnedistriktet' },
  { src: '/images/gallery/04.jpg', caption: 'Retssal, dag 1' },
  { src: '/images/gallery/05.jpg', caption: 'Vinewood om natten' },
]

export default function Gallery() {
  const [activeIndex, setActiveIndex] = useState(null)

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setActiveIndex(null)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const openLightbox = (index) => setActiveIndex(index)
  const closeLightbox = () => setActiveIndex(null)

  return (
    <section id="galleri" className="section gallery">
      <div className="container">
        <h2 className="gallery__title">Billeder fra byen</h2>

        <div className="gallery__grid">
          {SHOTS.map((s, i) => (
            <figure
              className={`gallery__item gallery__item--${i}`}
              key={s.src}
              onClick={() => openLightbox(i)}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') openLightbox(i)
              }}
            >
              <div className="gallery__image">
                <img
                  src={s.src}
                  srcSet={`${s.src} 1x, ${s.src} 2x`}
                  sizes="(max-width: 860px) 100vw, 33vw"
                  alt={s.caption}
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <figcaption>{s.caption}</figcaption>
            </figure>
          ))}
        </div>

        {activeIndex !== null && (
          <div className="gallery__lightbox" onClick={closeLightbox}>
            <div className="gallery__lightbox-backdrop" />
            <button
              type="button"
              className="gallery__lightbox-close"
              onClick={(event) => {
                event.stopPropagation()
                closeLightbox()
              }}
              aria-label="Luk billede"
            >
              ×
            </button>
            <div className="gallery__lightbox-content" onClick={(event) => event.stopPropagation()}>
              <img
                src={SHOTS[activeIndex].src}
                alt={SHOTS[activeIndex].caption}
                loading="eager"
                decoding="async"
              />
              <p>{SHOTS[activeIndex].caption}</p>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
