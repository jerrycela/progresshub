import type { Task } from 'shared/types'

/**
 * Kahn's algorithm (BFS) topological sort.
 * Orders tasks so that prerequisites appear before dependents.
 * Same-level tasks are sorted by startDate ascending.
 * Handles: missing dependencies (filtered out), cycles (appended at end).
 */
export function topologicalSort(tasks: Task[]): Task[] {
  const taskMap = new Map<string, Task>()
  for (const t of tasks) {
    taskMap.set(t.id, t)
  }

  // Build adjacency: inDegree counts how many visible predecessors each task has
  const inDegree = new Map<string, number>()
  const dependents = new Map<string, string[]>() // prerequisite -> list of dependent task ids

  for (const t of tasks) {
    inDegree.set(t.id, 0)
    dependents.set(t.id, [])
  }

  for (const t of tasks) {
    if (!t.dependsOnTaskIds) continue
    for (const depId of t.dependsOnTaskIds) {
      // Only count dependencies that exist in the current filtered set
      if (!taskMap.has(depId)) continue
      inDegree.set(t.id, (inDegree.get(t.id) ?? 0) + 1)
      dependents.get(depId)!.push(t.id)
    }
  }

  // Seed queue with tasks that have zero in-degree, sorted by startDate
  const queue = tasks
    .filter(t => (inDegree.get(t.id) ?? 0) === 0)
    .sort((a, b) => new Date(a.startDate ?? '').getTime() - new Date(b.startDate ?? '').getTime())

  const result: Task[] = []
  const visited = new Set<string>()

  while (queue.length > 0) {
    const current = queue.shift()!
    if (visited.has(current.id)) continue
    visited.add(current.id)
    result.push(current)

    // Collect newly freed dependents
    const freed: Task[] = []
    for (const depId of dependents.get(current.id) ?? []) {
      const newDeg = (inDegree.get(depId) ?? 1) - 1
      inDegree.set(depId, newDeg)
      if (newDeg === 0 && !visited.has(depId)) {
        freed.push(taskMap.get(depId)!)
      }
    }

    // Sort freed dependents by startDate and insert at front of queue
    freed.sort(
      (a, b) => new Date(a.startDate ?? '').getTime() - new Date(b.startDate ?? '').getTime(),
    )
    queue.unshift(...freed)
  }

  // Cycle fallback: append any unvisited tasks at the end
  for (const t of tasks) {
    if (!visited.has(t.id)) {
      result.push(t)
    }
  }

  return result
}
