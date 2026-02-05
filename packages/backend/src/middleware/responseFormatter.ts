import { Response } from 'express'

interface ApiError {
  code: string
  message: string
}

interface PaginationMeta {
  total: number
  page: number
  limit: number
  hasMore: boolean
}

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: ApiError
  meta?: PaginationMeta
}

export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode: number = 200
): Response {
  const response: ApiResponse<T> = {
    success: true,
    data
  }
  return res.status(statusCode).json(response)
}

export function sendError(
  res: Response,
  code: string,
  message: string,
  statusCode: number = 400
): Response {
  const response: ApiResponse<never> = {
    success: false,
    error: { code, message }
  }
  return res.status(statusCode).json(response)
}

export function sendPaginated<T>(
  res: Response,
  data: T[],
  pagination: { total: number; page: number; limit: number },
  statusCode: number = 200
): Response {
  const meta: PaginationMeta = {
    ...pagination,
    hasMore: pagination.page * pagination.limit < pagination.total
  }
  const response: ApiResponse<T[]> = {
    success: true,
    data,
    meta
  }
  return res.status(statusCode).json(response)
}
