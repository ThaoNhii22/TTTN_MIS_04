from datetime import datetime, timezone
from typing import Optional, Tuple


def get_now() -> datetime:
    """Trả về naive datetime theo giờ hệ thống (local time) của máy chủ."""
    return datetime.now()


def is_within_window(
    start: Optional[datetime],
    end: Optional[datetime],
) -> Tuple[bool, bool, bool]:
    """
    Kiểm tra xem thời điểm hiện tại có nằm trong khoảng [start, end] hay không.
    Hỗ trợ đồng thời cả mốc thời gian lưu theo Local Time (người dùng tạo trên UI qua input datetime-local)
    lẫn UTC (dữ liệu tạo trong test script tự động).

    Returns:
        (is_within, is_before, is_after)
    """
    now_local = datetime.now()
    now_utc = datetime.now(timezone.utc).replace(tzinfo=None)

    def check(now_dt: datetime) -> Tuple[bool, bool, bool]:
        before = start is not None and now_dt < start
        after = end is not None and now_dt > end
        within = not before and not after
        return within, before, after

    within_loc, before_loc, after_loc = check(now_local)
    within_utc, before_utc, after_utc = check(now_utc)

    # Nếu bất kỳ múi giờ nào thỏa mãn nằm trong khoảng -> coi như hợp lệ
    if within_loc or within_utc:
        return True, False, False

    # Nếu cả hai đều chưa tới mốc bắt đầu
    if before_loc and before_utc:
        return False, True, False

    # Trường hợp còn lại: đã quá hạn
    return False, False, True

