export interface Message {
  uuid: string;
  parentUuid?: string | null;
  type: 'user' | 'assistant' | 'summary';
  timestamp?: string;
  message?: {
    role: 'user' | 'assistant';
    content: MessageContent[] | string;
    model?: string;
  };
  // Summary-specific fields
  summary?: string;
  leafUuid?: string;
  // Regular message fields
  isSidechain?: boolean;
  userType?: string;
  cwd?: string;
  sessionId?: string;
  version?: string;
  gitBranch?: string;
}

export interface MessageContent {
  type: 'text' | 'thinking' | 'tool_use' | 'tool_result';
  text?: string;
  thinking?: string;
  id?: string;
  name?: string;
  input?: any;
  tool_use_id?: string;
  content?: string;
}

export interface Project {
  name: string;
  path: string;
  conversationCount: number;
}

export interface Conversation {
  id: string;
  messageCount: number;
  lastModified: string;
  size: number;
}

export interface ToolUsePair {
  toolUseId: string;
  toolUseMessageUuid: string;
  toolResultMessageUuid?: string;
}

export interface ConversationStats {
  totalMessages: number;
  summaryCount: number;
  compactionPoints: string[]; // leafUuids where compaction occurred
  hasThinkingBlocks: boolean;
  hasToolPairs: boolean;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  totalMessages: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface MessagesResponse {
  messages: Message[];
  pagination: PaginationInfo;
}