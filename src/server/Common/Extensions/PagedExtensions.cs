using Common.Contracts;

namespace Common.Extensions;

public static class PagedExtensions {
	public static int GetActualPageSize(int? pageSize) =>
		pageSize == null ? 10 : Math.Clamp(pageSize.Value, 1, 100);

	public static PagedResponse<T> ToPagedResponse<T>(
		this IEnumerable<T> items,
		int totalCount, int? page,
		int? pageSize) where T : class 
	{
		var actualPageSize = GetActualPageSize(pageSize);

		return new PagedResponse<T> {
			Items = items,
			TotalCount = totalCount,
			Page = (page == null ? 1 : Math.Max(1, page.Value)),
			TotalPages = (int)Math.Ceiling((double)totalCount / actualPageSize),
			PageSize = actualPageSize,
		};
	}
}