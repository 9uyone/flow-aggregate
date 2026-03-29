export interface PagedResponse<TItem> {
  items: TItem[];
  totalCount: number;
  page: number;
  totalPages: number;
  pageSize: number;
}
