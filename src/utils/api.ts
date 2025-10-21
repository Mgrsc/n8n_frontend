import { Agent } from '../types'
import { getTopicLLM } from './config'
import { logger } from './logger'

interface StreamChunk {
  type: 'begin' | 'item' | 'end'
  content?: string
  metadata?: {
    nodeId?: string
    nodeName?: string
    itemIndex?: number
    runIndex?: number
    timestamp?: number
  }
}

export const sendMessage = async (
  message: string,
  sessionId: string,
  agent: Agent,
  files?: File[],
  onStream?: (chunk: string) => void
): Promise<string> => {
  logger.debug('发送消息', { sessionId, messageLength: message.length, hasFiles: !!files })
  
  const formData = new FormData()
  formData.append('chatInput', message)
  formData.append('sessionId', sessionId)

  if (files && files.length > 0) {
    files.forEach(file => {
      formData.append('files', file)
    })
  }

  const auth = btoa(`${agent.auth_user}:${agent.auth_password}`)
  const startTime = Date.now()
  
  logger.debug('开始请求', { url: agent.webhook_url })
  const response = await fetch(agent.webhook_url, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`
    },
    body: formData
  })

  if (!response.ok) {
    logger.error('API请求失败', { status: response.status, statusText: response.statusText })
    throw new Error(`API request failed: ${response.statusText}`)
  }
  
  logger.debug('收到响应', { status: response.status, elapsed: Date.now() - startTime })

  // 检查是否支持流式输出
  const contentType = response.headers.get('content-type') || ''
  const isStream = contentType.includes('text/event-stream') || 
                   contentType.includes('application/x-ndjson') ||
                   contentType.includes('text/plain')
  
  logger.debug('响应类型检测', { contentType, isStream })

  if (onStream && isStream && response.body) {
    // 流式处理
    return await handleStreamResponse(response, onStream)
  } else {
    // 非流式处理（原有逻辑）
    const text = await response.text()
    
    // 尝试检测是否是流式格式（每行一个 JSON）
    if (text.includes('{"type":"begin"') || text.includes('{"type":"item"')) {
      return await parseStreamText(text, onStream)
    }
    
    try {
      const json = JSON.parse(text)
      if (json.output) {
        return json.output
      }
      return text
    } catch {
      return text
    }
  }
}

async function handleStreamResponse(response: Response, onStream: (chunk: string) => void): Promise<string> {
  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let fullContent = ''
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      
      // 保留最后一行（可能不完整）
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmedLine = line.trim()
        if (!trimmedLine) continue

        try {
          const chunk: StreamChunk = JSON.parse(trimmedLine)
          
          if (chunk.type === 'item' && chunk.content) {
            fullContent += chunk.content
            onStream(chunk.content)
          }
        } catch (e) {
          // 如果不是 JSON 格式，可能是普通文本
          logger.debug('解析非JSON流数据', { line: trimmedLine })
          if (trimmedLine) {
            fullContent += trimmedLine
            onStream(trimmedLine)
          }
        }
      }
    }

    // 处理剩余的 buffer
    if (buffer.trim()) {
      try {
        const chunk: StreamChunk = JSON.parse(buffer)
        if (chunk.type === 'item' && chunk.content) {
          fullContent += chunk.content
          onStream(chunk.content)
        }
      } catch {
        fullContent += buffer
        onStream(buffer)
      }
    }
  } finally {
    reader.releaseLock()
    logger.debug('流式响应处理完成', { contentLength: fullContent.length })
  }

  return fullContent || '响应为空'
}

async function parseStreamText(text: string, onStream?: (chunk: string) => void): Promise<string> {
  const lines = text.split('\n').filter(line => line.trim())
  let fullContent = ''

  for (const line of lines) {
    try {
      const chunk: StreamChunk = JSON.parse(line)
      
      if (chunk.type === 'item' && chunk.content) {
        fullContent += chunk.content
        if (onStream) {
          // 模拟流式输出延迟
          await new Promise(resolve => setTimeout(resolve, 20))
          onStream(chunk.content)
        }
      }
    } catch (e) {
      logger.debug('解析流数据失败', { line, error: e })
    }
  }

  return fullContent || text
}

interface ChatMessage {
  role: string
  content: string
}

export const generateChatName = async (messages: ChatMessage[]): Promise<string> => {
  const llmConfig = await getTopicLLM()

  if (!llmConfig.enabled || !llmConfig.base_url || !llmConfig.api_key) {
    const firstMsg = messages[0]?.content || 'New Chat'
    return firstMsg.slice(0, 30) + (firstMsg.length > 30 ? '...' : '')
  }

  try {
    let conversationSummary = ''
    messages.slice(0, 6).forEach((msg) => {
      const role = msg.role === 'user' ? '用户' : '助手'
      conversationSummary += `${role}: ${msg.content}\n`
    })

    const response = await fetch(`${llmConfig.base_url}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${llmConfig.api_key}`
      },
      body: JSON.stringify({
        model: llmConfig.model,
        messages: [
          {
            role: 'system',
            content: '你是一个专业的对话主题提取助手。请根据用户提供的对话内容，生成一个简洁准确的对话标题。标题需要几个词概括，比如: 头疼,发热问诊。标题不需要完整句子，不要包含引号或其他标点符号。'
          },
          {
            role: 'user',
            content: `请为以下对话生成一个简洁的标题：\n\n${conversationSummary}`
          }
        ],
        max_tokens: 50,
        temperature: 0.7
      })
    })

    if (response.ok) {
      const data = await response.json()
      const name = data.choices?.[0]?.message?.content?.trim() || ''
      const cleanedName = name.replace(/^["'「『]|["'」』]$/g, '')
      return cleanedName.slice(0, 30) || messages[0]?.content.slice(0, 30) || 'New Chat'
    }
  } catch (error) {
    logger.error('生成对话标题失败', error)
  }

  const firstMsg = messages[0]?.content || 'New Chat'
  return firstMsg.slice(0, 30) + (firstMsg.length > 30 ? '...' : '')
}
