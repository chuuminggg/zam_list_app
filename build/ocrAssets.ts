import { createReadStream, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Plugin } from 'vite'

/** 화면에서 글자 인식 파일을 받는 경로. src/utils/ocr.ts의 OCR_PATH와 같아야 한다. */
const BASE = '/ocr/'

/**
 * 글자 인식(tesseract.js) 워커·엔진·언어 데이터. 보안 정책(CSP)상 외부 CDN 스크립트를 쓸 수 없어 같은 도메인에서 내려준다.
 * 엔진은 기기가 지원하는 SIMD에 따라 셋 중 하나만 받는다 (LSTM 전용, 각 약 4MB).
 */
const FILES: Record<string, string> = {
  'worker.min.js': 'tesseract.js/dist/worker.min.js',
  'tesseract-core-lstm.wasm.js': 'tesseract.js-core/tesseract-core-lstm.wasm.js',
  'tesseract-core-simd-lstm.wasm.js': 'tesseract.js-core/tesseract-core-simd-lstm.wasm.js',
  'tesseract-core-relaxedsimd-lstm.wasm.js': 'tesseract.js-core/tesseract-core-relaxedsimd-lstm.wasm.js',
  'kor.traineddata.gz': '@tesseract.js-data/kor/4.0.0_best_int/kor.traineddata.gz',
  'eng.traineddata.gz': '@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz',
}

export default function ocrAssets(): Plugin {
  let root = process.cwd()
  const source = (name: string) => join(root, 'node_modules', FILES[name])

  return {
    name: 'ocr-assets',
    configResolved(config) {
      root = config.root
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const name = req.url?.startsWith(BASE) ? req.url.slice(BASE.length).split('?')[0] : null
        if (!name || !(name in FILES)) return next()
        res.setHeader('Content-Type', name.endsWith('.js') ? 'text/javascript' : 'application/octet-stream')
        createReadStream(source(name)).pipe(res)
      })
    },
    generateBundle() {
      for (const name of Object.keys(FILES)) {
        this.emitFile({ type: 'asset', fileName: `${BASE.slice(1)}${name}`, source: readFileSync(source(name)) })
      }
    },
  }
}
