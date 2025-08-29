# Claude Code Conversation Editor

A modern, high-performance Next.js web application to view and edit Claude Code CLI conversation history. Features beautiful glass-morphism UI, pagination, search, image support, and comprehensive message management tools.

## Features

### 🎨 **Modern UI & Performance**
- **Glass-morphism Design**: Beautiful animated gradients and blur effects
- **Responsive Layout**: Works perfectly on desktop, tablet, and mobile
- **High Performance**: Pagination loads only 50 messages at a time for instant loading
- **Auto-scroll**: Automatically focuses on conversation content when selected

### 🔍 **Advanced Search & Filtering**
- **Real-time Search**: Search across message content, tool names, and image descriptions
- **Smart Filters**: Filter by User, Assistant, Tools, Images, or view All messages
- **Text Highlighting**: Search terms are highlighted with beautiful gradients
- **Cross-page Search**: Search works across all loaded message pages

### 🖼️ **Image Support**
- **Base64 Images**: Full support for Claude conversation screenshots and images
- **Performance Toggle**: Load/hide images for optimal performance
- **Lazy Loading**: Images load only when needed
- **Visual Indicators**: 🖼️ icon shows messages containing images

### 🛠️ **Tool Message Management**
- **Expandable Tools**: Click to expand/collapse detailed tool_use and tool_result content
- **Tool Compaction**: Replace verbose tool outputs with success messages (only for successful tools)
- **Smart Pairing**: Tool pairs are automatically selected/deselected together
- **Error Detection**: Prevents compacting tools that failed

### 📋 **Message Management**
- **Selective Deletion**: Choose specific messages to delete with comprehensive validation
- **Thinking Block Protection**: Messages with thinking blocks cannot be deleted
- **Parent Chain Integrity**: Maintains message relationships when deleting
- **Batch Operations**: Select All/Deselect All for efficient management

### 📊 **Conversation Features**
- **Pagination**: Load more messages progressively (50 per page)
- **Compacted Conversation Support**: Handle Claude CLI summary lines and compaction points
- **Export Options**: Download as JSONL with or without summaries
- **Statistics Panel**: Shows message counts, compaction info, and conversation health

### 🔒 **Safety & Backup**
- **Automatic Backups**: Timestamped backups before any modification
- **Validation**: Comprehensive checks prevent data corruption
- **Error Handling**: Graceful fallbacks and user-friendly error messages

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Run the development server:**
   ```bash
   npm run dev
   ```

3. **Open the application:**
   Visit [http://localhost:3000](http://localhost:3000)

## How to Use

### 🚀 **Getting Started**
1. **Select a Project**: Choose from your Claude Code projects (shows conversation count)
2. **Select a Conversation**: Pick a conversation (shows message count and timestamp)
3. **Auto-scroll**: App automatically scrolls to conversation viewer for better screen usage

### 🔍 **Search & Browse**
4. **Search Messages**: Use the search bar to find specific content across all loaded pages
5. **Filter Messages**: Use quick filter buttons (All/User/Assistant/Tools/Images)
6. **Load More**: Click "Load More Messages" at the bottom to progressively load content
7. **Toggle Images**: Use 🖼️ button to show/hide images for performance

### 📝 **Message Management**
8. **View Message Details**: See visual indicators for different message types:
   - 🧠 **Thinking blocks** (cannot be deleted)
   - 🔧 **Tool use** messages  
   - ⚙️ **Tool result** messages
   - 🖼️ **Image** messages
   - 🔗 **Paired** tool messages
   - 📋 **Summary** lines from compaction
   - ✅ **Compacted** tools
9. **Expand Tools**: Click ▶ button or message content to view detailed tool information
10. **Compact Tools**: Click 📦 button to replace verbose output with success messages (permanent)
11. **Select Messages**: Check boxes next to messages (smart pairing for tools)
12. **Batch Operations**: Use Select All/Deselect All for efficiency
13. **Delete**: Click "Delete Selected" to remove messages (automatic backups)
14. **Export**: Download conversations as JSONL (with/without summaries option)

## File Structure

```
app/
├── api/
│   ├── projects/route.ts       # API to list projects
│   ├── conversations/route.ts  # API to list conversations
│   ├── messages/route.ts       # API to load messages
│   ├── delete-messages/route.ts # API to delete messages
│   ├── compact-tools/route.ts  # API to compact tool messages
│   └── export/route.ts         # API to export conversations
├── globals.css                 # Global styles
├── layout.tsx                  # Root layout
└── page.tsx                    # Main application (TypeScript)
types.ts                        # TypeScript interfaces
```

## API Endpoints

- `GET /api/projects` - List all available projects
- `GET /api/conversations?project={project}` - List conversations in a project  
- `GET /api/messages?project={project}&conversation={id}&page={page}&limit={limit}&skipImages={bool}` - Load paginated messages
- `POST /api/delete-messages` - Delete selected messages with comprehensive validation
- `POST /api/compact-tools` - Compact tool messages (replace content with success messages)
- `GET /api/export?project={project}&conversation={id}&excludeSummaries={bool}` - Export conversation

## Performance & Technical Features

### ⚡ **High Performance**
- **Pagination**: Loads only 50 messages per page for instant startup
- **Lazy Image Loading**: Images load only when needed with performance toggle
- **Smart Caching**: Previous pages remain loaded for seamless browsing
- **Efficient Search**: Real-time search across loaded content without lag
- **Background Processing**: Non-blocking operations for smooth UX

### 🔒 **Safety & Validation**
- **Automatic Backups**: Timestamped backups before any modification
- **Smart Validation**: Prevents operations that would corrupt conversation integrity
- **Message Constraints**:
  - Cannot delete thinking blocks 🧠 (would break Claude's reasoning chain)
  - Cannot delete summary lines 📋 (would break compaction structure)
  - Tool pairs must be deleted together 🔧↔⚙️ (prevents orphaned references)
- **Tool Compaction Safety**: Only successful tools can be compacted (error detection)
- **Parent Chain Integrity**: Maintains message relationships and conversation flow

## Data Location

The application reads from your Claude Code CLI data directory:
`~/.claude/projects/`

Each project contains JSONL files where each line is a JSON message object.

## Technology Stack

Built with modern web technologies for optimal performance:

- **Next.js 14** - React framework with App Router and server-side API routes
- **React 18** - Frontend UI with modern hooks and concurrent features  
- **TypeScript** - Full type safety across frontend and backend
- **Lucide React** - Beautiful, consistent icon system
- **CSS3** - Glass-morphism design with animations and gradients
- **Node.js File System** - High-performance JSONL parsing and manipulation

## Social & Credits

**Created by Gaurav** - Follow for more awesome projects:
- **LinkedIn**: [linkedin.com/in/gauravvgat](https://linkedin.com/in/gauravvgat)
- **X (Twitter)**: [@Bull_lion_aire](https://x.com/Bull_lion_aire)

## Privacy & Security

- **100% Local**: Runs entirely on your machine, no data leaves your computer
- **No Telemetry**: No analytics, tracking, or data collection
- **Open Source**: Full source code available for inspection
- **Secure**: Only accesses your local `~/.claude/projects/` directory