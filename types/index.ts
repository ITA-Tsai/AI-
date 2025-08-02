export interface ReviewItem {
  id: number;
  opinion: string;
  page_number: string;
  regulation: string;
}

export interface ReviewResult {
  summary: string;
  review_items: ReviewItem[];
}
