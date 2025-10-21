import { parse } from 'smol-toml'
import { Config, Agent, TopicLLM, LogLevel } from '../types'
import { setLogLevel, logger } from './logger'

let cachedConfig: Config | null = null

const resolveEnvVars = (value: string): string => {
  return value.replace(/\$\{([^}]+)\}/g, (_, varName) => {
    const envValue = import.meta.env[`VITE_${varName}`]
    return envValue || ''
  })
}

const processAgent = (agent: any, index: number): Agent => {
  return {
    id: `agent-${index}`,
    name: agent.name || `Agent ${index + 1}`,
    webhook_url: resolveEnvVars(agent.webhook_url || ''),
    auth_user: resolveEnvVars(agent.auth_user || ''),
    auth_password: resolveEnvVars(agent.auth_password || '')
  }
}

const processTopicLLM = (topicLLM: any): TopicLLM => {
  return {
    enabled: topicLLM?.enabled ?? true,
    base_url: resolveEnvVars(topicLLM?.base_url || ''),
    api_key: resolveEnvVars(topicLLM?.api_key || ''),
    model: topicLLM?.model || 'gpt-5-mini'
  }
}

export const loadConfig = async (): Promise<Config> => {
  if (cachedConfig) return cachedConfig

  try {
    const response = await fetch('/agents.toml')
    if (!response.ok) {
      throw new Error(`无法加载配置文件: HTTP ${response.status}`)
    }
    const tomlText = await response.text()
    const parsed = parse(tomlText)

    const agentsArray = Array.isArray(parsed.agents) ? parsed.agents : []
    const agents = agentsArray.map((agent: any, index: number) => 
      processAgent(agent, index)
    )

    const topic_llm = processTopicLLM(parsed.topic_llm)
    const app_title = typeof parsed.app_title === 'string' ? parsed.app_title : 'AI Chat'
    const log_level = (parsed.log_level === 'debug' || parsed.log_level === 'info' || parsed.log_level === 'error') 
      ? parsed.log_level as LogLevel 
      : 'info'

    setLogLevel(log_level)
    logger.info('配置加载成功', { agents: agents.length, log_level })

    cachedConfig = { agents, topic_llm, app_title, log_level }
    return cachedConfig
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error('配置加载失败', error)
    
    // 抛出错误，让调用方处理具体的错误信息
    throw new Error(errorMessage.includes('HTTP') ? errorMessage : `agents.toml 解析失败: ${errorMessage}`)
  }
}

export const getAgentById = async (agentId: string): Promise<Agent | null> => {
  const config = await loadConfig()
  return config.agents.find(a => a.id === agentId) || null
}

export const getTopicLLM = async (): Promise<TopicLLM> => {
  const config = await loadConfig()
  return config.topic_llm
}
