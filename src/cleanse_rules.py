from pyspark.sql import DataFrame
from pyspark.sql.functions import col, lower, trim

def clean_lowercase(df: DataFrame, column: str) -> DataFrame:
    return df.withColumn(column, lower(col(column)))

def clean_trim(df: DataFrame, column: str) -> DataFrame:
    return df.withColumn(column, trim(col(column)))
