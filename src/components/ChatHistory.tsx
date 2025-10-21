import { Chat, Agent } from '../types'
import { useState, useEffect } from 'react'
import { loadConfig } from '../utils/config'

interface ChatHistoryProps {
  chats: Chat[]
  currentChatId: string | null
  onSelectChat: (chatId: string) => void
  onNewChat: () => void
  onDeleteChat: (chatId: string) => void
  onClearAll: () => void
}

export default function ChatHistory({
  chats,
  currentChatId,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  onClearAll
}: ChatHistoryProps) {
  const [agents, setAgents] = useState<Agent[]>([])

  useEffect(() => {
    const loadAgents = async () => {
      const config = await loadConfig()
      setAgents(config.agents)
    }
    loadAgents()
  }, [])

  const getAgentName = (agentId: string): string => {
    const agent = agents.find(a => a.id === agentId)
    return agent?.name || '未知智能体'
  }

  const handleClearAll = () => {
    if (chats.length === 0) return
    if (window.confirm(`确定要删除所有 ${chats.length} 个对话吗？此操作不可恢复。`)) {
      onClearAll()
    }
  }

  return (
    <div className="chat-history">
      <div className="history-header">
        <h2>对话列表</h2>
        <button className="new-chat-btn" onClick={onNewChat} title="新建对话">
          <span>+</span>
        </button>
      </div>
      <div className="history-list">
        {chats.length === 0 ? (
          <div className="empty-history">暂无对话</div>
        ) : (
          chats.map(chat => (
            <div
              key={chat.id}
              className={`history-item ${chat.id === currentChatId ? 'active' : ''}`}
              onClick={() => onSelectChat(chat.id)}
            >
              <div className="history-item-content">
                <div className="history-item-name">{chat.name}</div>
                <div className="history-item-agent">{getAgentName(chat.agentId)}</div>
              </div>
              <button
                className="delete-btn"
                onClick={e => {
                  e.stopPropagation()
                  if (window.confirm('确定要删除这个对话吗？')) {
                    onDeleteChat(chat.id)
                  }
                }}
                title="删除对话"
              >
                🗑️
              </button>
            </div>
          ))
        )}
      </div>
      {chats.length > 0 && (
        <div className="history-footer">
          <button className="clear-all-btn" onClick={handleClearAll}>
            <span>🗑️</span> 清空所有对话
          </button>
        </div>
      )}
    </div>
  )
}
