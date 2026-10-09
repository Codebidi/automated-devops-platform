from flask import Request

def parse_pagination(req: Request, default_per_page: int = 25, max_per_page: int = 100) -> tuple[int, int]:
    """Extracts and validates page and per_page parameters with safe defaults and clamps."""
    page_raw = req.args.get("page")
    per_page_raw = req.args.get("per_page")

    try:
        page = int(page_raw) if page_raw is not None else 1
        if page < 1:
            page = 1
    except (ValueError, TypeError):
        page = 1

    try:
        per_page = int(per_page_raw) if per_page_raw is not None else default_per_page
        if per_page < 1:
            per_page = default_per_page
        elif per_page > max_per_page:
            per_page = max_per_page
    except (ValueError, TypeError):
        per_page = default_per_page

    return page, per_page

def paginate_list(items: list, page: int, per_page: int) -> tuple[list, int]:
    """Paginates an in-memory list."""
    total = len(items)
    start_idx = (page - 1) * per_page
    end_idx = start_idx + per_page
    return items[start_idx:end_idx], total
