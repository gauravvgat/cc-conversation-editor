# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
npm run dev        # Start development server (http://localhost:3000)
npm run build      # Build for production  
npm run start      # Start production server
npm run lint       # Run ESLint
npm install        # Install dependencies
```

## Architecture Overview

This is a **Next.js 14 App Router** application that provides a web interface for viewing and editing Claude CLI conversation history stored in `~/.claude/projects/` as JSONL files.

**Tech Stack:**
- Next.js 14 with TypeScript
- Client-side React (app/page.tsx) + Server API routes (app/api/)
- CSS3 glass-morphism design with animations
- File system operations for JSONL parsing

**Key Files:**
- `app/page.tsx` - Main React component with conversation UI
- `app/api/*/route.ts` - Server-side API endpoints for file operations
- `types.ts` - TypeScript interfaces for Message, Project, Conversation
- `app/globals.css` - Glass-morphism styling and animations

## Data Format & Claude CLI Integration

**JSONL Structure:** Each `.jsonl` file contains one JSON message object per line
```typescript
interface Message {
  uuid: string
  parentUuid?: string | null    // Threading relationship
  type: 'user' | 'assistant' | 'summary'
  message?: {
    role: 'user' | 'assistant'
    content: MessageContent[] | string  // Can include text, thinking, tool_use, tool_result, images
  }
  summary?: string              // From Claude CLI compaction
  leafUuid?: string            // Points to original compacted message
}
```

**Content Types:**
- `text` - Regular conversation text
- `thinking` - Claude's internal reasoning (>à - cannot be deleted)
- `tool_use` - Tool invocations with parameters  
- `tool_result` - Tool execution results
- Base64 images stored in message content

## Critical Message Constraints

These validation rules prevent conversation corruption:

1. **Thinking blocks** (>à): Cannot be deleted - protects Claude's reasoning chain
2. **Summary lines** (=Ë): Cannot be deleted - maintains compaction structure  
3. **Tool pairs** (='”™): tool_use and tool_result must be deleted together
4. **Parent chain integrity**: parentUuid relationships maintained during deletions

## API Architecture

**Key Endpoints:**
- `GET /api/projects` - List Claude projects with conversation counts
- `GET /api/conversations?project={project}` - List JSONL files with metadata
- `GET /api/messages?project={project}&conversation={id}&page={page}&limit={limit}` - Paginated message loading (default 150/page)
- `POST /api/delete-messages` - Delete with validation and automatic backups
- `POST /api/compact-tools` - Replace verbose tool output with success messages
- `GET /api/export` - Download conversation as JSONL

**Safety Features:**
- Automatic timestamped backups before any modification
- Atomic file operations with validation
- Comprehensive constraint checking

## Performance Features

- **Pagination**: Loads 150 messages/page, previous pages cached
- **Image handling**: Base64 images can be skipped for faster loading
- **Search**: Real-time across loaded messages with highlighting
- **Progressive loading**: "Load More" appends to existing messages

## UI Concepts

**Glass-morphism Design:**
- Animated gradient backgrounds with Gen Z colors
- Blur effects, transparency, smooth transitions
- Responsive layout with auto-scroll to conversation viewer

**Message Selection:**
- Smart tool pairing (selecting tool_use auto-selects tool_result)
- Visual indicators: >à='™=¼==Ë 
- Floating delete button when scrolled out of view

**Search & Filtering:**
- Real-time search with gradient highlighting
- Quick filters: All/User/Assistant/Tools/Images
- Cross-page search across all loaded content

## Important Technical Notes

- Uses `~/.claude/projects/` directory for data source
- JSONL format: each line = one JSON message object
- Tool compaction modifies actual files (not just display)
- All file operations create backups automatically
- Parent-child message relationships critical for conversation threading
- TypeScript strict mode enabled across entire codebase