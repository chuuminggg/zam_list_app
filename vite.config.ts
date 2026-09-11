/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import devApi from './server/devApi'

export default defineConfig(({ mode }) => {
  // 서버 함수가 읽는 환경변수(ZYTE_API_KEY 등)를 개발 서버 process.env에 주입.
  // VITE_ 접두사가 없으므로 클라이언트 번들에는 포함되지 않는다.
  const env = loadEnv(mode, process.cwd(), '')
  for (const [key, value] of Object.entries(env)) {
    process.env[key] ??= value
  }

  return {
    plugins: [react(), tailwindcss(), devApi()],
    test: {
      // 화면 테스트는 파일 상단 `@vitest-environment jsdom` 주석으로 환경을 바꾼다.
      include: ['server/**/*.test.ts', 'src/**/*.test.{ts,tsx}'],
      environment: 'node',
    },
  }
})
