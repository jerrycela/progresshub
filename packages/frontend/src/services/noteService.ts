import type { TaskNote, ActionResult } from 'shared/types'
import { mockTaskNotes } from '@/mocks/unified'
import { apiGetUnwrap, apiPostUnwrap } from './api'

export interface NoteServiceInterface {
  fetchByTaskId(taskId: string): Promise<TaskNote[]>
  addNote(note: Omit<TaskNote, 'id' | 'createdAt'>): Promise<ActionResult<TaskNote>>
}

class MockNoteService implements NoteServiceInterface {
  async fetchByTaskId(taskId: string): Promise<TaskNote[]> {
    await new Promise(r => setTimeout(r, 200))
    return mockTaskNotes
      .filter(n => n.taskId === taskId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }

  async addNote(note: Omit<TaskNote, 'id' | 'createdAt'>): Promise<ActionResult<TaskNote>> {
    await new Promise(r => setTimeout(r, 200))
    const newNote: TaskNote = {
      ...note,
      id: `note-${Date.now()}`,
      createdAt: new Date().toISOString(),
    }
    return { success: true, data: newNote }
  }
}

class ApiNoteService implements NoteServiceInterface {
  async fetchByTaskId(taskId: string): Promise<TaskNote[]> {
    return apiGetUnwrap<TaskNote[]>(`/tasks/${taskId}/notes`)
  }

  async addNote(note: Omit<TaskNote, 'id' | 'createdAt'>): Promise<ActionResult<TaskNote>> {
    const data = await apiPostUnwrap<TaskNote>(`/tasks/${note.taskId}/notes`, note)
    return { success: true, data }
  }
}

export const createNoteService = (): NoteServiceInterface =>
  import.meta.env.VITE_USE_MOCK === 'true' ? new MockNoteService() : new ApiNoteService()
