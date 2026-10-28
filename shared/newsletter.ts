/**
 * TechSignal 뉴스레터(zam_newletter) 발행본. /api/newsletter가 원본 API 응답을 이 모양으로 다듬어 내려준다.
 */

export interface NewsletterItem {
  title: string;
  url: string;
  summary?: string;
  /** 제목 위에 작게 표시되는 라벨 (예: "Frontend · JavaScript 기초와 런타임") */
  tag?: string;
  /** 요약 아래 링크 문구 (예: "답변 전체 보기 →") */
  linkLabel?: string;
}

export interface NewsletterSection {
  id: string;
  title: string;
  source?: string;
  items: NewsletterItem[];
}

/** 하루치 발행본. date는 KST 기준 YYYY-MM-DD */
export interface NewsletterIssue {
  date: string;
  sections: NewsletterSection[];
  /** 웹에서 보기 주소 */
  webUrl: string;
}

/** 지난 호 목록용 요약 */
export interface NewsletterSummary {
  date: string;
  questions: string[];
  articleCount: number;
}
