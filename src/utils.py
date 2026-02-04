from pyspark.sql import SparkSession

def get_spark_session(app_name="DQ_Pipeline_POC"):
    return SparkSession.builder \
        .appName(app_name) \
        .getOrCreate()
