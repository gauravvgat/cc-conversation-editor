import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import os from 'os'

const CLAUDE_DIR = path.join(os.homedir(), '.claude', 'projects')

function isToolResultSuccessful(content: string): boolean {
  // Check if the tool result indicates an error
  const lowerContent = content.toLowerCase()
  const errorIndicators = [
    'error',
    'failed',
    'exception',
    'traceback',
    'stderr',
    'not found',
    'permission denied',
    'timeout',
    'invalid',
    'unable to',
    'could not',
    'cannot',
    'missing'
  ]
  
  return !errorIndicators.some(indicator => lowerContent.includes(indicator))
}

export async function POST(request: Request) {
  try {
    const { project, conversation, messageId } = await request.json()
    
    if (!project || !conversation || !messageId) {
      return NextResponse.json({ error: 'Project, conversation, and messageId parameters are required' }, { status: 400 })
    }
    
    const filePath = path.join(CLAUDE_DIR, project, `${conversation}.jsonl`)
    
    try {
      await fs.access(filePath)
    } catch {
      return NextResponse.json({ error: 'Conversation file not found' }, { status: 404 })
    }
    
    // Read current content
    const content = await fs.readFile(filePath, 'utf-8')
    const lines = content.trim().split('\n').filter(line => line.trim())
    
    let modified = false
    const updatedLines = []
    
    for (const line of lines) {
      try {
        const message = JSON.parse(line)
        
        if (message.uuid === messageId && message.message?.content && Array.isArray(message.message.content)) {
          let canCompact = true
          const updatedContent = message.message.content.map((item: any) => {
            if (item.type === 'tool_use') {
              return {
                ...item,
                input: 'Tool executed successfully'
              }
            } else if (item.type === 'tool_result') {
              // Check if the tool result indicates success
              if (!isToolResultSuccessful(item.content || '')) {
                canCompact = false
                return item // Don't modify if there was an error
              }
              return {
                ...item,
                content: 'Tool executed successfully'
              }
            }
            return item
          })
          
          if (!canCompact) {
            return NextResponse.json({ 
              error: 'Cannot compact tool with errors. Tool results indicate failure.' 
            }, { status: 400 })
          }
          
          const updatedMessage = {
            ...message,
            message: {
              ...message.message,
              content: updatedContent
            }
          }
          
          updatedLines.push(JSON.stringify(updatedMessage))
          modified = true
        } else {
          updatedLines.push(line)
        }
      } catch (parseError) {
        // Keep unparseable lines as-is
        updatedLines.push(line)
      }
    }
    
    if (!modified) {
      return NextResponse.json({ error: 'Message not found or has no tool content' }, { status: 404 })
    }
    
    // Create backup before modification
    const backupPath = `${filePath}.backup.${Date.now()}`
    await fs.copyFile(filePath, backupPath)
    
    // Write updated content back to file
    const newContent = updatedLines.join('\n') + '\n'
    await fs.writeFile(filePath, newContent, 'utf-8')
    
    return NextResponse.json({ 
      success: true,
      backup: backupPath,
      message: 'Tool content compacted successfully'
    })
  } catch (error) {
    console.error('Error compacting tool:', error)
    return NextResponse.json({ error: 'Failed to compact tool' }, { status: 500 })
  }
}