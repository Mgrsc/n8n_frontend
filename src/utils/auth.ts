import { User } from '../types'
import { loadConfig } from './config'

let cachedUsers: User[] | null = null

export const parseUsers = async (): Promise<User[]> => {
  if (cachedUsers) return cachedUsers
  
  try {
    const config = await loadConfig()
    cachedUsers = config.users || []
    return cachedUsers
  } catch (error) {
    // Fallback to default user if config fails to load
    return [{ username: 'admin', password: 'admin' }]
  }
}

export const validateUser = async (username: string, password: string): Promise<boolean> => {
  const users = await parseUsers()
  return users.some(u => u.username === username && u.password === password)
}

export const saveAuth = (username: string, password: string) => {
  localStorage.setItem('auth', btoa(`${username}:${password}`))
}

export const getAuth = (): { username: string; password: string } | null => {
  const auth = localStorage.getItem('auth')
  if (!auth) return null
  try {
    const decoded = atob(auth)
    const colonIndex = decoded.indexOf(':')
    if (colonIndex === -1) return null
    const username = decoded.slice(0, colonIndex)
    const password = decoded.slice(colonIndex + 1)
    return { username, password }
  } catch {
    return null
  }
}

export const clearAuth = () => {
  localStorage.removeItem('auth')
}
