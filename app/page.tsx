'use client'

import React, { useState, useEffect } from 'react'
import { Trash2, Download, Linkedin, Twitter, Search, X } from 'lucide-react'
import { Message, Project, Conversation, MessageContent, ToolUsePair, ConversationStats, PaginationInfo, MessagesResponse } from '../types'

export default function Home() {
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<string>('')
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<string>('')
  const [messages, setMessages] = useState<Message[]>([])
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string>('')
  const [conversationStats, setConversationStats] = useState<ConversationStats | null>(null)
  const [showSummaries, setShowSummaries] = useState<boolean>(true)
  const [expandedTools, setExpandedTools] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [activeFilter, setActiveFilter] = useState<string>('all')
  const [pagination, setPagination] = useState<PaginationInfo | null>(null)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [showFloatingDelete, setShowFloatingDelete] = useState<boolean>(false)

  const loadProjects = async () => {
    try {
      setLoading(true)
      setError('')
      const response = await fetch('/api/projects')
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
      const data = await response.json()
      setProjects(data)
    } catch (error) {
      console.error('Error loading projects:', error)
      setError('Failed to load projects')
    } finally {
      setLoading(false)
    }
  }

  const loadConversations = async (projectPath: string) => {
    try {
      setLoading(true)
      setError('')
      const response = await fetch(`/api/conversations?project=${encodeURIComponent(projectPath)}`)
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
      const data = await response.json()
      setConversations(data)
    } catch (error) {
      console.error('Error loading conversations:', error)
      setError('Failed to load conversations')
    } finally {
      setLoading(false)
    }
  }

  const loadMessages = async (projectPath: string, conversationId: string, page: number = 1) => {
    try {
      setLoading(true)
      setError('')
      const url = `/api/messages?project=${encodeURIComponent(projectPath)}&conversation=${conversationId}&page=${page}&limit=150&skipImages=false`
      const response = await fetch(url)
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
      const data: MessagesResponse = await response.json()
      
      if (page === 1) {
        // First load - replace all messages
        setMessages(data.messages)
        setSelectedMessages(new Set())
        setExpandedTools(new Set())
        setSearchQuery('')
        setActiveFilter('all')
        
        // Calculate conversation stats from first page (rough estimate)
        const stats = calculateConversationStats(data.messages, data.pagination.totalMessages)
        setConversationStats(stats)
        
        // Auto-scroll to conversation viewer for better UX
        setTimeout(() => {
          const conversationViewer = document.querySelector('.conversation-viewer')
          if (conversationViewer) {
            conversationViewer.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }
        }, 100)
      } else {
        // Append to existing messages
        setMessages(prev => [...prev, ...data.messages])
      }
      
      setPagination(data.pagination)
      setCurrentPage(page)
    } catch (error) {
      console.error('Error loading messages:', error)
      setError('Failed to load messages')
    } finally {
      setLoading(false)
    }
  }

  const loadMoreMessages = async () => {
    if (!pagination?.hasNext || !selectedProject || !selectedConversation) return
    await loadMessages(selectedProject, selectedConversation, currentPage + 1)
  }


  const handleProjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const project = e.target.value
    setSelectedProject(project)
    setConversations([])
    setSelectedConversation('')
    setMessages([])
    if (project) {
      loadConversations(project)
    }
  }

  const handleConversationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const conversationId = e.target.value
    setSelectedConversation(conversationId)
    setMessages([])
    setExpandedTools(new Set())
    setCurrentPage(1)
    setPagination(null)
    if (conversationId && selectedProject) {
      loadMessages(selectedProject, conversationId, 1, true)
    }
  }

  const toggleMessageSelection = (uuid: string) => {
    const message = messages.find(m => m.uuid === uuid)
    if (!message) return
    
    // Check if this message has thinking blocks
    if (hasThinkingBlocks(message)) {
      alert('Messages with thinking blocks cannot be deleted.')
      return
    }
    
    // Check if this is a summary (cannot be deleted)
    if (isSummary(message)) {
      alert('Summary lines cannot be deleted as they maintain conversation integrity.')
      return
    }

    const newSelection = new Set(selectedMessages)
    
    if (newSelection.has(uuid)) {
      // Deselecting - also deselect paired tool messages
      newSelection.delete(uuid)
      const toolPairs = findToolUsePairs()
      
      for (const pair of toolPairs) {
        if (pair.toolUseMessageUuid === uuid && pair.toolResultMessageUuid) {
          newSelection.delete(pair.toolResultMessageUuid)
        } else if (pair.toolResultMessageUuid === uuid) {
          newSelection.delete(pair.toolUseMessageUuid)
        }
      }
    } else {
      // Selecting - also select paired tool messages
      newSelection.add(uuid)
      const toolPairs = findToolUsePairs()
      
      for (const pair of toolPairs) {
        if (pair.toolUseMessageUuid === uuid && pair.toolResultMessageUuid) {
          newSelection.add(pair.toolResultMessageUuid)
        } else if (pair.toolResultMessageUuid === uuid) {
          newSelection.add(pair.toolUseMessageUuid)
        }
      }
    }
    
    setSelectedMessages(newSelection)
  }

  const calculateConversationStats = (messages: Message[], totalMessages?: number): ConversationStats => {
    const summaries = messages.filter(m => m.type === 'summary')
    const compactionPoints = summaries.map(s => s.leafUuid).filter(Boolean) as string[]
    
    const hasThinking = messages.some(m => 
      m.message?.content && Array.isArray(m.message.content) && 
      m.message.content.some((item: MessageContent) => item.type === 'thinking')
    )
    
    const hasTools = messages.some(m => 
      m.message?.content && Array.isArray(m.message.content) && 
      m.message.content.some((item: MessageContent) => 
        item.type === 'tool_use' || item.type === 'tool_result'
      )
    )
    
    return {
      totalMessages: totalMessages || messages.length,
      summaryCount: summaries.length,
      compactionPoints,
      hasThinkingBlocks: hasThinking,
      hasToolPairs: hasTools
    }
  }

  const hasThinkingBlocks = (message: Message): boolean => {
    if (message.message?.content && Array.isArray(message.message.content)) {
      return message.message.content.some((item: MessageContent) => item.type === 'thinking')
    }
    return false
  }

  const isSummary = (message: Message): boolean => {
    return message.type === 'summary'
  }

  const findToolUsePairs = (): ToolUsePair[] => {
    const pairs: ToolUsePair[] = []
    const toolUseMap = new Map<string, string>() // toolUseId -> messageUuid

    for (const message of messages) {
      if (message.message?.content && Array.isArray(message.message.content)) {
        for (const content of message.message.content) {
          if (content.type === 'tool_use' && content.id) {
            toolUseMap.set(content.id, message.uuid)
          } else if (content.type === 'tool_result' && content.tool_use_id) {
            const toolUseMessageUuid = toolUseMap.get(content.tool_use_id)
            if (toolUseMessageUuid) {
              pairs.push({
                toolUseId: content.tool_use_id,
                toolUseMessageUuid,
                toolResultMessageUuid: message.uuid
              })
            }
          }
        }
      }
    }
    return pairs
  }

  const validateToolDeletion = (messagesToDelete: Set<string>): string[] => {
    const toolPairs = findToolUsePairs()
    const errors: string[] = []

    for (const pair of toolPairs) {
      const deletingToolUse = messagesToDelete.has(pair.toolUseMessageUuid)
      const deletingToolResult = pair.toolResultMessageUuid && messagesToDelete.has(pair.toolResultMessageUuid)

      if (deletingToolUse && !deletingToolResult && pair.toolResultMessageUuid) {
        errors.push(`Cannot delete tool_use ${pair.toolUseId} without deleting its corresponding tool_result`)
      }
      
      if (!deletingToolUse && deletingToolResult) {
        errors.push(`Cannot delete tool_result for ${pair.toolUseId} without deleting its corresponding tool_use`)
      }
    }

    return errors
  }

  const selectAll = () => {
    // Only select messages that don't have thinking blocks or summaries
    const selectableMessages = messages.filter(m => 
      !hasThinkingBlocks(m) && !isSummary(m)
    )
    setSelectedMessages(new Set(selectableMessages.map(m => m.uuid)))
  }

  const deselectAll = () => {
    setSelectedMessages(new Set())
  }

  const deleteSelected = async () => {
    if (selectedMessages.size === 0) return
    
    // Validate tool_use/tool_result pairs first
    const validationErrors = validateToolDeletion(selectedMessages)
    if (validationErrors.length > 0) {
      setError(`Validation errors:\n${validationErrors.join('\n')}`)
      return
    }
    
    const confirmed = window.confirm(`Delete ${selectedMessages.size} selected messages?`)
    if (!confirmed) return

    try {
      setLoading(true)
      setError('')
      const response = await fetch('/api/delete-messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          project: selectedProject,
          conversation: selectedConversation,
          messageIds: Array.from(selectedMessages)
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        if (errorData.messagesWithThinking) {
          throw new Error(`Cannot delete messages with thinking blocks: ${errorData.messagesWithThinking.length} messages`)
        }
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      if (result.parentUuidUpdates > 0) {
        setError(`Successfully deleted ${result.deleted} messages and updated ${result.parentUuidUpdates} parent references.`)
      }
      
      await loadMessages(selectedProject, selectedConversation)
    } catch (error: any) {
      console.error('Error deleting messages:', error)
      setError(error.message || 'Failed to delete messages')
    } finally {
      setLoading(false)
    }
  }

  const toggleToolExpansion = (messageUuid: string) => {
    const newExpanded = new Set(expandedTools)
    if (newExpanded.has(messageUuid)) {
      newExpanded.delete(messageUuid)
    } else {
      newExpanded.add(messageUuid)
    }
    setExpandedTools(newExpanded)
  }

  const compactTool = async (messageUuid: string) => {
    if (!selectedProject || !selectedConversation) return
    
    try {
      setLoading(true)
      setError('')
      
      const response = await fetch('/api/compact-tools', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          project: selectedProject,
          conversation: selectedConversation,
          messageId: messageUuid
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      setError(`Tool compacted successfully. Backup created at: ${result.backup}`)
      
      // Reload messages to show the updated content
      await loadMessages(selectedProject, selectedConversation)
    } catch (error: any) {
      console.error('Error compacting tool:', error)
      setError(error.message || 'Failed to compact tool')
    } finally {
      setLoading(false)
    }
  }

  const exportConversation = async (excludeSummaries: boolean = false) => {
    if (!selectedConversation || !selectedProject) return
    
    try {
      const url = `/api/export?project=${encodeURIComponent(selectedProject)}&conversation=${selectedConversation}${excludeSummaries ? '&excludeSummaries=true' : ''}`
      const response = await fetch(url)
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
      
      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = downloadUrl
      const suffix = excludeSummaries ? '-clean' : ''
      a.download = `${selectedConversation}${suffix}.jsonl`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(downloadUrl)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error exporting conversation:', error)
      setError('Failed to export conversation')
    }
  }

  const formatTimestamp = (timestamp: string): string => {
    return new Date(timestamp).toLocaleString()
  }

  const searchInMessage = (message: Message, query: string): boolean => {
    if (!query) return true
    
    const lowerQuery = query.toLowerCase()
    
    // Search in message content
    if (message.message?.content) {
      if (typeof message.message.content === 'string') {
        if (message.message.content.toLowerCase().includes(lowerQuery)) return true
      } else if (Array.isArray(message.message.content)) {
        for (const item of message.message.content) {
          if (item.text?.toLowerCase().includes(lowerQuery)) return true
          if (item.name?.toLowerCase().includes(lowerQuery)) return true
          if (item.content?.toLowerCase().includes(lowerQuery)) return true
          if ((item as any).alt?.toLowerCase().includes(lowerQuery)) return true // Search image alt text
          if (typeof item.input === 'string' && item.input.toLowerCase().includes(lowerQuery)) return true
          if (typeof item.input === 'object' && JSON.stringify(item.input).toLowerCase().includes(lowerQuery)) return true
        }
      }
    }
    
    // Search in summary
    if (message.summary?.toLowerCase().includes(lowerQuery)) return true
    
    return false
  }

  const filterMessage = (message: Message, filter: string): boolean => {
    switch (filter) {
      case 'user':
        return message.type === 'user'
      case 'assistant':
        return message.type === 'assistant'
      case 'tools':
        return message.message?.content && Array.isArray(message.message.content) &&
          message.message.content.some((item: MessageContent) => 
            item.type === 'tool_use' || item.type === 'tool_result'
          )
      case 'images':
        return message.message?.content && Array.isArray(message.message.content) &&
          message.message.content.some((item: any) => item.type === 'image')
      case 'all':
      default:
        return true
    }
  }

  const getFilteredMessages = (): Message[] => {
    return messages.filter(message => {
      const matchesSearch = searchInMessage(message, searchQuery)
      const matchesFilter = filterMessage(message, activeFilter)
      const matchesSummaryVisibility = showSummaries || !isSummary(message)
      
      return matchesSearch && matchesFilter && matchesSummaryVisibility
    })
  }

  const clearSearch = () => {
    setSearchQuery('')
    setActiveFilter('all')
  }

  const highlightText = (text: string, query: string): string => {
    if (!query || !text) return text
    
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    return text.replace(regex, '<mark>$1</mark>')
  }

  const getMessageContent = (message: Message, isExpanded: boolean = false): string => {
    // Handle summary messages
    if (message.type === 'summary') {
      const summary = message.summary || 'No summary available'
      return searchQuery ? highlightText(summary, searchQuery) : summary
    }
    
    // Handle regular messages
    if (message.message?.content) {
      if (Array.isArray(message.message.content)) {
        return message.message.content
          .map((item: any) => {
            let content = ''
            if (item.type === 'text') {
              content = item.text || ''
            } else if (item.type === 'image') {
              // Handle image content - Claude typically stores as base64 data URI
              let imageSource = ''
              
              if (item.source) {
                // Handle different source formats
                if (typeof item.source === 'string') {
                  imageSource = item.source
                } else if (item.source.data && item.source.media_type) {
                  // Claude format: {data: "base64string", media_type: "image/png"}
                  imageSource = `data:${item.source.media_type};base64,${item.source.data}`
                }
              } else if (item.data) {
                // Direct base64 data
                const mediaType = item.media_type || item.type || 'image/png'
                imageSource = item.data.startsWith('data:') ? item.data : `data:${mediaType};base64,${item.data}`
              } else if (item.url) {
                // Regular URL
                imageSource = item.url
              }
              
              if (imageSource) {
                content = `<div class="image-message">
                  <img src="${imageSource}" alt="Message image" class="message-image" loading="lazy" />
                  ${(item as any).alt ? `<div class="image-caption">${(item as any).alt}</div>` : ''}
                </div>`
              } else {
                content = '[🖼️ Image - Unable to display]'
              }
            } else if (item.type === 'tool_use') {
              if (!isExpanded) {
                content = `[🔧 Tool: ${item.name || 'unknown'} - Click to expand]`
              } else {
                content = `[🔧 Tool Use: ${item.name || 'unknown'}]\nInput: ${JSON.stringify(item.input, null, 2)}`
              }
            } else if (item.type === 'tool_result') {
              if (!isExpanded) {
                content = `[⚙️ Tool Result - Click to expand]`
              } else {
                content = `[⚙️ Tool Result for: ${item.tool_use_id}]\nContent: ${item.content}`
              }
            } else if (item.type === 'thinking') {
              content = `[🧠 Thinking]`
            } else {
              content = `[${item.type}]`
            }
            
            // Don't highlight text inside image HTML
            if (item.type === 'image') {
              return content
            }
            return searchQuery ? highlightText(content, searchQuery) : content
          })
          .join('\n')
      }
      const content = message.message.content
      return searchQuery ? highlightText(content, searchQuery) : content
    }
    return 'No content'
  }

  useEffect(() => {
    loadProjects()
  }, [])

  // Scroll detection for floating delete button
  useEffect(() => {
    const handleScroll = () => {
      const deleteButton = document.querySelector('.delete-selected-btn')
      if (deleteButton) {
        const rect = deleteButton.getBoundingClientRect()
        const isVisible = rect.bottom >= 0 && rect.top <= window.innerHeight
        setShowFloatingDelete(!isVisible && selectedMessages.size > 0)
      } else {
        setShowFloatingDelete(false)
      }
    }

    window.addEventListener('scroll', handleScroll)
    window.addEventListener('resize', handleScroll)
    
    // Check initially
    handleScroll()
    
    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleScroll)
    }
  }, [selectedMessages.size])

  return (
    <div className="app">
      <div className="header">
        <h1>Claude Code Conversation Editor</h1>
        <p>Select a project and conversation to edit message history</p>
        <div className="social-links">
          <p>Created by Gaurav • Follow me on:</p>
          <div className="links">
            <a href="https://www.linkedin.com/in/gauravvgat/" target="_blank" rel="noopener noreferrer" className="social-link">
              <Linkedin size={16} />
              LinkedIn
            </a>
            <a href="https://x.com/Bull_lion_aire" target="_blank" rel="noopener noreferrer" className="social-link">
              <Twitter size={16} />
              X
            </a>
          </div>
        </div>
      </div>

      {error && (
        <div className="error">
          {error}
        </div>
      )}

      <div className="selector-row">
        <div className="selector-compact">
          <label>Project:</label>
          <select
            className="select-compact"
            value={selectedProject}
            onChange={handleProjectChange}
            disabled={loading}
          >
            <option value="">Choose project...</option>
            {projects.map(project => (
              <option key={project.path} value={project.path}>
                {project.name} ({project.conversationCount})
              </option>
            ))}
          </select>
        </div>

        {conversations.length > 0 && (
          <div className="selector-compact">
            <label>Conversation:</label>
            <select
              className="select-compact"
              value={selectedConversation}
              onChange={handleConversationChange}
              disabled={loading}
            >
              <option value="">Choose conversation...</option>
              {conversations.map(conv => (
                <option key={conv.id} value={conv.id}>
                  {conv.messageCount} msgs • {new Date(conv.lastModified).toLocaleDateString()} {new Date(conv.lastModified).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </option>
              ))}
            </select>
          </div>
        )}

        {selectedConversation && (
          <div className="conversation-info">
            <span className="conversation-id">{selectedConversation.slice(0, 8)}...</span>
          </div>
        )}
      </div>

      {messages.length > 0 && (
        <div className="conversation-viewer">
          {conversationStats && conversationStats.summaryCount > 0 && (
            <div className="conversation-stats">
              <div className="stats-header">
                <h3>📊 Conversation Stats</h3>
                <button 
                  className="button" 
                  onClick={() => setShowSummaries(!showSummaries)}
                >
                  {showSummaries ? 'Hide' : 'Show'} Summaries ({conversationStats.summaryCount})
                </button>
              </div>
              <div className="stats-info">
                <span>📋 {conversationStats.summaryCount} compaction{conversationStats.summaryCount !== 1 ? 's' : ''}</span>
                <span>💬 {conversationStats.totalMessages} total messages</span>
                {conversationStats.hasThinkingBlocks && <span>🧠 Has thinking blocks</span>}
                {conversationStats.hasToolPairs && <span>🔧 Has tool pairs</span>}
              </div>
            </div>
          )}
          
          <div className="search-section">
            <div className="search-bar">
              <div className="search-input-container">
                <Search size={16} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search messages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                />
                {searchQuery && (
                  <button onClick={clearSearch} className="clear-search">
                    <X size={16} />
                  </button>
                )}
              </div>
              {searchQuery && (
                <span className="search-results">
                  Showing {getFilteredMessages().length} of {messages.length} messages
                </span>
              )}
            </div>
            
            <div className="filter-buttons">
              {[
                { key: 'all', label: 'All' },
                { key: 'user', label: 'User' },
                { key: 'assistant', label: 'Assistant' },
                { key: 'tools', label: 'Tools' },
                { key: 'images', label: 'Images' }
              ].map(filter => (
                <button
                  key={filter.key}
                  onClick={() => setActiveFilter(filter.key)}
                  className={`filter-button ${activeFilter === filter.key ? 'active' : ''}`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
          
          <div className="controls">
            <div className="controls-section">
              <button className="button" onClick={selectAll}>
                Select All
              </button>
              <button className="button" onClick={deselectAll}>
                Deselect All
              </button>
              <button 
                className="button danger delete-selected-btn" 
                onClick={deleteSelected}
                disabled={selectedMessages.size === 0 || loading}
              >
                <Trash2 size={16} /> Delete Selected ({selectedMessages.size})
              </button>
            </div>
            
            <div className="controls-section">
              <button className="button" onClick={() => exportConversation()}>
                <Download size={16} /> Export Conversation
              </button>
              {conversationStats && conversationStats.summaryCount > 0 && (
                <button className="button" onClick={() => exportConversation(true)}>
                  <Download size={16} /> Export Without Summaries
                </button>
              )}
            </div>
          </div>
          
          {pagination && (
            <div className="pagination-info">
              <span>
                Showing {messages.length} of {pagination.totalMessages} messages 
                (Page {pagination.page} of {pagination.totalPages})
              </span>
            </div>
          )}

          <div className="messages-container">
            {getFilteredMessages().map(message => {
              const isSum = isSummary(message)
              const hasThinking = hasThinkingBlocks(message)
              const hasToolUse = !isSum && message.message?.content && Array.isArray(message.message.content) && 
                message.message.content.some((item: MessageContent) => item.type === 'tool_use')
              const hasToolResult = !isSum && message.message?.content && Array.isArray(message.message.content) && 
                message.message.content.some((item: MessageContent) => item.type === 'tool_result')
              const hasImage = !isSum && message.message?.content && Array.isArray(message.message.content) && 
                message.message.content.some((item: any) => item.type === 'image')
              
              // Find if this message is part of a tool pair
              const toolPairs = findToolUsePairs()
              const pairedMessage = !isSum ? toolPairs.find(pair => 
                pair.toolUseMessageUuid === message.uuid || pair.toolResultMessageUuid === message.uuid
              ) : undefined
              
              const isExpandable = hasToolUse || hasToolResult
              const isExpanded = expandedTools.has(message.uuid)
              
              // Check if tools are already compacted (content is "Tool executed successfully")
              const isAlreadyCompacted = !isSum && message.message?.content && Array.isArray(message.message.content) &&
                message.message.content.some((item: MessageContent) => 
                  (item.type === 'tool_use' && item.input === 'Tool executed successfully') ||
                  (item.type === 'tool_result' && item.content === 'Tool executed successfully')
                )
              
              return (
                <div
                  key={message.uuid || `summary-${Math.random()}`}
                  className={`message ${message.type || 'unknown'} ${selectedMessages.has(message.uuid) ? 'selected' : ''} ${hasThinking ? 'has-thinking' : ''} ${isSum ? 'summary' : ''} ${isExpandable ? 'expandable' : ''} ${isAlreadyCompacted ? 'compacted' : ''}`}
                >
                  <div className="message-header">
                    <label>
                      <input
                        type="checkbox"
                        className="checkbox"
                        checked={selectedMessages.has(message.uuid)}
                        onChange={() => toggleMessageSelection(message.uuid)}
                        disabled={hasThinking || isSum}
                        title={
                          isSum ? 'Summary lines cannot be deleted' :
                          hasThinking ? 'Cannot delete messages with thinking blocks' :
                          pairedMessage ? `Paired with tool_${pairedMessage.toolUseMessageUuid === message.uuid ? 'result' : 'use'} message (${pairedMessage.toolUseId})` :
                          ''
                        }
                      />
                      <strong>
                        {isSum ? 'Summary' : message.type === 'user' ? 'User' : 'Assistant'} 
                        {isSum && <span className="summary-indicator"> 📋</span>}
                        {hasThinking && <span className="thinking-indicator"> 🧠</span>}
                        {hasToolUse && <span className="tool-indicator"> 🔧</span>}
                        {hasToolResult && <span className="tool-indicator"> ⚙️</span>}
                        {hasImage && <span className="image-indicator"> 🖼️</span>}
                        {pairedMessage && <span className="pair-indicator"> 🔗</span>}
                        {isAlreadyCompacted && <span className="summary-indicator"> ✅</span>}
                        {isExpandable && !isAlreadyCompacted && (
                          <button 
                            className="expand-toggle"
                            onClick={() => toggleToolExpansion(message.uuid)}
                            title={isExpanded ? 'Collapse tool details' : 'Expand tool details'}
                          >
                            {isExpanded ? '▼' : '▶'}
                          </button>
                        )}
                        {isExpandable && !isAlreadyCompacted && (
                          <button 
                            className="compact-toggle"
                            onClick={() => compactTool(message.uuid)}
                            title="Compact tool - replace content with success message"
                            disabled={loading}
                          >
                            📦
                          </button>
                        )}
                      </strong>
                      {message.message?.model && (
                        <span> ({message.message.model})</span>
                      )}
                      {isSum && message.leafUuid && (
                        <span className="leaf-uuid"> → {message.leafUuid.slice(0, 8)}...</span>
                      )}
                    </label>
                    <span>{message.timestamp ? formatTimestamp(message.timestamp) : 'Compacted'}</span>
                  </div>
                  <div 
                    className={`message-content ${isExpandable ? 'tool-content' : ''}`}
                    onClick={isExpandable && !isExpanded && !isAlreadyCompacted ? () => toggleToolExpansion(message.uuid) : undefined}
                    style={isExpandable && !isExpanded && !isAlreadyCompacted ? {cursor: 'pointer'} : {}}
                    dangerouslySetInnerHTML={{ __html: getMessageContent(message, isExpanded) }}
                  />
                </div>
              )
            })}
            
            {pagination && pagination.hasNext && (
              <div className="load-more-container">
                <button 
                  className="button load-more-button" 
                  onClick={loadMoreMessages}
                  disabled={loading}
                >
                  {loading ? 'Loading...' : 'Load More Messages'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {loading && (
        <div className="loading">
          Loading...
        </div>
      )}

      {/* Floating Delete Button */}
      {showFloatingDelete && (
        <button 
          className="floating-delete-btn"
          onClick={deleteSelected}
          disabled={loading}
          title={`Delete ${selectedMessages.size} selected messages`}
        >
          <Trash2 size={20} />
          <span>{selectedMessages.size}</span>
        </button>
      )}
    </div>
  )
}