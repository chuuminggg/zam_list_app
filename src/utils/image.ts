/** 글자 인식 전에 줄일 긴 변 길이 (px). 영수증 글자를 읽기에 충분하고 인식 시간이 짧아진다. */
const MAX_SIDE = 2000;

/**
 * 사진을 긴 변 2000px 이하 캔버스로 그린다. 휴대폰 사진(4000px 이상)을 그대로 읽으면 느리다.
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
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
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
