"""Parse and normalize multi-value property area fields."""

from decimal import Decimal, InvalidOperation


class AreaParseError(ValueError):
    def __init__(self, field_name: str, message: str):
        self.field_name = field_name
        super().__init__(message)


def _parse_single_decimal(raw, field_name: str) -> Decimal:
    try:
        parsed = Decimal(str(raw).strip().replace(",", ""))
    except (InvalidOperation, TypeError, ValueError) as exc:
        raise AreaParseError(field_name, "Must be zero or greater.") from exc
    if parsed < 0:
        raise AreaParseError(field_name, "Must be zero or greater.")
    return parsed


def parse_decimal_list_input(value, field_name: str = "area") -> list[Decimal]:
    """Parse comma-separated string, JSON array, or scalar into Decimal values."""
    if value is None:
        return []

    if isinstance(value, str):
        if not value.strip():
            return []
        raw_parts = [part.strip() for part in value.split(",")]
    elif isinstance(value, (list, tuple)):
        raw_parts = list(value)
    else:
        raw_parts = [value]

    parsed: list[Decimal] = []
    for part in raw_parts:
        if isinstance(part, str) and not part.strip():
            continue
        parsed.append(_parse_single_decimal(part, field_name))
    return parsed


def decimal_list_to_storage(values: list[Decimal]) -> list[str]:
    """Store decimals as normalized strings in JSON."""
    stored: list[str] = []
    for value in values:
        text = format(value, "f")
        if "." in text:
            text = text.rstrip("0").rstrip(".")
        stored.append(text or "0")
    return stored


def normalize_stored_area_list(value) -> list[Decimal]:
    """Read area JSON/list/scalar from the database into Decimal values."""
    if value is None:
        return []
    if isinstance(value, list):
        return [_parse_single_decimal(item, "area") for item in value if str(item).strip()]
    return [_parse_single_decimal(value, "area")]


def values_min_max(values: list[Decimal]) -> tuple[Decimal, Decimal]:
    return min(values), max(values)


def join_decimal_list_for_display(value) -> str:
    """Comma-join stored area values for admin/forms."""
    values = normalize_stored_area_list(value)
    return ", ".join(decimal_list_to_storage(values))
