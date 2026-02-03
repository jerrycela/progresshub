// ============================================
// ProgressHub Backend - Entry Point
// ============================================
// TODO: 實作後端 API (Phase 4-6)

import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000

// Middleware
app.use(helmet())
app.use(cors())
app.use(express.json())

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// API routes placeholder
app.get('/api', (_req, res) => {
  res.json({
    message: 'ProgressHub API',
    version: '1.0.0',
    status: 'Backend not yet implemented',
  })
})

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`)
  console.log(`📋 Health check: http://localhost:${PORT}/health`)
})

export default app
