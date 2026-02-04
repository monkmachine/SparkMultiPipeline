import sys
from pyspark.sql import SparkSession
from src.utils import get_spark_session
from src.engine import Pipeline

def main():
    spark = get_spark_session("DQ_Pipeline_Complex")
    
    # Load data
    print("Loading detailed data...")
    df = spark.read.option("header", "true").csv("data/customers_large.csv")
    
    # Initialize Pipeline
    pipeline = Pipeline("config/pipeline_complex.yaml")
    
    # Run Pipeline
    result_df = pipeline.run(df)
    
    # Write output to file for verification
    with open("results_complex.txt", "w") as f:
        f.write("Input Data:\n")
        f.write(df._jdf.showString(200, 200, False))
        f.write("\nOutput Data with DQ Results:\n")
        f.write(result_df._jdf.showString(200, 200, False))
        f.write("\nFlattened DQ Results:\n")
        if "_dq_results" in result_df.columns:
            f.write(result_df.select("id", "name", "_dq_results")._jdf.showString(200, 200, False))

    print("Complex pipeline executed successfully. Results written to results_complex.txt")

if __name__ == "__main__":
    main()
