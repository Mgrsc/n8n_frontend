import { useState, useRef, useEffect, FormEvent } from 'react'
import { Chat, Message } from '../types'
import { sendMessage, generateChatName } from '../utils/api'
import { updateChat } from '../utils/storage'
import { getAgentById } from '../utils/config'
import { logger } from '../utils/logger'
import VirtualMessageList, { VirtualMessageListHandle } from './VirtualMessageList'

interface ChatInterfaceProps {
  chat: Chat | null
  onChatUpdate: () => void
}

export default function ChatInterface({ chat, onChatUpdate }: ChatInterfaceProps) {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingText, setLoadingText] = useState('思考中')
  const [isLongWait, setIsLongWait] = useState(false)
  const [isBackgroundMode, setIsBackgroundMode] = useState(false)
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default')
  const [selectMode, setSelectMode] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [showPdfQualityDialog, setShowPdfQualityDialog] = useState(false)
  const virtualListRef = useRef<VirtualMessageListHandle>(null)
  const loadingIntervalRef = useRef<number | null>(null)
  const longWaitTimerRef = useRef<number | null>(null)
  const requestStartTimeRef = useRef<number>(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    virtualListRef.current?.scrollToBottom()
  }, [chat?.messages])

  // 请求通知权限
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission)
      if (Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          setNotificationPermission(permission)
        })
      }
    }
  }, [])

  // 监听页面可见性变化
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && loading && isLongWait) {
        setIsBackgroundMode(true)
        logger.info('用户切换到其他标签，后台继续处理')
        
        // 保存后台处理状态
        if (chat) {
          localStorage.setItem('backgroundTask', JSON.stringify({
            chatId: chat.id,
            startTime: requestStartTimeRef.current,
            status: 'processing'
          }))
        }
      } else if (!document.hidden && isBackgroundMode) {
        setIsBackgroundMode(false)
        logger.info('用户返回标签页')
        
        // 清除后台任务标记
        localStorage.removeItem('backgroundTask')
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [loading, isLongWait, isBackgroundMode, chat])

  // 页面加载时检查是否有未完成的后台任务
  useEffect(() => {
    const backgroundTask = localStorage.getItem('backgroundTask')
    if (backgroundTask) {
      try {
        const task = JSON.parse(backgroundTask)
        const elapsedTime = Date.now() - task.startTime
        if (elapsedTime < 300000) { // 5分钟内
          logger.info('检测到未完成的后台任务，继续等待', { elapsedTime: Math.floor(elapsedTime / 1000) })
        } else {
          logger.info('后台任务超时，清除状态', { elapsedTime: Math.floor(elapsedTime / 1000) })
          localStorage.removeItem('backgroundTask')
        }
      } catch (e) {
        localStorage.removeItem('backgroundTask')
      }
    }
  }, [])

  useEffect(() => {
    if (loading) {
      const normalTexts = ['思考中', '分析中', '处理中', '生成回复中']
      const longWaitTexts = [
        '多专家正在深度分析，请耐心等待',
        '复杂任务处理中，马上就好',
        '正在调用多个模型协同分析',
        '生成高质量回复需要一些时间'
      ]
      
      let index = 0
      loadingIntervalRef.current = setInterval(() => {
        index = (index + 1) % (isLongWait ? longWaitTexts.length : normalTexts.length)
        setLoadingText(isLongWait ? longWaitTexts[index] : normalTexts[index])
      }, 1500)

      // 设置40秒后的长时间等待检测
      longWaitTimerRef.current = window.setTimeout(() => {
        setIsLongWait(true)
        logger.info('检测到长时间等待（>40秒），切换到特殊提示')
        
        // 如果用户还在当前页面，提示可以后台运行
        if (!document.hidden && notificationPermission === 'granted') {
          logger.debug('提示用户可以切换标签，后台继续处理')
        }
      }, 40000)
    } else {
      if (loadingIntervalRef.current) {
        clearInterval(loadingIntervalRef.current)
        loadingIntervalRef.current = null
      }
      if (longWaitTimerRef.current) {
        clearTimeout(longWaitTimerRef.current)
        longWaitTimerRef.current = null
      }
      setLoadingText('思考中')
      setIsLongWait(false)
    }
    return () => {
      if (loadingIntervalRef.current) {
        clearInterval(loadingIntervalRef.current)
      }
      if (longWaitTimerRef.current) {
        clearTimeout(longWaitTimerRef.current)
      }
    }
  }, [loading, isLongWait])

  useEffect(() => {
    return () => {
      // Base64 不需要清理
    }
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if ((!input.trim() && selectedFiles.length === 0) || !chat || loading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
      images: imagePreviews.length > 0 ? [...imagePreviews] : undefined
    }

    const updatedMessages = [...chat.messages, userMessage]
    updateChat(chat.id, { messages: updatedMessages })
    onChatUpdate()
    setInput('')
    setLoading(true)
    requestStartTimeRef.current = Date.now()

    const filesToSend = [...selectedFiles]
    setSelectedFiles([])
    setImagePreviews([])

    try {
      const agent = await getAgentById(chat.agentId)
      if (!agent) {
        throw new Error('Agent not found')
      }

      // 创建助手消息ID（但不立即添加到聊天）
      const assistantMessageId = (Date.now() + 1).toString()
      let streamedContent = ''
      let hasAddedMessage = false

      const response = await sendMessage(
        userMessage.content || '查看图片',
        chat.id,
        agent,
        filesToSend.length > 0 ? filesToSend : undefined,
        (chunk: string) => {
          // 流式更新回调
          streamedContent += chunk
          
          // 收到数据后重置长时间等待状态
          if (isLongWait) {
            setIsLongWait(false)
          }
          
          // 第一次收到内容时才添加助手消息
          if (!hasAddedMessage) {
            hasAddedMessage = true
            const elapsedTime = Date.now() - requestStartTimeRef.current
            logger.info(`收到首个响应块，耗时: ${(elapsedTime / 1000).toFixed(1)}秒`)
            
            const assistantMessage: Message = {
              id: assistantMessageId,
              role: 'assistant',
              content: streamedContent,
              timestamp: Date.now()
            }
            updateChat(chat.id, { messages: [...updatedMessages, assistantMessage] })
            onChatUpdate()
          } else {
            // 后续更新内容
            const currentMessages = [...updatedMessages, {
              id: assistantMessageId,
              role: 'assistant',
              content: streamedContent,
              timestamp: Date.now()
            }] as Message[]
            updateChat(chat.id, { messages: currentMessages })
            onChatUpdate()
          }
        }
      )
      
      // 最终更新（确保内容完整）
      const finalAssistantMessage: Message = {
        id: assistantMessageId,
        role: 'assistant',
        content: response || streamedContent,
        timestamp: Date.now()
      }

      const finalMessages = [...updatedMessages, finalAssistantMessage]
      updateChat(chat.id, { messages: finalMessages })

      const totalTime = Date.now() - requestStartTimeRef.current
      logger.info(`请求完成，总耗时: ${(totalTime / 1000).toFixed(1)}秒`)

      // 清除后台任务标记
      localStorage.removeItem('backgroundTask')

      // 如果在后台模式且有通知权限，发送通知
      if (isBackgroundMode && notificationPermission === 'granted') {
        const notificationTitle = 'AI 回复已完成 ✨'
        const notificationBody = finalAssistantMessage.content.slice(0, 100) + '...'
        
        try {
          const notification = new Notification(notificationTitle, {
            body: notificationBody,
            icon: '/favicon.svg',
            badge: '/favicon.svg',
            tag: 'ai-response',
            requireInteraction: false,
            silent: false
          })

          notification.onclick = () => {
            window.focus()
            notification.close()
          }

          logger.info('已发送浏览器通知')
        } catch (error) {
          logger.error('通知发送失败', error)
        }
      }

      if (chat.name === 'New Chat' && finalMessages.length === 6) {
        const conversationMessages = finalMessages.map(msg => ({
          role: msg.role,
          content: msg.content
        }))
        const newName = await generateChatName(conversationMessages)
        updateChat(chat.id, { name: newName })
      }

      onChatUpdate()
    } catch (error) {
      const totalTime = Date.now() - requestStartTimeRef.current
      logger.error(`请求失败，耗时: ${(totalTime / 1000).toFixed(1)}秒`, error)
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '抱歉，请求出错了。可能是网络问题或服务暂时不可用，请稍后重试。',
        timestamp: Date.now()
      }
      updateChat(chat.id, { messages: [...updatedMessages, errorMessage] })
      onChatUpdate()
    } finally {
      setLoading(false)
    }
  }

  const handleToggleSelect = (messageId: string) => {
    if (!chat) return
    const updatedMessages = chat.messages.map(msg => 
      msg.id === messageId ? { ...msg, selected: !msg.selected } : msg
    )
    updateChat(chat.id, { messages: updatedMessages })
    onChatUpdate()
  }

  const handleSelectAll = () => {
    if (!chat) return
    const allSelected = chat.messages.every(msg => msg.selected)
    const updatedMessages = chat.messages.map(msg => ({
      ...msg,
      selected: !allSelected
    }))
    updateChat(chat.id, { messages: updatedMessages })
    onChatUpdate()
  }

  const handleExportMarkdown = () => {
    if (!chat) return
    const selectedMessages = chat.messages.filter(msg => msg.selected)
    if (selectedMessages.length === 0) {
      alert('请先选择要导出的消息')
      return
    }

    let markdown = `# ${chat.name}\n\n`
    selectedMessages.forEach(msg => {
      const time = new Date(msg.timestamp).toLocaleString('zh-CN')
      markdown += `## ${msg.role === 'user' ? '用户' : '助手'} - ${time}\n\n${msg.content}\n\n---\n\n`
    })

    const blob = new Blob([markdown], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${chat.name}-${Date.now()}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleExportPDF = async (quality: 'high' | 'standard' | 'compressed' = 'standard') => {
    if (!chat) return
    const selectedMessages = chat.messages.filter(msg => msg.selected)
    if (selectedMessages.length === 0) {
      alert('请先选择要导出的消息')
      return
    }

    setShowPdfQualityDialog(false)

    // 质量参数配置
    const qualitySettings = {
      high: { scale: 2.0, jpegQuality: 0.95, desc: '高清' },
      standard: { scale: 1.5, jpegQuality: 0.85, desc: '标准' },
      compressed: { scale: 1.0, jpegQuality: 0.7, desc: '压缩' }
    }
    const settings = qualitySettings[quality]
    logger.info(`开始导出PDF - ${settings.desc}模式`, { quality, messageCount: selectedMessages.length })

    try {
      const { jsPDF } = await import('jspdf')
      const html2canvas = (await import('html2canvas')).default
      const ReactMarkdown = (await import('react-markdown')).default
      const remarkGfm = (await import('remark-gfm')).default
      const { createRoot } = await import('react-dom/client')
      
      // 创建临时容器用于渲染内容
      const container = document.createElement('div')
      container.style.position = 'absolute'
      container.style.left = '-9999px'
      container.style.width = '800px'
      container.style.padding = '40px'
      container.style.backgroundColor = 'white'
      container.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      
      document.body.appendChild(container)
      
      // 使用 React 渲染 Markdown 内容
      const root = createRoot(container)
      
      const PDFContent = () => (
        <div>
          <div style={{ marginBottom: '30px' }}>
            <h1 style={{ color: '#d97757', fontSize: '28px', marginBottom: '10px' }}>{chat.name}</h1>
            <p style={{ color: '#8b8b8b', fontSize: '14px' }}>{new Date().toLocaleString('zh-CN')}</p>
          </div>
          
          {selectedMessages.map((msg, idx) => {
            const time = new Date(msg.timestamp).toLocaleString('zh-CN')
            const role = msg.role === 'user' ? '用户' : 'AI助手'
            const bgColor = msg.role === 'user' ? 'rgba(217, 119, 87, 0.1)' : '#f0eee6'
            
            return (
              <div key={idx} style={{
                marginBottom: '20px',
                padding: '15px',
                background: bgColor,
                borderRadius: '8px',
                borderLeft: '4px solid #d97757'
              }}>
                <div style={{
                  fontWeight: 600,
                  color: '#d97757',
                  marginBottom: '8px',
                  fontSize: '14px'
                }}>
                  {role} - {time}
                </div>
                <div style={{
                  color: '#4a4a4a',
                  lineHeight: '1.7',
                  fontSize: '14px'
                }} className="markdown-content">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                </div>
              </div>
            )
          })}
        </div>
      )
      
      // 渲染 React 组件
      await new Promise<void>((resolve) => {
        root.render(<PDFContent />)
        // 等待渲染完成
        setTimeout(resolve, 500)
      })
      
      // 添加 Markdown 样式
      const style = document.createElement('style')
      style.textContent = `
        .markdown-content h1, .markdown-content h2, .markdown-content h3 {
          margin-top: 16px;
          margin-bottom: 12px;
          font-weight: 600;
        }
        .markdown-content h1 { font-size: 20px; }
        .markdown-content h2 { font-size: 18px; }
        .markdown-content h3 { font-size: 16px; }
        .markdown-content p {
          margin-bottom: 12px;
        }
        .markdown-content ul, .markdown-content ol {
          margin-left: 20px;
          margin-bottom: 12px;
        }
        .markdown-content li {
          margin-bottom: 6px;
        }
        .markdown-content code {
          background: #f5f5f5;
          padding: 2px 6px;
          border-radius: 3px;
          font-family: 'Courier New', monospace;
          font-size: 13px;
        }
        .markdown-content pre {
          background: #f5f5f5;
          padding: 12px;
          border-radius: 6px;
          overflow-x: auto;
          margin-bottom: 12px;
        }
        .markdown-content pre code {
          background: none;
          padding: 0;
        }
        .markdown-content blockquote {
          border-left: 3px solid #d97757;
          padding-left: 12px;
          color: #666;
          margin: 12px 0;
        }
        .markdown-content a {
          color: #d97757;
          text-decoration: none;
        }
        .markdown-content strong {
          font-weight: 600;
        }
        .markdown-content table {
          width: 100%;
          border-collapse: collapse;
          margin: 12px 0;
          font-size: 13px;
        }
        .markdown-content th {
          padding: 10px;
          text-align: left;
          font-weight: 600;
          color: #d97757;
          background: rgba(217, 119, 87, 0.1);
          border-bottom: 2px solid rgba(217, 119, 87, 0.3);
        }
        .markdown-content td {
          padding: 8px 10px;
          border-bottom: 1px solid #ddd;
        }
        .markdown-content tbody tr:last-child td {
          border-bottom: none;
        }
        .markdown-content tbody tr:nth-child(even) {
          background: #f9f9f9;
        }
      `
      document.head.appendChild(style)
      
      // 使用html2canvas将HTML转为图片
      const canvas = await html2canvas(container, {
        scale: settings.scale,
        useCORS: true,
        backgroundColor: '#ffffff'
      })
      
      // 清理
      root.unmount()
      document.body.removeChild(container)
      document.head.removeChild(style)
      
      // 创建PDF
      const imgData = canvas.toDataURL('image/jpeg', settings.jpegQuality)
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true  // 启用PDF压缩
      })
      
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const imgWidth = pageWidth
      const imgHeight = (canvas.height * pageWidth) / canvas.width
      
      let heightLeft = imgHeight
      let position = 0
      
      // 如果内容超过一页，分页处理
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST')  // 使用FAST压缩
      heightLeft -= pageHeight
      
      while (heightLeft > 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST')
        heightLeft -= pageHeight
      }
      
      const fileName = `${chat.name}-${Date.now()}.pdf`
      pdf.save(fileName)
      logger.info('PDF导出成功', { quality: settings.desc, messageCount: selectedMessages.length, fileName })
    } catch (error) {
      logger.error('PDF导出失败', error)
      alert('PDF 导出失败，请重试')
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    
    const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'))
    if (imageFiles.length === 0) {
      alert('请选择图片文件')
      return
    }

    addFiles(imageFiles)
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return

    const imageItems = Array.from(items).filter(item => item.type.startsWith('image/'))
    if (imageItems.length === 0) return

    e.preventDefault()
    const files = imageItems.map(item => item.getAsFile()).filter(Boolean) as File[]
    addFiles(files)
  }

  const addFiles = async (files: File[]) => {
    const newFiles = [...selectedFiles, ...files]
    setSelectedFiles(newFiles)

    const base64Promises = files.map(file => {
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
    })

    try {
      const base64Images = await Promise.all(base64Promises)
      setImagePreviews(prev => [...prev, ...base64Images])
    } catch (error) {
      logger.error('图片读取失败', error)
      alert('图片读取失败，请重试')
    }
  }

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
    setImagePreviews(prev => prev.filter((_, i) => i !== index))
  }

  const selectedCount = chat?.messages.filter(msg => msg.selected).length || 0

  if (!chat) {
    return (
      <div className="chat-interface">
        <div className="empty-state">
          <h2>Welcome to AI Chat</h2>
          <p>Select a chat or create a new one to get started</p>
        </div>
      </div>
    )
  }

  return (
    <div className="chat-interface">
      <div className="chat-toolbar">
        <button 
          className={`toolbar-btn ${selectMode ? 'active' : ''}`}
          onClick={() => setSelectMode(!selectMode)}
        >
          {selectMode ? '取消选择' : '选择消息'}
        </button>
        {selectMode && (
          <>
            <button className="toolbar-btn" onClick={handleSelectAll}>
              {chat.messages.every(msg => msg.selected) ? '取消全选' : '全选'}
            </button>
            {selectedCount > 0 && (
              <>
                <span className="selected-count">{selectedCount} 条已选</span>
                <button className="toolbar-btn" onClick={handleExportMarkdown}>
                  导出 Markdown
                </button>
                <button className="toolbar-btn" onClick={() => setShowPdfQualityDialog(true)}>
                  导出 PDF
                </button>
              </>
            )}
          </>
        )}
      </div>
      <VirtualMessageList
        ref={virtualListRef}
        messages={chat.messages}
        loading={loading}
        loadingText={loadingText}
        isLongWait={isLongWait}
        selectMode={selectMode}
        onToggleSelect={handleToggleSelect}
      />
      <form className="chat-input-form" onSubmit={handleSubmit}>
        {imagePreviews.length > 0 && (
          <div className="image-preview-container">
            {imagePreviews.map((preview, index) => (
              <div key={index} className="image-preview">
                <img src={preview} alt={`preview-${index}`} />
                <button
                  type="button"
                  className="remove-image"
                  onClick={() => removeFile(index)}
                  disabled={loading}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="input-row">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/*"
            multiple
            style={{ display: 'none' }}
          />
          <button
            type="button"
            className="attach-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            title="上传图片"
          >
            📎
          </button>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onPaste={handlePaste}
            placeholder="输入消息或粘贴图片..."
            disabled={loading}
            rows={1}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSubmit(e)
              }
            }}
          />
          <button type="submit" disabled={loading || (!input.trim() && selectedFiles.length === 0)}>
            发送
          </button>
        </div>
      </form>

      {/* PDF质量选择对话框 */}
      {showPdfQualityDialog && (
        <div className="modal-overlay" onClick={() => setShowPdfQualityDialog(false)}>
          <div className="modal-content pdf-quality-dialog" onClick={e => e.stopPropagation()}>
            <h3>选择PDF导出质量</h3>
            <p className="modal-desc">根据您的需求选择合适的质量级别</p>
            
            <div className="quality-options">
              <button 
                className="quality-option high"
                onClick={() => handleExportPDF('high')}
              >
                <div className="quality-title">🎨 高清</div>
                <div className="quality-desc">最佳画质，文件较大</div>
                <div className="quality-size">约 20-50MB</div>
              </button>
              
              <button 
                className="quality-option standard"
                onClick={() => handleExportPDF('standard')}
              >
                <div className="quality-title">⚡ 标准</div>
                <div className="quality-desc">画质与大小平衡</div>
                <div className="quality-size">约 5-15MB</div>
              </button>
              
              <button 
                className="quality-option compressed"
                onClick={() => handleExportPDF('compressed')}
              >
                <div className="quality-title">📦 压缩</div>
                <div className="quality-desc">文件最小，画质略降</div>
                <div className="quality-size">约 2-8MB</div>
              </button>
            </div>
            
            <button 
              className="modal-close"
              onClick={() => setShowPdfQualityDialog(false)}
            >
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
