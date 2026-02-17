import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { TaskNote } from 'shared/types'
import { createNoteService } from '@/services/noteService'
import { storeAction } from '@/utils/storeHelpers'

const service = createNoteService()

export const useNoteStore = defineStore('notes', () => {
  const notes = ref<TaskNote[]>([])

  const byTaskId = (taskId: string) =>
    notes.value
      .filter(n => n.taskId === taskId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const fetchByTaskId = (taskId: string) =>
    storeAction(async () => {
      const data = await service.fetchByTaskId(taskId)
      const existingOtherNotes = notes.value.filter(n => n.taskId !== taskId)
      notes.value = [...existingOtherNotes, ...data]
      return data
    }, '載入註記失敗')

  const addNote = (note: Omit<TaskNote, 'id' | 'createdAt'>) =>
    storeAction(async () => {
      const result = await service.addNote(note)
      if (!result.success || !result.data) {
        throw new Error(result.error?.message || '新增註記失敗')
      }
      notes.value = [...notes.value, result.data]
      return result.data
    }, '新增註記失敗')

  return {
    notes,
    byTaskId,
    fetchByTaskId,
    addNote,
  }
})
