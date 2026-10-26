/** 글자 인식 전에 줄일 긴 변 길이 (px). 영수증 글자를 읽기에 충분하고 인식 시간이 짧아진다. */
const MAX_SIDE = 2000;

/**
 * 사진을 긴 변 2000px 이하 캔버스로 그린다. 휴대폰 사진(4000px 이상)을 그대로 읽으면 느리다.
 * 세로로 긴 스크롤 캡처는 글자가 너무 작아지지 않게 세로 8000px까지 둔다.
 * EXIF 회전은 브라우저가 반영한다.
 */
export async function prepareReceiptImage(file: File): Promise<HTMLCanvasElement> {
  if (!file.type.startsWith('image/')) throw new Error('이미지 파일만 올릴 수 있어요.');
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error('이 사진을 열 수 없어요. 다른 사진으로 시도해 주세요.');
  }
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height / 4));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('사진을 처리할 수 없어요.');
  // 투명 PNG(스크린샷)는 흰 바탕에 그린다.
  context.fillStyle = '#fff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas;
}

const luminance = (r: number, g: number, b: number) => 0.299 * r + 0.587 * g + 0.114 * b;

/**
 * 글자 인식용 흑백 사본. 어두운 바탕(다크 모드 캡처)은 밝기를 뒤집어 흰 바탕·검은 글씨로 만든다.
 * 밝은 글씨를 그대로 읽으면 금액이 엉뚱한 글자로 나오는 일이 잦다.
 */
export function ocrCanvas(source: HTMLCanvasElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = source.width;
  canvas.height = source.height;
  const context = canvas.getContext('2d');
  const sourceContext = source.getContext('2d');
  if (!context || !sourceContext) return source;
  const image = sourceContext.getImageData(0, 0, source.width, source.height);
  const { data } = image;
  let total = 0;
  for (let i = 0; i < data.length; i += 4) {
    const y = luminance(data[i], data[i + 1], data[i + 2]);
    data[i] = data[i + 1] = data[i + 2] = y;
    total += y;
  }
  if (total / (data.length / 4) < 110) {
    for (let i = 0; i < data.length; i += 4) data[i] = data[i + 1] = data[i + 2] = 255 - data[i];
  }
  context.putImageData(image, 0, 0);
  return canvas;
}

/**
 * 낱말 상자 안 글씨 색. 상자 테두리 평균을 바탕색으로 보고, 바탕과 밝기가 크게 다른 점들의 평균 색을 본다.
 * 파랑(입금)·빨강(출금)이 아니면 null.
 */
export function inkColor(source: HTMLCanvasElement, box: { x0: number; y0: number; x1: number; y1: number }) {
  const context = source.getContext('2d');
  const width = Math.min(box.x1, source.width) - box.x0;
  const height = Math.min(box.y1, source.height) - box.y0;
  if (!context || width < 2 || height < 2) return null;
  const { data } = context.getImageData(box.x0, box.y0, width, height);
  const at = (x: number, y: number) => (y * width + x) * 4;
  let edge = 0;
  let edgeCount = 0;
  for (let x = 0; x < width; x++) {
    for (const y of [0, height - 1]) {
      const i = at(x, y);
      edge += luminance(data[i], data[i + 1], data[i + 2]);
      edgeCount++;
    }
  }
  const background = edge / edgeCount;
  let r = 0;
  let g = 0;
  let b = 0;
  let ink = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (Math.abs(luminance(data[i], data[i + 1], data[i + 2]) - background) < 50) continue;
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
    ink++;
  }
  if (ink < 4) return null;
  r /= ink;
  g /= ink;
  b /= ink;
  if (b > r + 50 && b > g + 15) return 'blue';
  if (r > g + 60 && r > b + 40) return 'red';
  return null;
}
