interface GapBadgeProps {
  type: 'gap'
  variant: 'critica' | 'parcial' | 'cubierta'
  children: React.ReactNode
}

interface AgendaBadgeProps {
  type: 'agenda'
  variant: 'tecnologica' | 'datos' | 'genero'
  children: React.ReactNode
}

type BadgeProps = GapBadgeProps | AgendaBadgeProps

export function Badge({ type, variant, children }: BadgeProps) {
  if (type === 'gap') {
    return <span className={`gap-category-badge ${variant}`}>{children}</span>
  }
  return <span className={`agenda-badge ${variant}`}>{children}</span>
}
