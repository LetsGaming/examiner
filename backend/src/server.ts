import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import { initDatabase } from './db/database.js'
import { examRouter, sessionRouter } from './routes/examRoutes.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT ?? 3001

app.use(cors({ origin: process.env.FRONTEND_URL ?? 'http://localhost:5173' }))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

app.use('/uploads', express.static(path.resolve(process.cwd(), 'data', 'uploads')))

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() })
})

app.use('/api/exams', examRouter)
app.use('/api/sessions', sessionRouter)

initDatabase()

app.listen(PORT, () => {
  console.log(`✅ FIAE AP2 Backend läuft auf http://localhost:${PORT}`)
  console.log(`   OpenAI API Key: ${process.env.OPENAI_API_KEY ? '✓ gesetzt' : '✗ FEHLT — in .env setzen!'}`)
})
