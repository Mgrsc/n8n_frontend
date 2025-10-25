import { LogLevel } from '../types'

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
}

let currentLogLevel: LogLevel = 'info'

export const setLogLevel = (level: LogLevel) => {
  currentLogLevel = level
  console.log(`[Logger] 日志级别设置为: ${level}`)
}

export const getLogLevel = (): LogLevel => {
  return currentLogLevel
}

const shouldLog = (level: LogLevel): boolean => {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLogLevel]
}

const formatMessage = (level: LogLevel, message: string, ...args: any[]): [string, ...any[]] => {
  const timestamp = new Date().toISOString().slice(11, 23)
  const levelSymbol = {
    debug: '🔍',
    info: 'ℹ️',
    warn: '⚠️',
    error: '❌'
  }[level]

  return [`[${timestamp}] ${levelSymbol} ${message}`, ...args]
}

export const logger = {
  debug: (message: string, ...args: any[]) => {
    if (shouldLog('debug')) {
      console.log(...formatMessage('debug', message, ...args))
    }
  },

  info: (message: string, ...args: any[]) => {
    if (shouldLog('info')) {
      console.log(...formatMessage('info', message, ...args))
    }
  },

  warn: (message: string, ...args: any[]) => {
    if (shouldLog('warn')) {
      console.warn(...formatMessage('warn', message, ...args))
    }
  },

  error: (message: string, ...args: any[]) => {
    if (shouldLog('error')) {
      console.error(...formatMessage('error', message, ...args))
    }
  }
}
