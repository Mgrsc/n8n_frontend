import { Message } from '../types'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface ChatMessageProps {
  message: Message
  selectable?: boolean
  onToggleSelect?: (messageId: string) => void
}

export default function ChatMessage({ message, selectable = false, onToggleSelect }: ChatMessageProps) {
  return (
    <div 
      className={`message ${message.role} ${message.selected ? 'selected' : ''} ${selectable ? 'selectable' : ''}`}
      onClick={() => selectable && onToggleSelect?.(message.id)}
    >
      {selectable && (
        <div className="message-checkbox">
          <input 
            type="checkbox" 
            checked={message.selected || false}
            onChange={() => onToggleSelect?.(message.id)}
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
      <div className="message-content">
        {message.images && message.images.length > 0 && (
          <div className="message-images">
            {message.images.map((image, index) => (
              <img 
                key={index} 
                src={image} 
                alt={`attachment-${index}`}
                className="message-image"
              />
            ))}
          </div>
        )}
        {message.content && (
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {message.content}
          </ReactMarkdown>
        )}
      </div>
    </div>
  )
}
