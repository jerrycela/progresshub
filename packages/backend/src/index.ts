import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'
import { errorHandler } from './middleware/errorHandler'
import { sendSuccess } from './middleware/responseFormatter'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000

// Security Middleware
app.use(helmet())
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}))
app.use(express.json())

// Health check
app.get('/health', (_req, res) => {
  sendSuccess(res, {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  })
})

// API Routes (TODO: 後續 Phase 加入)
// app.use('/api/auth', authRoutes)
// app.use('/api/tasks', taskRoutes)

// 404 Handler
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'RESOURCE_NOT_FOUND',
      message: '找不到請求的資源'
    }
  })
})

// Error Handler (必須放最後)
app.use(errorHandler)

// Start server (只在非測試環境啟動)
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`)
  })
}

export default app
