import type { Worker } from 'tesseract.js';
import { inkColor, ocrCanvas } from './image';
import { linesToText } from './ocrText';

/** 워커·엔진·언어 데이터를 받는 경로. build/ocrAssets.ts가 같은 도메인에서 내려준다. */
const OCR_PATH = '/ocr';

let worker: Promise<Worker> | null = null;

/**
 * 글자 인식 워커. 처음 쓸 때만 라이브러리와 데이터(약 8MB)를 받고, 이후에는 같은 워커를 다시 쓴다.
 * 언어 데이터는 브라우저(IndexedDB)에 저장돼 다음 방문부터는 받지 않는다.
 */
function getWorker(): Promise<Worker> {
  worker ??= import('tesseract.js')
    .then(async ({ createWorker, OEM }) => {
      const w = await createWorker(['kor', 'eng'], OEM.LSTM_ONLY, {
        workerPath: `${OCR_PATH}/worker.min.js`,
        corePath: OCR_PATH,
        langPath: OCR_PATH,
        // 보안 정책(CSP)상 blob: 워커를 쓸 수 없어 파일 주소로 만든다.
        workerBlobURL: false,
      });
      // 한국어는 낱말 사이 공백을 지워 버리기 쉬워 그대로 둔다.
      await w.setParameters({ preserve_interword_spaces: '1' });
      return w;
    })
    .catch((error: unknown) => {
      worker = null;
      throw new Error('글자 인식 도구를 불러오지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요.', { cause: error });
    });
  return worker;
}

/**
 * 이미지에서 글자를 읽는다. 사진은 기기 밖으로 나가지 않는다.
 * 흑백(다크 모드는 반전) 사본으로 읽고, 금액 글씨 색은 원본에서 봐 파랑은 +, 빨강은 -를 붙인다.
 */
export async function readImageText(image: HTMLCanvasElement): Promise<string> {
  const w = await getWorker();
  try {
    const { data } = await w.recognize(ocrCanvas(image), {}, { text: true, blocks: true });
    const lines = (data.blocks ?? []).flatMap((block) => block.paragraphs.flatMap((paragraph) => paragraph.lines));
    if (lines.length === 0) return data.text;
    return linesToText(lines, (box) => inkColor(image, box));
  } catch (error) {
    throw new Error('사진에서 글자를 읽지 못했어요. 다른 사진으로 시도해 주세요.', { cause: error });
  }
}
