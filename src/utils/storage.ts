import { Chat } from '../types'

const CHATS_KEY = 'chats'

export const getChats = (): Chat[] => {
  try {
    const data = localStorage.getItem(CHATS_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

export const saveChats = (chats: Chat[]) => {
  localStorage.setItem(CHATS_KEY, JSON.stringify(chats))
}

export const createChat = (agentId: string): Chat => {
  const chat: Chat = {
    id: Date.now().toString(),
    name: 'New Chat',
    agentId,
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
  const chats = getChats()
  chats.unshift(chat)
  saveChats(chats)
  return chat
}

export const updateChat = (chatId: string, updates: Partial<Chat>) => {
  const chats = getChats()
  const index = chats.findIndex(c => c.id === chatId)
  if (index !== -1) {
    chats[index] = { ...chats[index], ...updates, updatedAt: Date.now() }
    saveChats(chats)
  }
}

export const deleteChat = (chatId: string) => {
  const chats = getChats()
  saveChats(chats.filter(c => c.id !== chatId))
}
