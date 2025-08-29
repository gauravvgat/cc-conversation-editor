import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import os from 'os'

const CLAUDE_DIR = path.join(os.homedir(), '.claude', 'projects')

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const project = searchParams.get('project')
    
    if (!project) {
      return NextResponse.json({ error: 'Project parameter is required' }, { status: 400 })
    }
    
    const projectPath = path.join(CLAUDE_DIR, project)
    const files = await fs.readdir(projectPath)
    const jsonlFiles = files.filter(file => file.endsWith('.jsonl'))
    
    const conversations = []
    
    for (const file of jsonlFiles) {
      try {
        const filePath = path.join(projectPath, file)
        const stats = await fs.stat(filePath)
        
        // Count lines in file to get message count
        const content = await fs.readFile(filePath, 'utf-8')
        const messageCount = content.trim().split('\n').filter(line => line.trim()).length
        
        conversations.push({
          id: path.basename(file, '.jsonl'),
          messageCount,
          lastModified: stats.mtime.toISOString(),
          size: stats.size
        })
      } catch (error) {
        console.error(`Error reading conversation ${file}:`, error)
      }
    }
    
    return NextResponse.json(conversations.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified)))
  } catch (error) {
    console.error('Error loading conversations:', error)
    return NextResponse.json({ error: 'Failed to load conversations' }, { status: 500 })
  }
}