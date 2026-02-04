from pyspark.sql import DataFrame
from pyspark.sql.functions import col, length
from src.dq_utils import add_dq_result

def check_not_null(df: DataFrame, column: str, rule_id: str) -> DataFrame:
    """
    Checks if a column is not null. Returns DF with row-level result.
    """
    is_valid = col(column).isNotNull()
    return add_dq_result(df, rule_id, is_valid)

def check_regex(df: DataFrame, column: str, pattern: str, rule_id: str) -> DataFrame:
    """
    Checks if column matches regex pattern.
    """
    is_valid = col(column).rlike(pattern)
    return add_dq_result(df, rule_id, is_valid)


def check_min(df: DataFrame, column: str, value: float, rule_id: str) -> DataFrame:
    """Checks if column value >= min value."""
    # Convert to float for comparison just in case, or assume schema is correct.
    is_valid = col(column).cast("float") >= value
    return add_dq_result(df, rule_id, is_valid)

def check_max(df: DataFrame, column: str, value: float, rule_id: str) -> DataFrame:
    """Checks if column value <= max value."""
    is_valid = col(column).cast("float") <= value
    return add_dq_result(df, rule_id, is_valid)

def check_in_set(df: DataFrame, column: str, values: list, rule_id: str) -> DataFrame:
    """Checks if column value is in the provided list of values."""
    is_valid = col(column).isin(values)
    return add_dq_result(df, rule_id, is_valid)

def check_length(df: DataFrame, column: str, min_len: int, max_len: int, rule_id: str) -> DataFrame:
    """Checks if string length is within range."""
    # We can handle optional min/max but for simplicity assume both or handle appropriately
    is_valid = (length(col(column)) >= min_len) & (length(col(column)) <= max_len)
    return add_dq_result(df, rule_id, is_valid)
