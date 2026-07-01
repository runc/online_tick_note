import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { AgentSession } from '@/agent/types'
import type { CustomSkill } from '@/agent/skills/types'
import type { Notebook, Snippet } from '@/types'

interface TickNoteDB extends DBSchema {
  notebooks: {
    key: string
    value: Notebook
    indexes: { 'by-updated': number }
  }
  agent_sessions: {
    key: string
    value: AgentSession
    indexes: { 'by-updated': number }
  }
  custom_skills: {
    key: string
    value: CustomSkill
    indexes: { 'by-updated': number }
  }
  datasets_cache: {
    key: string
    value: { key: string; data: unknown; cachedAt: number }
  }
  snippets: {
    key: string
    value: Snippet
  }
}

let dbPromise: Promise<IDBPDatabase<TickNoteDB>> | null = null

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<TickNoteDB>('tick-note', 3, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          const notebooks = db.createObjectStore('notebooks', { keyPath: 'id' })
          notebooks.createIndex('by-updated', 'updatedAt')
          db.createObjectStore('datasets_cache', { keyPath: 'key' })
          db.createObjectStore('snippets', { keyPath: 'id' })
        }
        if (oldVersion < 2) {
          const sessions = db.createObjectStore('agent_sessions', { keyPath: 'id' })
          sessions.createIndex('by-updated', 'updatedAt')
        }
        if (oldVersion < 3) {
          const skills = db.createObjectStore('custom_skills', { keyPath: 'id' })
          skills.createIndex('by-updated', 'updatedAt')
        }
      },
    })
  }
  return dbPromise
}

export async function saveNotebook(notebook: Notebook): Promise<void> {
  const db = await getDB()
  await db.put('notebooks', notebook)
}

export async function loadNotebook(id: string): Promise<Notebook | undefined> {
  const db = await getDB()
  return db.get('notebooks', id)
}

export async function loadAllNotebooks(): Promise<Notebook[]> {
  const db = await getDB()
  const all = await db.getAllFromIndex('notebooks', 'by-updated')
  return all.reverse()
}

export async function deleteNotebook(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('notebooks', id)
}

export async function saveAgentSession(session: AgentSession): Promise<void> {
  const db = await getDB()
  await db.put('agent_sessions', session)
}

export async function loadAgentSession(id: string): Promise<AgentSession | undefined> {
  const db = await getDB()
  return db.get('agent_sessions', id)
}

export async function loadAllAgentSessions(): Promise<AgentSession[]> {
  const db = await getDB()
  const all = await db.getAllFromIndex('agent_sessions', 'by-updated')
  return all.reverse()
}

export async function deleteAgentSession(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('agent_sessions', id)
}

export async function saveCustomSkill(skill: CustomSkill): Promise<void> {
  const db = await getDB()
  await db.put('custom_skills', skill)
}

export async function loadAllCustomSkills(): Promise<CustomSkill[]> {
  const db = await getDB()
  const all = await db.getAllFromIndex('custom_skills', 'by-updated')
  return all.reverse()
}

export async function deleteCustomSkill(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('custom_skills', id)
}

export async function saveSnippet(snippet: Snippet): Promise<void> {
  const db = await getDB()
  await db.put('snippets', snippet)
}

export async function loadSnippets(): Promise<Snippet[]> {
  const db = await getDB()
  return db.getAll('snippets')
}

export async function deleteSnippet(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('snippets', id)
}

export async function cacheDataset(key: string, data: unknown): Promise<void> {
  const db = await getDB()
  await db.put('datasets_cache', { key, data, cachedAt: Date.now() })
}

export async function getCachedDataset(key: string): Promise<unknown | undefined> {
  const db = await getDB()
  const entry = await db.get('datasets_cache', key)
  return entry?.data
}
