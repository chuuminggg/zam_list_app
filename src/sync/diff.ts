interface Identified {
  id: string;
}

/**
 * 스토어 변경 전후 배열을 비교해 서버에 보낼 변경분을 구한다.
 * 스토어는 불변 업데이트를 하므로 참조가 바뀐 항목만 수정된 것으로 본다.
 */
export function diffItems<T extends Identified>(prev: T[], next: T[]): { upserts: T[]; deletes: string[] } {
  const prevById = new Map(prev.map((item) => [item.id, item]));
  const nextIds = new Set(next.map((item) => item.id));
  return {
    upserts: next.filter((item) => prevById.get(item.id) !== item),
    deletes: prev.filter((item) => !nextIds.has(item.id)).map((item) => item.id),
  };
}
