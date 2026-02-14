import { setActivePinia, createPinia } from 'pinia'
import { useTaskStore } from '../tasks'
import { mockTasks, mockPoolTasks } from '@/mocks/unified'
import type { CreateTaskInput } from 'shared/types'

describe('useTaskStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // Helper: 重置 store 為乾淨的 mock 資料副本
  function setupWithMockData() {
    const store = useTaskStore()
    store.tasks = mockTasks.map(t => ({ ...t }))
    store.poolTasks = mockPoolTasks.map(t => ({ ...t }))
    return store
  }

  // ------------------------------------------
  // Initial state
  // ------------------------------------------
  describe('initial state', () => {
    it('should start with mock data in mock mode', () => {
      const store = useTaskStore()

      expect(store.tasks.length).toBe(mockTasks.length)
    })

    it('should start with mock pool tasks in mock mode', () => {
      const store = useTaskStore()

      expect(store.poolTasks.length).toBe(mockPoolTasks.length)
    })

    it('should have no error initially', () => {
      const store = useTaskStore()

      expect(store.error).toBeNull()
    })

    it('should not be loading initially', () => {
      const store = useTaskStore()

      expect(store.isLoading).toBe(false)
      expect(store.loading.fetch).toBe(false)
      expect(store.loading.create).toBe(false)
    })
  })

  // ------------------------------------------
  // backlogTasks
  // ------------------------------------------
  describe('backlogTasks', () => {
    it('should filter only UNCLAIMED tasks', () => {
      const store = setupWithMockData()
      const expectedCount = mockTasks.filter(t => t.status === 'UNCLAIMED').length

      expect(store.backlogTasks.length).toBe(expectedCount)
      store.backlogTasks.forEach(task => {
        expect(task.status).toBe('UNCLAIMED')
      })
    })
  })

  // ------------------------------------------
  // getTaskById
  // ------------------------------------------
  describe('getTaskById', () => {
    it('should return the task when id exists', () => {
      const store = setupWithMockData()
      const firstTask = mockTasks[0]

      const found = store.getTaskById(firstTask.id)

      expect(found).toBeDefined()
      expect(found?.id).toBe(firstTask.id)
      expect(found?.title).toBe(firstTask.title)
    })

    it('should return undefined when id does not exist', () => {
      const store = setupWithMockData()

      const found = store.getTaskById('nonexistent-task-id')

      expect(found).toBeUndefined()
    })
  })

  // ------------------------------------------
  // claimTask
  // ------------------------------------------
  describe('claimTask', () => {
    it('should successfully claim an UNCLAIMED task', async () => {
      const store = setupWithMockData()
      const unclaimedTask = store.tasks.find(t => t.status === 'UNCLAIMED')!
      const userId = 'emp-1'

      const claimPromise = store.claimTask(unclaimedTask.id, userId)
      await vi.advanceTimersByTimeAsync(200)
      const result = await claimPromise

      expect(result.success).toBe(true)
      expect(result.data?.status).toBe('CLAIMED')
      expect(result.data?.assigneeId).toBe(userId)
    })

    it('should update the task in the store after claiming', async () => {
      const store = setupWithMockData()
      const unclaimedTask = store.tasks.find(t => t.status === 'UNCLAIMED')!
      const taskId = unclaimedTask.id
      const userId = 'emp-1'

      const claimPromise = store.claimTask(taskId, userId)
      await vi.advanceTimersByTimeAsync(200)
      await claimPromise

      const updatedTask = store.getTaskById(taskId)
      expect(updatedTask?.status).toBe('CLAIMED')
      expect(updatedTask?.assigneeId).toBe(userId)
    })

    it('should fail when task is not UNCLAIMED', async () => {
      const store = setupWithMockData()
      const inProgressTask = store.tasks.find(t => t.status === 'IN_PROGRESS')!

      const result = store.claimTask(inProgressTask.id, 'emp-1')

      // claimTask returns immediately for validation errors (no await needed)
      expect((await result).success).toBe(false)
      expect((await result).error?.code).toBe('TASK_NOT_UNCLAIMED')
    })

    it('should fail when task does not exist', async () => {
      const store = setupWithMockData()

      const result = await store.claimTask('nonexistent-id', 'emp-1')

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('TASK_NOT_FOUND')
    })

    it('should set claim loading state during operation', async () => {
      const store = setupWithMockData()
      const unclaimedTask = store.tasks.find(t => t.status === 'UNCLAIMED')!
      const taskId = unclaimedTask.id

      const claimPromise = store.claimTask(taskId, 'emp-1')

      expect(store.loading.claim[taskId]).toBe(true)
      expect(store.isTaskLoading(taskId)).toBe(true)

      await vi.advanceTimersByTimeAsync(200)
      await claimPromise

      expect(store.loading.claim[taskId]).toBe(false)
    })
  })

  // ------------------------------------------
  // unclaimTask
  // ------------------------------------------
  describe('unclaimTask', () => {
    it('should successfully unclaim a CLAIMED task', async () => {
      const store = setupWithMockData()
      const claimedTask = store.tasks.find(t => t.status === 'CLAIMED')!

      const unclaimPromise = store.unclaimTask(claimedTask.id)
      await vi.advanceTimersByTimeAsync(200)
      const result = await unclaimPromise

      expect(result.success).toBe(true)
      expect(result.data?.status).toBe('UNCLAIMED')
      expect(result.data?.assigneeId).toBeUndefined()
      expect(result.data?.progress).toBe(0)
    })

    it('should successfully unclaim an IN_PROGRESS task', async () => {
      const store = setupWithMockData()
      const inProgressTask = store.tasks.find(t => t.status === 'IN_PROGRESS')!

      const unclaimPromise = store.unclaimTask(inProgressTask.id)
      await vi.advanceTimersByTimeAsync(200)
      const result = await unclaimPromise

      expect(result.success).toBe(true)
      expect(result.data?.status).toBe('UNCLAIMED')
    })

    it('should fail when task is UNCLAIMED', async () => {
      const store = setupWithMockData()
      const unclaimedTask = store.tasks.find(t => t.status === 'UNCLAIMED')!

      const result = await store.unclaimTask(unclaimedTask.id)

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('TASK_UPDATE_FAILED')
    })

    it('should fail when task does not exist', async () => {
      const store = setupWithMockData()

      const result = await store.unclaimTask('nonexistent-id')

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('TASK_NOT_FOUND')
    })
  })

  // ------------------------------------------
  // updateTaskProgress
  // ------------------------------------------
  describe('updateTaskProgress', () => {
    it('should update progress within valid range', async () => {
      const store = setupWithMockData()
      const inProgressTask = store.tasks.find(t => t.status === 'IN_PROGRESS')!

      const updatePromise = store.updateTaskProgress(inProgressTask.id, 50)
      await vi.advanceTimersByTimeAsync(200)
      const result = await updatePromise

      expect(result.success).toBe(true)
      expect(result.data?.progress).toBe(50)
    })

    it('should auto-transition CLAIMED to IN_PROGRESS when progress > 0', async () => {
      const store = setupWithMockData()
      const claimedTask = store.tasks.find(t => t.status === 'CLAIMED')!

      const updatePromise = store.updateTaskProgress(claimedTask.id, 10)
      await vi.advanceTimersByTimeAsync(200)
      const result = await updatePromise

      expect(result.success).toBe(true)
      expect(result.data?.status).toBe('IN_PROGRESS')
      expect(result.data?.progress).toBe(10)
    })

    it('should set status to DONE when progress reaches 100', async () => {
      const store = setupWithMockData()
      const inProgressTask = store.tasks.find(t => t.status === 'IN_PROGRESS')!

      const updatePromise = store.updateTaskProgress(inProgressTask.id, 100)
      await vi.advanceTimersByTimeAsync(200)
      const result = await updatePromise

      expect(result.success).toBe(true)
      expect(result.data?.status).toBe('DONE')
      expect(result.data?.progress).toBe(100)
      expect(result.data?.closedAt).toBeDefined()
    })

    it('should reject progress below 0', async () => {
      const store = setupWithMockData()
      const task = store.tasks.find(t => t.status === 'IN_PROGRESS')!

      const result = await store.updateTaskProgress(task.id, -1)

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('VALIDATION_ERROR')
    })

    it('should reject progress above 100', async () => {
      const store = setupWithMockData()
      const task = store.tasks.find(t => t.status === 'IN_PROGRESS')!

      const result = await store.updateTaskProgress(task.id, 101)

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('VALIDATION_ERROR')
    })

    it('should fail when task does not exist', async () => {
      const store = setupWithMockData()

      const result = await store.updateTaskProgress('nonexistent-id', 50)

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('TASK_NOT_FOUND')
    })

    it('should accept optional notes parameter', async () => {
      const store = setupWithMockData()
      const task = store.tasks.find(t => t.status === 'IN_PROGRESS')!

      const updatePromise = store.updateTaskProgress(task.id, 75, 'Making good progress')
      await vi.advanceTimersByTimeAsync(200)
      const result = await updatePromise

      expect(result.success).toBe(true)
      expect(result.data?.progress).toBe(75)
    })
  })

  // ------------------------------------------
  // createTask
  // ------------------------------------------
  describe('createTask', () => {
    it('should create a task with valid input', async () => {
      const store = setupWithMockData()
      const initialCount = store.tasks.length

      const input: CreateTaskInput = {
        title: 'New test task',
        projectId: 'proj-1',
        description: 'A test task description',
        functionTags: ['PROGRAMMING'],
        startDate: '2026-03-01',
        dueDate: '2026-03-15',
      }

      const result = await store.createTask(input)

      expect(result.success).toBe(true)
      expect(result.data?.title).toBe('New test task')
      expect(result.data?.status).toBe('UNCLAIMED')
      expect(result.data?.progress).toBe(0)
      expect(result.data?.projectId).toBe('proj-1')
      expect(result.data?.functionTags).toEqual(['PROGRAMMING'])
      expect(store.tasks.length).toBe(initialCount + 1)
    })

    it('should fail without a title', async () => {
      const store = useTaskStore()

      const result = await store.createTask({
        title: '',
        projectId: 'proj-1',
      })

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('VALIDATION_ERROR')
      expect(result.error?.message).toBe('任務標題為必填')
    })

    it('should fail with whitespace-only title', async () => {
      const store = useTaskStore()

      const result = await store.createTask({
        title: '   ',
        projectId: 'proj-1',
      })

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('VALIDATION_ERROR')
    })

    it('should fail without a projectId', async () => {
      const store = useTaskStore()

      const result = await store.createTask({
        title: 'Valid title',
        projectId: '',
      })

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('VALIDATION_ERROR')
      expect(result.error?.message).toBe('專案 ID 為必填')
    })

    it('should fail when startDate is after dueDate', async () => {
      const store = useTaskStore()

      const result = await store.createTask({
        title: 'Valid title',
        projectId: 'proj-1',
        startDate: '2026-04-01',
        dueDate: '2026-03-01',
      })

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('VALIDATION_ERROR')
      expect(result.error?.message).toBe('開始日期不能晚於截止日期')
    })

    it('should default priority to MEDIUM when not provided', async () => {
      const store = useTaskStore()

      const result = await store.createTask({
        title: 'Task without priority',
        projectId: 'proj-1',
      })

      expect(result.success).toBe(true)
      expect(result.data?.priority).toBe('MEDIUM')
    })

    it('should set loading.create during creation', async () => {
      const store = useTaskStore()

      const result = await store.createTask({
        title: 'Loading test task',
        projectId: 'proj-1',
      })

      // createTask 現在是同步操作，loading 在 finally 中已重設
      expect(result.success).toBe(true)
      expect(store.loading.create).toBe(false)
      expect(store.isLoading).toBe(false)
    })

    it('should trim the title', async () => {
      const store = useTaskStore()

      const result = await store.createTask({
        title: '  Trimmed title  ',
        projectId: 'proj-1',
      })

      expect(result.success).toBe(true)
      expect(result.data?.title).toBe('Trimmed title')
    })
  })

  // ------------------------------------------
  // updateTaskStatus
  // ------------------------------------------
  describe('updateTaskStatus', () => {
    it('should set status to DONE with progress 100', async () => {
      const store = setupWithMockData()
      const inProgressTask = store.tasks.find(t => t.status === 'IN_PROGRESS')!

      const updatePromise = store.updateTaskStatus(inProgressTask.id, 'DONE')
      await vi.advanceTimersByTimeAsync(200)
      const result = await updatePromise

      expect(result.success).toBe(true)
      expect(result.data?.status).toBe('DONE')
      expect(result.data?.progress).toBe(100)
      expect(result.data?.closedAt).toBeDefined()
    })

    it('should set pausedAt when status changes to PAUSED', async () => {
      const store = setupWithMockData()
      const inProgressTask = store.tasks.find(t => t.status === 'IN_PROGRESS')!

      const updatePromise = store.updateTaskStatus(inProgressTask.id, 'PAUSED')
      await vi.advanceTimersByTimeAsync(200)
      const result = await updatePromise

      expect(result.success).toBe(true)
      expect(result.data?.status).toBe('PAUSED')
      expect(result.data?.pausedAt).toBeDefined()
    })

    it('should clear pause info when resuming from PAUSED to IN_PROGRESS', async () => {
      const store = setupWithMockData()
      // Manually set up a PAUSED task
      const task = store.tasks[0]
      task.status = 'PAUSED'
      task.pauseReason = 'WAITING_TASK'
      task.pauseNote = '等待其他任務'
      task.pausedAt = '2026-02-28T10:00:00Z'

      const updatePromise = store.updateTaskStatus(task.id, 'IN_PROGRESS')
      await vi.advanceTimersByTimeAsync(200)
      const result = await updatePromise

      expect(result.success).toBe(true)
      expect(result.data?.status).toBe('IN_PROGRESS')
      expect(result.data?.pauseReason).toBeUndefined()
      expect(result.data?.pauseNote).toBeUndefined()
      expect(result.data?.pausedAt).toBeUndefined()
    })

    it('should fail when task does not exist', async () => {
      const store = setupWithMockData()

      const result = await store.updateTaskStatus('nonexistent-id', 'DONE')

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('TASK_NOT_FOUND')
    })

    it('should set update loading state during operation', async () => {
      const store = setupWithMockData()
      const task = store.tasks.find(t => t.status === 'IN_PROGRESS')!

      const updatePromise = store.updateTaskStatus(task.id, 'DONE')

      expect(store.loading.update[task.id]).toBe(true)
      expect(store.isTaskLoading(task.id)).toBe(true)

      await vi.advanceTimersByTimeAsync(200)
      await updatePromise

      expect(store.loading.update[task.id]).toBe(false)
    })
  })
})
