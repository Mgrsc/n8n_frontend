export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  selected?: boolean
  images?: string[]
}

export interface Chat {
  id: string
  name: string
  agentId: string
  messages: Message[]
  createdAt: number
  updatedAt: number
}

export interface User {
  username: string
  password: string
}

export interface Agent {
  id: string
  name: string
  webhook_url: string
  auth_user: string
  auth_password: string
}

export interface TopicLLM {
  enabled: boolean
  base_url: string
  api_key: string
  model: string
}

export type LogLevel = 'debug' | 'info' | 'error'

export interface Config {
  agents: Agent[]
  topic_llm: TopicLLM
  app_title?: string
  log_level?: LogLevel
}
