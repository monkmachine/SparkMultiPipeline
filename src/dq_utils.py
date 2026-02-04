from pyspark.sql import DataFrame
from pyspark.sql.functions import col, lit, when, create_map, map_concat, map_from_entries, array, struct

DQ_RESULTS_COL = "_dq_results"

def add_dq_result(df: DataFrame, rule_id: str, is_valid_col: str) -> DataFrame:
    """
    Appends a single DQ result to the _dq_results map column.
    
    Args:
        df: Input DataFrame
        rule_id: Unique identifier for the rule
        is_valid_col: Boolean Column expression indicating pass(True)/fail(False)
        
    Returns:
        DataFrame with updated _dq_results column
    """
    # Define the result status
    status_col = when(is_valid_col, lit("PASS")).otherwise(lit("FAIL"))
    
    # Create the new entry as a map
    new_entry = create_map(lit(rule_id), status_col)
    
    if DQ_RESULTS_COL in df.columns:
        # If column exists, concat the new entry
        return df.withColumn(DQ_RESULTS_COL, map_concat(col(DQ_RESULTS_COL), new_entry))
    else:
        # If column doesn't exist, create it
        return df.withColumn(DQ_RESULTS_COL, new_entry)

def get_dq_summary(df: DataFrame) -> DataFrame:
    """
    Explodes the results and calculates aggregation.
    """
    # This will be implemented later for reporting
    pass
