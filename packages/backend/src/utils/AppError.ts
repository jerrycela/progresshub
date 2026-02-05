export class AppError extends Error {
  constructor(
    public code: string,
    public override message: string,
    public statusCode: number = 400
  ) {
    super(message)
    this.name = 'AppError'
    Error.captureStackTrace(this, this.constructor)
  }
}
