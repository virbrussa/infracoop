export function Tooltip({ text }: { text: string }) {
  return (
    <span className="tooltip-wrap">
      <span className="tooltip-icon" tabIndex={0}>i</span>
      <span className="tooltip-bubble">{text}</span>
    </span>
  )
}
