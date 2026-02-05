import {
  TaskStatus,
  TaskAction,
  canTransition,
  getNextStatus,
  StatusTransitions
} from '../../src/types/task'

describe('Task Status Transitions', () => {
  describe('canTransition', () => {
    it('should allow claim from UNCLAIMED', () => {
      expect(canTransition(TaskStatus.UNCLAIMED, 'claim')).toBe(true)
    })

    it('should not allow claim from CLAIMED', () => {
      expect(canTransition(TaskStatus.CLAIMED, 'claim')).toBe(false)
    })

    it('should allow unclaim from CLAIMED', () => {
      expect(canTransition(TaskStatus.CLAIMED, 'unclaim')).toBe(true)
    })

    it('should allow start from CLAIMED', () => {
      expect(canTransition(TaskStatus.CLAIMED, 'start')).toBe(true)
    })

    it('should allow pause from IN_PROGRESS', () => {
      expect(canTransition(TaskStatus.IN_PROGRESS, 'pause')).toBe(true)
    })

    it('should allow resume from PAUSED', () => {
      expect(canTransition(TaskStatus.PAUSED, 'resume')).toBe(true)
    })

    it('should allow resume from BLOCKED', () => {
      expect(canTransition(TaskStatus.BLOCKED, 'resume')).toBe(true)
    })

    it('should allow block from IN_PROGRESS', () => {
      expect(canTransition(TaskStatus.IN_PROGRESS, 'block')).toBe(true)
    })

    it('should allow unblock from BLOCKED', () => {
      expect(canTransition(TaskStatus.BLOCKED, 'unblock')).toBe(true)
    })

    it('should allow complete from IN_PROGRESS', () => {
      expect(canTransition(TaskStatus.IN_PROGRESS, 'complete')).toBe(true)
    })

    it('should not allow complete from PAUSED', () => {
      expect(canTransition(TaskStatus.PAUSED, 'complete')).toBe(false)
    })

    it('should not allow any transition from DONE', () => {
      const actions: TaskAction[] = ['claim', 'unclaim', 'start', 'pause', 'resume', 'block', 'unblock', 'complete']
      actions.forEach(action => {
        expect(canTransition(TaskStatus.DONE, action)).toBe(false)
      })
    })
  })

  describe('getNextStatus', () => {
    it('should return CLAIMED when claiming UNCLAIMED task', () => {
      expect(getNextStatus(TaskStatus.UNCLAIMED, 'claim')).toBe(TaskStatus.CLAIMED)
    })

    it('should return UNCLAIMED when unclaiming CLAIMED task', () => {
      expect(getNextStatus(TaskStatus.CLAIMED, 'unclaim')).toBe(TaskStatus.UNCLAIMED)
    })

    it('should return IN_PROGRESS when starting CLAIMED task', () => {
      expect(getNextStatus(TaskStatus.CLAIMED, 'start')).toBe(TaskStatus.IN_PROGRESS)
    })

    it('should return PAUSED when pausing IN_PROGRESS task', () => {
      expect(getNextStatus(TaskStatus.IN_PROGRESS, 'pause')).toBe(TaskStatus.PAUSED)
    })

    it('should return IN_PROGRESS when resuming PAUSED task', () => {
      expect(getNextStatus(TaskStatus.PAUSED, 'resume')).toBe(TaskStatus.IN_PROGRESS)
    })

    it('should return BLOCKED when blocking IN_PROGRESS task', () => {
      expect(getNextStatus(TaskStatus.IN_PROGRESS, 'block')).toBe(TaskStatus.BLOCKED)
    })

    it('should return IN_PROGRESS when unblocking BLOCKED task', () => {
      expect(getNextStatus(TaskStatus.BLOCKED, 'unblock')).toBe(TaskStatus.IN_PROGRESS)
    })

    it('should return DONE when completing IN_PROGRESS task', () => {
      expect(getNextStatus(TaskStatus.IN_PROGRESS, 'complete')).toBe(TaskStatus.DONE)
    })

    it('should return null for invalid transition', () => {
      expect(getNextStatus(TaskStatus.DONE, 'claim')).toBeNull()
    })
  })

  describe('StatusTransitions', () => {
    it('should have all required actions defined', () => {
      const requiredActions: TaskAction[] = [
        'claim', 'unclaim', 'start', 'pause', 'resume', 'block', 'unblock', 'complete'
      ]
      requiredActions.forEach(action => {
        expect(StatusTransitions[action]).toBeDefined()
        expect(StatusTransitions[action].from).toBeDefined()
        expect(StatusTransitions[action].to).toBeDefined()
      })
    })
  })
})
