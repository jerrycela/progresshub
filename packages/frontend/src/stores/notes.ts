import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { TaskNote, ActionResult } from 'shared/types'
import { createNoteService } from '@/services/noteService'

const service = createNoteService()

export const useNoteStore = defineStore('notes', () => {
  const notes = ref<TaskNote[]>([])

  const byTaskId = (taskId: string) =>
    notes.value
      .filter(n => n.taskId === taskId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const fetchByTaskId = async (taskId: string): Promise<ActionResult<TaskNote[]>> => {
    try {
      const data = await service.fetchByTaskId(taskId)
      const existingOtherNotes = notes.value.filter(n => n.taskId !== taskId)
      notes.value = [...existingOtherNotes, ...data]
      return { success: true, data }
    } catch (e) {
      return {
        success: false,
        error: { code: 'UNKNOWN_ERROR', message: e instanceof Error ? e.message : '載入註記失敗' },
      }
    }
  }

  const addNote = async (
    note: Omit<TaskNote, 'id' | 'createdAt'>,
  ): Promise<ActionResult<TaskNote>> => {
    try {
      const result = await service.addNote(note)
      if (result.success && result.data) {
        notes.value = [...notes.value, result.data]
      }
      return result
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
    fetchByTaskId,
    addNote,
  }
})
