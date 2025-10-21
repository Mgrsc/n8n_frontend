import { useRef, useEffect, forwardRef, useImperativeHandle } from 'react'
import { Message } from '../types'
import ChatMessage from './ChatMessage'

interface VirtualMessageListProps {
  messages: Message[]
  loading?: boolean
  loadingText?: string
  isLongWait?: boolean
  selectMode?: boolean
  onToggleSelect?: (messageId: string) => void
}

export interface VirtualMessageListHandle {
  scrollToBottom: () => void
}

const VirtualMessageList = forwardRef<VirtualMessageListHandle, VirtualMessageListProps>(
  ({ messages, loading, loadingText, isLongWait, selectMode, onToggleSelect }, ref) => {
    const messagesEndRef = useRef<HTMLDivElement>(null)

    const scrollToBottom = () => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useImperativeHandle(ref, () => ({
      scrollToBottom
    }))

    useEffect(() => {
      scrollToBottom()
    }, [messages.length])

    return (
      <div className="chat-messages">
        {messages.map(message => (
          <ChatMessage 
            key={message.id} 
            message={message}
            selectable={selectMode}
            onToggleSelect={onToggleSelect}
          />
        ))}
        {loading && (
          <div className="message assistant loading">
            <div className="message-content">
              <div>{loadingText}...</div>
              {isLongWait && (
                <div className="long-wait-notice">
                  <div className="notice-warning">⚠️ 请勿关闭此标签页，任务仍在后台处理中</div>
                  <div className="notice-tip">💡 您可以切换到其他标签，完成后会通知您</div>
                </div>
              )}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
    )
  }
)

VirtualMessageList.displayName = 'VirtualMessageList'

export default VirtualMessageList
