import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import os from 'os'

const CLAUDE_DIR = path.join(os.homedir(), '.claude', 'projects')

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const project = searchParams.get('project')
    const conversation = searchParams.get('conversation')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '150')
    const skipImages = searchParams.get('skipImages') === 'true'
    
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
    const lines = content.trim().split('\n').filter(line => line.trim())
    
    // Calculate pagination
    const totalMessages = lines.length
    const totalPages = Math.ceil(totalMessages / limit)
    const startIndex = (page - 1) * limit
    const endIndex = Math.min(startIndex + limit, totalMessages)
    
    const messages = []
    for (let i = startIndex; i < endIndex; i++) {
      try {
        const message = JSON.parse(lines[i])
        
        // Optionally skip loading base64 image data for better performance
        if (skipImages && message.message?.content && Array.isArray(message.message.content)) {
          message.message.content = message.message.content.map(item => {
            if (item.type === 'image' && item.source?.data) {
              return {
                ...item,
                source: {
                  ...item.source,
                  data: '[Image data removed for performance]'
                }
              }
            }
            return item
          })
        }
        
        messages.push(message)
      } catch (parseError) {
        console.error('Error parsing message line:', parseError)
      }
    }
    
    return NextResponse.json({
      messages,
      pagination: {
        page,
        limit,
        totalMessages,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    })
  } catch (error) {
    console.error('Error loading messages:', error)
    return NextResponse.json({ error: 'Failed to load messages' }, { status: 500 })
  }
}