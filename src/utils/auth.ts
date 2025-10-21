import { User } from '../types'

export const parseUsers = (): User[] => {
  const usersStr = import.meta.env.VITE_USERS || 'admin:admin'
  return usersStr.split(',').map((pair: string) => {
    const [username, password] = pair.split(':')
    return { username: username.trim(), password: password.trim() }
  })
}

export const validateUser = (username: string, password: string): boolean => {
  const users = parseUsers()
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
