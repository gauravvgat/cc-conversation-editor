import './globals.css'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Claude Conversation Editor',
  description: 'Edit Claude Code CLI conversation history',
}

interface RootLayoutProps {
  children: React.ReactNode
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}