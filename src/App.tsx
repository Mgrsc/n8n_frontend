import { useState, useEffect } from 'react'
import { validateUser, saveAuth, getAuth, clearAuth } from './utils/auth'
import { getChats, createChat, deleteChat } from './utils/storage'
import { loadConfig } from './utils/config'
import { logger } from './utils/logger'
import { Chat, Agent } from './types'
import Login from './components/Login'
import ChatHistory from './components/ChatHistory'
import ChatInterface from './components/ChatInterface'
import AgentSelector from './components/AgentSelector'

export default function App() {
  const [authenticated, setAuthenticated] = useState(false)
  const [username, setUsername] = useState('')
  const [chats, setChats] = useState<Chat[]>([])
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const [agents, setAgents] = useState<Agent[]>([])
  const [currentAgentId, setCurrentAgentId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [appTitle, setAppTitle] = useState('AI Chat')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true)
        setError(null)
        const config = await loadConfig()
        
        if (!config.agents || config.agents.length === 0) {
          setError('未找到可用的 AI 助手配置，agents.toml 中没有定义任何 agent')
          setLoading(false)
          return
        }
        
        setAgents(config.agents)
        setCurrentAgentId(config.agents[0].id)
        setAppTitle(config.app_title || 'AI Chat')

        const auth = getAuth()
        if (auth && await validateUser(auth.username, auth.password)) {
          setUsername(auth.username)
          setAuthenticated(true)
          loadChats()
        }
      } catch (err) {
        logger.error('应用初始化失败', err)
        const errorMessage = err instanceof Error ? err.message : '未知错误'
        setError(`配置加载失败: ${errorMessage}`)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  const loadChats = () => {
    setChats(getChats())
  }

  const handleLogin = async (user: string, pass: string) => {
    if (await validateUser(user, pass)) {
      saveAuth(user, pass)
      setUsername(user)
      setAuthenticated(true)
      loadChats()
    } else {
      alert('Invalid username or password')
    }
  }

  const handleLogout = () => {
    clearAuth()
    setAuthenticated(false)
    setUsername('')
    setChats([])
    setCurrentChatId(null)
  }

  const handleNewChat = () => {
    if (!currentAgentId) {
      alert('请先选择一个 AI 助手')
      return
    }
    const newChat = createChat(currentAgentId)
    loadChats()
    setCurrentChatId(newChat.id)
  }

  const handleSelectAgent = (agentId: string) => {
    setCurrentAgentId(agentId)
    setCurrentChatId(null)
  }

  const handleDeleteChat = (chatId: string) => {
    deleteChat(chatId)
    loadChats()
    if (currentChatId === chatId) {
      setCurrentChatId(null)
    }
  }

  const handleClearAll = () => {
    // 删除所有对话
    chats.forEach(chat => deleteChat(chat.id))
    loadChats()
    setCurrentChatId(null)
  }

  const handleChatUpdate = () => {
    loadChats()
  }

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen)
  }

  const closeMobileMenu = () => {
    setMobileMenuOpen(false)
  }

  const handleSelectChatMobile = (chatId: string) => {
    setCurrentChatId(chatId)
    closeMobileMenu()
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>加载中...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="error-screen">
        <h2>⚠️ 加载失败</h2>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>刷新页面</button>
      </div>
    )
  }

  if (!authenticated) {
    return <Login onLogin={handleLogin} appTitle={appTitle} />
  }

  const currentChat = chats.find(c => c.id === currentChatId) || null
  // 显示所有对话，不按智能体过滤
  const allChats = chats

  return (
    <div className="app">
      {/* 移动端遮罩层 */}
      <div 
        className={`mobile-overlay ${mobileMenuOpen ? 'active' : ''}`}
        onClick={closeMobileMenu}
      />
      
      <div className="app-header">
        {/* 移动端菜单按钮 */}
        <button 
          className="mobile-menu-btn"
          onClick={toggleMobileMenu}
          aria-label="Toggle menu"
        >
          ☰
        </button>
        
        <h1>{appTitle}</h1>
        <AgentSelector 
          agents={agents}
          currentAgentId={currentAgentId}
          onSelectAgent={handleSelectAgent}
        />
        <div className="user-info">
          <span>{username}</span>
          <button onClick={handleLogout}>Logout</button>
        </div>
      </div>
      <div className="app-content">
        <ChatHistory
          chats={allChats}
          currentChatId={currentChatId}
          onSelectChat={handleSelectChatMobile}
          onNewChat={handleNewChat}
          onDeleteChat={handleDeleteChat}
          onClearAll={handleClearAll}
          mobileOpen={mobileMenuOpen}
        />
        <ChatInterface
          chat={currentChat}
          onChatUpdate={handleChatUpdate}
        />
        
        {/* 移动端悬浮新建按钮 */}
        <button 
          className="mobile-fab"
          onClick={handleNewChat}
          aria-label="新建对话"
          title="新建对话"
        >
          ✏️
        </button>
      </div>
    </div>
  )
}
