import { type ReactNode } from 'react'

interface PanelProps {
  children: ReactNode
  className?: string
}

export function Panel({ children, className = '' }: PanelProps) {
  return (
    <div className={`rounded-xl border border-gray-200 bg-white shadow-sm ${className}`}>
      {children}
    </div>
  )
}

Panel.Header = function PanelHeader({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`border-b border-gray-100 px-5 py-4 font-semibold text-gray-800 ${className}`}>
      {children}
    </div>
  )
}

Panel.Body = function PanelBody({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={`px-5 py-4 ${className}`}>{children}</div>
}

Panel.Footer = function PanelFooter({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`border-t border-gray-100 px-5 py-3 ${className}`}>{children}</div>
  )
}
