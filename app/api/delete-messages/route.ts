import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import os from 'os'

const CLAUDE_DIR = path.join(os.homedir(), '.claude', 'projects')

function hasThinkingBlocks(message: any): boolean {
  if (message.message?.content && Array.isArray(message.message.content)) {
    return message.message.content.some((item: any) => item.type === 'thinking')
  }
  return false
}

function isSummary(message: any): boolean {
  return message.type === 'summary'
}

export async function POST(request) {
  try {
    const { project, conversation, messageIds } = await request.json()
    
    if (!project || !conversation || !messageIds || !Array.isArray(messageIds)) {
      return NextResponse.json({ error: 'Invalid request parameters' }, { status: 400 })
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
    
    // Parse all messages first
    const messages = []
    for (const line of lines) {
      try {
        const message = JSON.parse(line)
        messages.push({ message, originalLine: line })
      } catch (parseError) {
        console.error('Error parsing message line during deletion:', parseError)
        messages.push({ message: null, originalLine: line })
      }
    }
    
    // Check for thinking blocks and summaries in messages to be deleted
    const messageIdSet = new Set(messageIds)
    const messagesWithThinking = []
    const summaryMessages = []
    
    for (const { message } of messages) {
      if (message && messageIdSet.has(message.uuid)) {
        if (hasThinkingBlocks(message)) {
          messagesWithThinking.push(message.uuid)
        }
        if (isSummary(message)) {
          summaryMessages.push(message.uuid)
        }
      }
    }
    
    if (messagesWithThinking.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete messages with thinking blocks',
        messagesWithThinking 
      }, { status: 400 })
    }
    
    if (summaryMessages.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete summary messages as they maintain conversation integrity',
        summaryMessages 
      }, { status: 400 })
    }
    
    // Filter out messages to delete and maintain parent-child relationships
    const filteredMessages = []
    const deletedMessages = new Set()
    
    for (let i = 0; i < messages.length; i++) {
      const { message, originalLine } = messages[i]
      
      if (!message) {
        // Keep unparseable lines as-is
        filteredMessages.push(originalLine)
        continue
      }
      
      if (messageIdSet.has(message.uuid)) {
        // Mark as deleted but don't add to filtered list
        deletedMessages.add(message.uuid)
        continue
      }
      
      // Check if this message's parent was deleted
      if (message.parentUuid && deletedMessages.has(message.parentUuid)) {
        // Find the nearest non-deleted ancestor, but don't cross summary boundaries
        let newParentUuid = message.parentUuid
        
        // Look backwards to find the last non-deleted message
        for (let j = i - 1; j >= 0; j--) {
          const prevMessage = messages[j].message
          if (prevMessage) {
            // Stop if we hit a summary (don't cross compaction boundaries)
            if (isSummary(prevMessage)) {
              // If the parent was deleted but there's a summary before this message,
              // link to the summary's leafUuid if it exists
              if (prevMessage.leafUuid) {
                newParentUuid = prevMessage.leafUuid
              } else {
                // Remove the parent link entirely (conversation starts here)
                newParentUuid = null
              }
              break
            }
            
            if (!deletedMessages.has(prevMessage.uuid)) {
              newParentUuid = prevMessage.uuid
              break
            }
          }
        }
        
        // Update the parentUuid
        const updatedMessage = { ...message, parentUuid: newParentUuid }
        filteredMessages.push(JSON.stringify(updatedMessage))
      } else {
        // Keep message as-is
        filteredMessages.push(originalLine)
      }
    }
    
    // Create backup before modification
    const backupPath = `${filePath}.backup.${Date.now()}`
    await fs.copyFile(filePath, backupPath)
    
    // Write filtered content back to file
    const newContent = filteredMessages.join('\n') + (filteredMessages.length > 0 ? '\n' : '')
    await fs.writeFile(filePath, newContent, 'utf-8')
    
    return NextResponse.json({ 
      success: true, 
      deleted: messageIds.length,
      remaining: filteredMessages.length,
      backup: backupPath,
      parentUuidUpdates: filteredMessages.length - (lines.length - messageIds.length)
    })
  } catch (error) {
    console.error('Error deleting messages:', error)
    return NextResponse.json({ error: 'Failed to delete messages' }, { status: 500 })
  }
}