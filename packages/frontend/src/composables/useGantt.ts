import { computed, type Ref } from 'vue'
import { useFormatDate } from '@/composables/useFormatDate'
import { GANTT } from '@/constants/pageSettings'
import type { Task, MilestoneData } from 'shared/types'

type TimeScale = 'day' | 'week' | 'month'

const TIME_SCALE_WINDOWS: Record<TimeScale, { before: number; after: number }> = {
  day: { before: 14, after: 14 },
  week: { before: 35, after: 35 },
  month: { before: 60, after: 60 },
}

export function useGantt(
  filteredTasks: Ref<Task[]>,
  filteredMilestones: Ref<MilestoneData[]>,
  timeScale: Ref<TimeScale>,
) {
  const { formatShort } = useFormatDate()

  const dateRange = computed(() => {
    const tasks = filteredTasks.value
    const msArr = filteredMilestones.value
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const window = TIME_SCALE_WINDOWS[timeScale.value]
    const msPerDay = 24 * 60 * 60 * 1000

    const idealStart = new Date(today.getTime() - window.before * msPerDay)
    const idealEnd = new Date(today.getTime() + window.after * msPerDay)

    if (tasks.length === 0 && msArr.length === 0) {
      return { start: idealStart, end: idealEnd }
    }

    const taskDates = tasks.flatMap((t: Task) => [new Date(t.startDate!), new Date(t.dueDate!)])
    const msDates = msArr.map((ms: MilestoneData) => new Date(ms.date))
    const allDates = [...taskDates, ...msDates]

    const dataMin = new Date(Math.min(...allDates.map((d: Date) => d.getTime())))
    const dataMax = new Date(Math.max(...allDates.map((d: Date) => d.getTime())))

    let start = new Date(Math.min(idealStart.getTime(), dataMin.getTime()))
    let end = new Date(Math.max(idealEnd.getTime(), dataMax.getTime()))

    const range = end.getTime() - start.getTime()
    const buffer = Math.max(3 * msPerDay, range * 0.05)
    start = new Date(start.getTime() - buffer)
    end = new Date(end.getTime() + buffer)

    return { start, end }
  })

  const todayPosition = computed(() => {
    const range = dateRange.value.end.getTime() - dateRange.value.start.getTime()
    if (range === 0) return 50

    const today = new Date().getTime()
    const position = ((today - dateRange.value.start.getTime()) / range) * 100

    return Math.max(0, Math.min(100, position))
  })

  const timeAxisMarks = computed(() => {
    const { start, end } = dateRange.value
    const marks: Array<{ position: number; label: string; isMain: boolean; isWeekend?: boolean }> = []
    const range = end.getTime() - start.getTime()
    if (range === 0) return marks

    const current = new Date(start)
    current.setHours(0, 0, 0, 0)

    const totalDays = Math.ceil(range / (24 * 60 * 60 * 1000))
    const dayStep = totalDays > 21 ? 2 : 1

    if (timeScale.value === 'day') {
      let dayCount = 0
      while (current <= end) {
        const position = ((current.getTime() - start.getTime()) / range) * 100
        if (position >= 0 && position <= 100) {
          const isMonday = current.getDay() === 1
          const shouldShow = dayStep === 1 || (dayCount % dayStep === 0) || isMonday
          if (shouldShow) {
            marks.push({
              position,
              label: `${current.getMonth() + 1}/${current.getDate()}`,
              isMain: isMonday,
              isWeekend: current.getDay() === 0 || current.getDay() === 6,
            })
          }
        }
        current.setDate(current.getDate() + 1)
        dayCount++
      }
    } else if (timeScale.value === 'week') {
      const dayOfWeek = current.getDay()
      const daysToMonday = dayOfWeek === 0 ? 1 : (dayOfWeek === 1 ? 0 : 8 - dayOfWeek)
      current.setDate(current.getDate() + daysToMonday)

      while (current <= end) {
        const position = ((current.getTime() - start.getTime()) / range) * 100
        if (position >= 0 && position <= 100) {
          marks.push({
            position,
            label: `${current.getMonth() + 1}/${current.getDate()}`,
            isMain: current.getDate() <= 7,
          })
        }
        current.setDate(current.getDate() + 7)
      }
    } else {
      current.setDate(1)
      if (current < start) {
        current.setMonth(current.getMonth() + 1)
      }

      while (current <= end) {
        const position = ((current.getTime() - start.getTime()) / range) * 100
        if (position >= 0 && position <= 100) {
          marks.push({
            position,
            label: `${current.getFullYear()}/${current.getMonth() + 1}`,
            isMain: current.getMonth() === 0,
          })
        }
        current.setMonth(current.getMonth() + 1)
      }
    }

    return marks
  })

  const getTaskPosition = (task: { startDate?: string; dueDate?: string }) => {
    if (!task.startDate || !task.dueDate) return { left: 0, width: 0 }

    const range = dateRange.value.end.getTime() - dateRange.value.start.getTime()
    if (range === 0) return { left: 0, width: 100 }

    const taskStart = new Date(task.startDate).getTime()
    const taskEnd = new Date(task.dueDate).getTime()

    const left = ((taskStart - dateRange.value.start.getTime()) / range) * 100
    const width = ((taskEnd - taskStart) / range) * 100

    return { left: Math.max(0, left), width: Math.max(GANTT.MIN_BAR_WIDTH, width) }
  }

  const getMilestonePosition = (milestone: MilestoneData) => {
    const range = dateRange.value.end.getTime() - dateRange.value.start.getTime()
    if (range === 0) return 50

    const msDate = new Date(milestone.date).getTime()
    const position = ((msDate - dateRange.value.start.getTime()) / range) * 100

    return Math.max(0, Math.min(100, position))
  }

  const isTaskOverdue = (task: Task): boolean => {
    if (!task.dueDate || task.status === 'DONE') return false
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const dueDate = new Date(task.dueDate)
    dueDate.setHours(0, 0, 0, 0)
    return dueDate < today
  }

  const getTaskDuration = (task: Task): number => {
    if (!task.startDate || !task.dueDate) return 0
    const start = new Date(task.startDate)
    const end = new Date(task.dueDate)
    const diffTime = end.getTime() - start.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
  }

  const getDaysRemaining = (task: Task): number | null => {
    if (!task.dueDate || task.status === 'DONE') return null
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const dueDate = new Date(task.dueDate)
    dueDate.setHours(0, 0, 0, 0)
    const diffTime = dueDate.getTime() - today.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  const tasksOutsideRange = computed(() => {
    const { start, end } = dateRange.value
    const tasks = filteredTasks.value

    let beforeCount = 0
    let afterCount = 0

    tasks.forEach((task: Task) => {
      if (!task.startDate || !task.dueDate) return
      const taskEnd = new Date(task.dueDate)
      const taskStart = new Date(task.startDate)

      if (taskEnd < start) beforeCount++
      if (taskStart > end) afterCount++
    })

    return { before: beforeCount, after: afterCount, total: beforeCount + afterCount }
  })

  const formatDate = (date: Date) => formatShort(date.toISOString())

  return {
    dateRange,
    todayPosition,
    timeAxisMarks,
    getTaskPosition,
    getMilestonePosition,
    isTaskOverdue,
    getTaskDuration,
    getDaysRemaining,
    tasksOutsideRange,
    formatDate,
  }
}

export type { TimeScale }
