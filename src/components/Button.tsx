import type { ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant: 'primary' | 'ghost'
  children: React.ReactNode
}

export function Button({ variant, children, className = '', ...props }: ButtonProps) {
  const cls = variant === 'primary' ? 'btn-primary' : 'btn-ghost'
  return (
    <button className={`${cls} ${className}`.trim()} {...props}>
      {children}
    </button>
  )
}
