import sys
from pyspark.sql import SparkSession
from src.utils import get_spark_session
from src.engine import Pipeline

def main():
    spark = get_spark_session()
    
    # Load data
    print("Loading data...")
    # For POC, we'll create a DataFrame directly or load from CSV if preferred.
    # Let's load from a CSV for realism as per user request.
    df = spark.read.option("header", "true").csv("data/customers.csv")
    
    # Initialize Pipeline
    pipeline = Pipeline("config/pipeline_def.yaml")
    
    # Run Pipeline
    result_df = pipeline.run(df)
    
    # Write output to file for verification
    with open("results.txt", "w") as f:
        f.write("Input Data:\n")
        # Use python side string generation if _jdf is not available or tricky
        f.write(df._jdf.showString(20, 20, False))
        f.write("\nOutput Data with DQ Results:\n")
        f.write(result_df._jdf.showString(20, 20, False))
        f.write("\nFlattened DQ Results:\n")
        if "_dq_results" in result_df.columns:
            f.write(result_df.select("id", "name", "_dq_results")._jdf.showString(20, 20, False))

    print("Pipeline executed successfully. Results written to results.txt")



if __name__ == "__main__":
    main()
