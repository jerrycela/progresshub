import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { TaskNote, ActionResult } from 'shared/types'
import { mockTaskNotes } from '@/mocks/unified'

export const useNoteStore = defineStore('notes', () => {
  const notes = ref<TaskNote[]>([...mockTaskNotes])

  const byTaskId = (taskId: string) =>
    notes.value
      .filter((n) => n.taskId === taskId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const addNote = async (note: Omit<TaskNote, 'id' | 'createdAt'>): Promise<ActionResult<TaskNote>> => {
    try {
      await new Promise((r) => setTimeout(r, 200))
      const newNote: TaskNote = {
        ...note,
        id: `note-${Date.now()}`,
        createdAt: new Date().toISOString(),
      }
      notes.value = [...notes.value, newNote]
      return { success: true, data: newNote }
    } catch (e) {
      return {
        success: false,
        error: { code: 'UNKNOWN_ERROR', message: e instanceof Error ? e.message : '新增註記失敗' },
      }
    }
  }

  return {
    notes,
    byTaskId,
    addNote,
  }
})
