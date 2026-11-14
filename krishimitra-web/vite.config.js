import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// start.bat sets KM_API_PORT so KrishiMitra can run beside other projects; plain `npm run dev` keeps 8000.
const apiPort = process.env.KM_API_PORT || 8000
export default defineConfig({
  plugins: [react()],
  server: { proxy: { '/api': `http://127.0.0.1:${apiPort}` } },
})
