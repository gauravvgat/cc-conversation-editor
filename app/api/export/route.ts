import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import os from 'os'

const CLAUDE_DIR = path.join(os.homedir(), '.claude', 'projects')

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url)
    const project = searchParams.get('project')
    const conversation = searchParams.get('conversation')
    const excludeSummaries = searchParams.get('excludeSummaries') === 'true'
    
    if (!project || !conversation) {
      return NextResponse.json({ error: 'Project and conversation parameters are required' }, { status: 400 })
    }
    
    const filePath = path.join(CLAUDE_DIR, project, `${conversation}.jsonl`)
    
    try {
      await fs.access(filePath)
    } catch {
      return NextResponse.json({ error: 'Conversation file not found' }, { status: 404 })
    }
    
    const content = await fs.readFile(filePath, 'utf-8')
    
    let exportContent = content
    
    if (excludeSummaries) {
      // Filter out summary lines
      const lines = content.trim().split('\n').filter(line => line.trim())
      const filteredLines = []
      
      for (const line of lines) {
        try {
          const message = JSON.parse(line)
          if (message.type !== 'summary') {
            filteredLines.push(line)
          }
        } catch (parseError) {
          // Keep unparseable lines
          filteredLines.push(line)
        }
      }
      
      exportContent = filteredLines.join('\n') + (filteredLines.length > 0 ? '\n' : '')
    }
    
    const suffix = excludeSummaries ? '-clean' : ''
    
    return new NextResponse(exportContent, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${conversation}${suffix}.jsonl"`
      }
    })
  } catch (error) {
    console.error('Error exporting conversation:', error)
    return NextResponse.json({ error: 'Failed to export conversation' }, { status: 500 })
  }
}