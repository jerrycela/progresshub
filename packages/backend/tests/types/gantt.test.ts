import {
  isTaskOverdue,
  getProgressBucket,
  GanttStats
} from '../../src/types/gantt'
import { TaskStatus } from '../../src/types/task'

describe('Gantt Type Helpers', () => {
  describe('isTaskOverdue', () => {
    it('should return false when dueDate is null', () => {
      expect(isTaskOverdue(null, TaskStatus.IN_PROGRESS)).toBe(false)
    })

    it('should return false when task is DONE', () => {
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 10)
      expect(isTaskOverdue(pastDate, TaskStatus.DONE)).toBe(false)
    })

    it('should return true when dueDate is in the past', () => {
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 1)
      expect(isTaskOverdue(pastDate, TaskStatus.IN_PROGRESS)).toBe(true)
    })

    it('should return false when dueDate is today', () => {
      const today = new Date()
      expect(isTaskOverdue(today, TaskStatus.IN_PROGRESS)).toBe(false)
    })

    it('should return false when dueDate is in the future', () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 10)
      expect(isTaskOverdue(futureDate, TaskStatus.IN_PROGRESS)).toBe(false)
    })

    it('should work with ISO date string', () => {
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 5)
      expect(isTaskOverdue(pastDate.toISOString(), TaskStatus.CLAIMED)).toBe(true)
    })
  })

  describe('getProgressBucket', () => {
    it('should return notStarted for 0%', () => {
      expect(getProgressBucket(0)).toBe('notStarted')
    })

    it('should return early for 1-25%', () => {
      expect(getProgressBucket(1)).toBe('early')
      expect(getProgressBucket(15)).toBe('early')
      expect(getProgressBucket(25)).toBe('early')
    })

    it('should return midway for 26-50%', () => {
      expect(getProgressBucket(26)).toBe('midway')
      expect(getProgressBucket(40)).toBe('midway')
      expect(getProgressBucket(50)).toBe('midway')
    })

    it('should return advanced for 51-75%', () => {
      expect(getProgressBucket(51)).toBe('advanced')
      expect(getProgressBucket(60)).toBe('advanced')
      expect(getProgressBucket(75)).toBe('advanced')
    })

    it('should return nearComplete for 76-99%', () => {
      expect(getProgressBucket(76)).toBe('nearComplete')
      expect(getProgressBucket(90)).toBe('nearComplete')
      expect(getProgressBucket(99)).toBe('nearComplete')
    })

    it('should return complete for 100%', () => {
      expect(getProgressBucket(100)).toBe('complete')
    })
  })
})
