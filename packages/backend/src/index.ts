import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'
import { errorHandler } from './middleware/errorHandler'
import authRoutes from './routes/auth'
import taskRoutes from './routes/tasks'
import ganttRoutes from './routes/gantt'
import progressRoutes from './routes/progress'
import healthRoutes from './routes/health'

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

// Health check routes
app.use('/health', healthRoutes)

// API Routes
app.use('/api/auth', authRoutes)
app.use('/api/tasks', taskRoutes)
app.use('/api/gantt', ganttRoutes)
app.use('/api/progress', progressRoutes)

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
