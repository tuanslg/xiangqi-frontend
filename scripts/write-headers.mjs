import { writeFileSync } from 'node:fs'
import { buildHeaders } from './headers.mjs'

writeFileSync(new URL('../dist/_headers', import.meta.url), buildHeaders(process.env.VITE_API_URL))
console.log('wrote dist/_headers')
