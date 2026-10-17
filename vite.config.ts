import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import visitors from './api/visitors.js'
import mosques from './api/mosques.js'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  for (const key of ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN', 'KV_REST_API_URL', 'KV_REST_API_TOKEN', 'VISITOR_COUNTER_KEY']) {
    if (env[key]) process.env[key] = env[key]
  }
  return {
    plugins: [react(), tailwindcss(), {
      name: 'local-visitor-api',
      configureServer(server) {
        server.middlewares.use('/api/mosques', async (req, res) => {
          try {
            let body = ''
            for await (const chunk of req) body = (body + String(chunk)).slice(0, 201)
            const headers = new Headers()
            for (const [key, value] of Object.entries(req.headers)) if (value) headers.set(key, Array.isArray(value) ? value.join(', ') : value)
            const request = new Request(`http://${req.headers.host || 'localhost'}/api/mosques`, { method: req.method || 'POST', headers, ...(!['GET', 'HEAD'].includes(req.method || 'POST') ? { body } : {}) })
            const response = await mosques.fetch(request)
            res.statusCode = response.status
            response.headers.forEach((value, key) => res.setHeader(key, value))
            res.end(await response.text())
          } catch {
            res.statusCode = 503
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Mosque search is unavailable. Please retry.' }))
          }
        })
        server.middlewares.use('/api/visitors', async (req, res) => {
          try {
            const origin = `http://${req.headers.host || 'localhost'}`
            let body = ''
            for await (const chunk of req) {
              body = (body + String(chunk)).slice(0, 201)
            }
            const headers = new Headers()
            for (const [key, value] of Object.entries(req.headers)) {
              if (value) headers.set(key, Array.isArray(value) ? value.join(', ') : value)
            }
            const method = req.method || 'GET'
            const request = new Request(`${origin}/api/visitors`, {
              method, headers, ...(!['GET', 'HEAD'].includes(method) ? { body } : {}),
            })
            const response = await visitors.fetch(request)
            res.statusCode = response.status
            response.headers.forEach((value, key) => res.setHeader(key, value))
            res.end(await response.text())
          } catch {
            res.statusCode = 503
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Visitor count is unavailable' }))
          }
        })
      },
    }],
  }
})
