import { useState, useRef, useCallback } from 'react'

const BUBBLE_WIDTH = 260
const BUBBLE_GAP = 8
const MARGIN = 12

export function Tooltip({ text }: { text: string }) {
  const iconRef = useRef<HTMLSpanElement>(null)
  const [style, setStyle] = useState<React.CSSProperties | null>(null)

  const show = useCallback(() => {
    if (!iconRef.current) return
    const rect = iconRef.current.getBoundingClientRect()
    let left = rect.left + rect.width / 2 - BUBBLE_WIDTH / 2
    left = Math.max(MARGIN, Math.min(left, window.innerWidth - BUBBLE_WIDTH - MARGIN))
    setStyle({
      position: 'fixed',
      top: rect.top - BUBBLE_GAP,
      left,
      transform: 'translateY(-100%)',
    })
  }, [])

  const hide = useCallback(() => setStyle(null), [])

  return (
    <span className="tooltip-wrap">
      <span
        ref={iconRef}
        className="tooltip-icon"
        tabIndex={0}
        onMouseEnter={show}
        onFocus={show}
        onMouseLeave={hide}
        onBlur={hide}
      >
        i
      </span>
      {style && (
        <span className="tooltip-bubble" style={style}>
          {text}
        </span>
      )}
    </span>
  )
}
