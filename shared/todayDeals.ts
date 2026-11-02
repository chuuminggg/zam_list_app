/**
 * 올리브영 오특(오늘의 특가). /api/deals?provider=oliveyoung이 daiso-mcp 호스팅 서버의
 * get_catalog(service=oliveyoung, operation=today_deals) 결과를 이 모양으로 다듬어 내려준다.
 */

export interface TodayDeal {
  rank: number;
  goodsNo: string;
  name: string;
  brand?: string;
  /** 판매가. priceFrom이면 옵션별 최저가 ("원~") */
  price: number;
  priceFrom: boolean;
  originalPrice?: number;
  discountRate?: number;
  /** '세일', '쿠폰', '증정', '오늘드림' 같은 화면 배지 */
  flags: string[];
  soldOut: boolean;
  imageUrl?: string;
  productUrl: string;
}

/** 하루치 오특. date는 KST 기준 YYYY-MM-DD */
export interface TodayDeals {
  date: string;
  /** 오늘의 브랜드 특가 */
  brandDeals: TodayDeal[];
  /** 오늘의 특가 전체 목록 (인기순) */
  todayDeals: TodayDeal[];
}
