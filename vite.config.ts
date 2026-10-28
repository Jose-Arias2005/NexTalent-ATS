import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import { uploadFileToDrive, getDriveStatus, createVacancyGoogleSheet, patchSheetWithXlsxBuffer } from './server/driveService.ts'

import {
  getBiginStatus,
  exchangeBiginAuthorizationCode,
  loadBiginCredentials,
  saveBiginCredentials,
  ensureBiginSubPipeline,
  verifyBiginSubPipeline,
  pushCandidateToBigin,
  getBiginLogs,
  clearBiginLogs,
  getActiveBiginSubPipelines,
  fetchPipelineDealsForVacancy,
  uploadSelfClientFile,
  selectBiginPipeline,
  disconnectBigin,
  BIGIN_DEFAULTS
} from './server/biginService.ts'

async function parseJsonBody(req: any): Promise<any> {
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  }
  const body = Buffer.concat(chunks).toString('utf8')
  return body ? JSON.parse(body) : {}
}

function driveAndBiginApiPlugin(): Plugin {
  return {
    name: 'ats-drive-bigin-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        // --------------------------------------------------------------------
        // GOOGLE DRIVE & SHEETS API
        // --------------------------------------------------------------------
        if (req.url === '/api/drive/status' && req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json')
          try {
            const status = await getDriveStatus()
            res.end(JSON.stringify(status))
          } catch (err: any) {
            res.statusCode = 500
            res.end(JSON.stringify({ connected: false, error: err?.message || String(err) }))
          }
          return
        }

        if (req.url === '/api/drive/upload' && req.method === 'POST') {
          res.setHeader('Content-Type', 'application/json')
          try {
            const json = await parseJsonBody(req)

            const filename = json.filename || 'Curriculum.pdf'
            const mimeType = json.mimeType || 'application/pdf'
            const folderUrl = json.folderUrl || null
            const vacancyTitle = json.vacancyTitle || null

            if (!json.base64) {
              res.statusCode = 400
              res.end(JSON.stringify({ success: false, error: 'No se envió el archivo base64' }))
              return
            }

            const cleanBase64 = json.base64.replace(/^data:[^;]+;base64,/, '')
            const fileBuffer = Buffer.from(cleanBase64, 'base64')

            const result = await uploadFileToDrive({
              buffer: fileBuffer,
              filename,
              mimeType,
              folderUrl,
              vacancyTitle
            })

            res.end(JSON.stringify(result))
          } catch (err: any) {
            console.error('[Drive Upload Error]:', err)
            res.statusCode = 500
            res.end(JSON.stringify({ success: false, error: err?.message || String(err) }))
          }
          return
        }

        if (req.url === '/api/drive/create-sheet' && req.method === 'POST') {
          res.setHeader('Content-Type', 'application/json')
          try {
            const json = await parseJsonBody(req)
            if (!json.vacancyTitle) {
              res.statusCode = 400
              res.end(JSON.stringify({ success: false, error: 'Se requiere vacancyTitle' }))
              return
            }

            const result = await createVacancyGoogleSheet({
              vacancyTitle: json.vacancyTitle,
              jobFolderUrl: json.jobFolderUrl || null,
              headers: json.headers || []
            })

            res.end(JSON.stringify(result))
          } catch (err: any) {
            console.error('[Drive Create Sheet Error]:', err)
            res.statusCode = 500
            res.end(JSON.stringify({ success: false, error: err?.message || String(err) }))
          }
          return
        }

        if (req.url === '/api/drive/sync-sheet' && req.method === 'POST') {
          res.setHeader('Content-Type', 'application/json')
          try {
            const json = await parseJsonBody(req)
            if (!json.fileId || !json.base64) {
              res.statusCode = 400
              res.end(JSON.stringify({ success: false, error: 'Se requiere fileId y base64' }))
              return
            }

            const cleanBase64 = json.base64.replace(/^data:[^;]+;base64,/, '')
            const fileBuffer = Buffer.from(cleanBase64, 'base64')

            const result = await patchSheetWithXlsxBuffer({
              fileId: json.fileId,
              buffer: fileBuffer
            })

            res.end(JSON.stringify(result))
          } catch (err: any) {
            console.error('[Drive Sync Sheet Error]:', err)
            res.statusCode = 500
            res.end(JSON.stringify({ success: false, error: err?.message || String(err) }))
          }
          return
        }

        // --------------------------------------------------------------------
        // ZOHO BIGIN CRM INTEGRATION API & PROXY
        // --------------------------------------------------------------------
        if (req.url === '/api/bigin/status' && req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json')
          try {
            const status = await getBiginStatus()
            res.end(JSON.stringify(status))
          } catch (err: any) {
            res.statusCode = 500
            res.end(JSON.stringify({ connected: false, error: err?.message || String(err) }))
          }
          return
        }

        if (req.url === '/api/bigin/credentials' && req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json')
          try {
            const creds = loadBiginCredentials()
            res.end(
              JSON.stringify({
                clientId: creds.clientId,
                clientSecret: creds.clientSecret ? `${creds.clientSecret.slice(0, 6)}...` : '',
                hasRefreshToken: Boolean(creds.refreshToken),
                orgId: BIGIN_DEFAULTS.orgId,
                jobsLayoutId: BIGIN_DEFAULTS.jobsLayoutId,
                initialStage: BIGIN_DEFAULTS.initialStage
              })
            )
          } catch (err: any) {
            res.statusCode = 500
            res.end(JSON.stringify({ error: err?.message || String(err) }))
          }
          return
        }

        if (req.url === '/api/bigin/save-credentials' && req.method === 'POST') {
          res.setHeader('Content-Type', 'application/json')
          try {
            const json = await parseJsonBody(req)
            saveBiginCredentials(json)
            res.end(JSON.stringify({ success: true }))
          } catch (err: any) {
            res.statusCode = 500
            res.end(JSON.stringify({ success: false, error: err?.message || String(err) }))
          }
          return
        }

        if (req.url === '/api/bigin/upload-self-client' && req.method === 'POST') {
          res.setHeader('Content-Type', 'application/json')
          try {
            const json = await parseJsonBody(req)
            const result = await uploadSelfClientFile(json)
            res.end(JSON.stringify(result))
          } catch (err: any) {
            res.statusCode = 500
            res.end(JSON.stringify({ success: false, error: err?.message || String(err) }))
          }
          return
        }

        if (req.url === '/api/bigin/select-pipeline' && req.method === 'POST') {
          res.setHeader('Content-Type', 'application/json')
          try {
            const json = await parseJsonBody(req)
            const result = selectBiginPipeline(json.pipelineId || '', json.pipelineName || '')
            res.end(JSON.stringify(result))
          } catch (err: any) {
            res.statusCode = 500
            res.end(JSON.stringify({ success: false, error: err?.message || String(err) }))
          }
          return
        }

        if (req.url === '/api/bigin/disconnect' && req.method === 'POST') {
          res.setHeader('Content-Type', 'application/json')
          try {
            const result = disconnectBigin()
            res.end(JSON.stringify(result))
          } catch (err: any) {
            res.statusCode = 500
            res.end(JSON.stringify({ success: false, error: err?.message || String(err) }))
          }
          return
        }

        if (req.url === '/api/bigin/exchange-code' && req.method === 'POST') {
          res.setHeader('Content-Type', 'application/json')
          try {
            const json = await parseJsonBody(req)
            if (!json.code) {
              res.statusCode = 400
              res.end(JSON.stringify({ success: false, error: 'Código de autorización requerido' }))
              return
            }
            const result = await exchangeBiginAuthorizationCode(json.code, json.clientId, json.clientSecret)
            res.end(JSON.stringify(result))
          } catch (err: any) {
            res.statusCode = 500
            res.end(JSON.stringify({ success: false, error: err?.message || String(err) }))
          }
          return
        }

        if (req.url === '/api/bigin/ensure-subpipeline' && req.method === 'POST') {
          res.setHeader('Content-Type', 'application/json')
          try {
            const json = await parseJsonBody(req)
            const result = await ensureBiginSubPipeline(json.vacancyTitle || '')
            res.end(JSON.stringify(result))
          } catch (err: any) {
            res.statusCode = 500
            res.end(JSON.stringify({ success: false, error: err?.message || String(err) }))
          }
          return
        }

        if (req.url === '/api/bigin/verify-subpipeline' && req.method === 'POST') {
          res.setHeader('Content-Type', 'application/json')
          try {
            const json = await parseJsonBody(req)
            const result = await verifyBiginSubPipeline(json.subPipelineName || json.vacancyTitle || '')
            res.end(JSON.stringify(result))
          } catch (err: any) {
            res.statusCode = 500
            res.end(JSON.stringify({ exists: false, error: err?.message || String(err) }))
          }
          return
        }

        if (req.url === '/api/bigin/push-candidate' && req.method === 'POST') {
          res.setHeader('Content-Type', 'application/json')
          try {
            const json = await parseJsonBody(req)
            const result = await pushCandidateToBigin(json)
            res.end(JSON.stringify(result))
          } catch (err: any) {
            res.statusCode = 500
            res.end(JSON.stringify({ success: false, error: err?.message || String(err) }))
          }
          return
        }

        if (req.url === '/api/bigin/logs' && req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json')
          try {
            const logs = getBiginLogs()
            res.end(JSON.stringify({ success: true, logs }))
          } catch (err: any) {
            res.statusCode = 500
            res.end(JSON.stringify({ success: false, error: err?.message || String(err) }))
          }
          return
        }

        if (req.url === '/api/bigin/clear-logs' && req.method === 'POST') {
          res.setHeader('Content-Type', 'application/json')
          try {
            clearBiginLogs()
            res.end(JSON.stringify({ success: true }))
          } catch (err: any) {
            res.statusCode = 500
            res.end(JSON.stringify({ success: false, error: err?.message || String(err) }))
          }
          return
        }

        if (req.url === '/api/bigin/active-subpipelines' && req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json')
          try {
            const list = await getActiveBiginSubPipelines()
            res.end(JSON.stringify({ success: true, subPipelines: list }))
          } catch (err: any) {
            res.statusCode = 500
            res.end(JSON.stringify({ success: false, error: err?.message || String(err) }))
          }
          return
        }

        if (req.url === '/api/bigin/sync-pipeline-stages' && req.method === 'POST') {
          res.setHeader('Content-Type', 'application/json')
          try {
            const json = await parseJsonBody(req)
            const result = await fetchPipelineDealsForVacancy(json.subPipelineName || json.vacancyTitle || '')
            res.end(JSON.stringify(result))
          } catch (err: any) {
            res.statusCode = 500
            res.end(JSON.stringify({ success: false, deals: [], error: err?.message || String(err) }))
          }
          return
        }

        next()
      })
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), driveAndBiginApiPlugin()],
  server: {
    proxy: {
      '/api/bigin-auth': {
        target: 'https://accounts.zoho.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/bigin-auth/, '')
      },
      '/api/bigin-api': {
        target: 'https://www.zohoapis.com/bigin/v2',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/bigin-api/, '')
      }
    }
  }
})

