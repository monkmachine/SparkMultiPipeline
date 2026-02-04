# Spark Multi-Stage Data Quality & Cleansing Pipeline

A Proof of Concept (POC) for a configuration-driven Spark application that executes Data Quality (DQ) and Cleansing rules in a multi-stage pipeline, capturing detailed row-level results without data loss.

## Features
-   **Config-Driven**: Define pipelines using YAML files (no code changes needed for rule updates).
-   **Row-Level Tracking**: Appends a `_dq_results` column to tracking pass/fail status for every rule on every row.
-   **Multi-Stage**: Chain together DQ checks, Cleansing sets, and re-verification steps.
-   **Extensible**: Easily add new rules in Python.
-   **GUI Prototype**: A React Flow-based visual editor to design pipelines.

## Project Structure
```
├── config/             # Pipeline definitions (YAML)
├── data/               # Sample input data (CSV)
├── gui/                # React-based Visual Editor
├── src/
│   ├── engine.py       # Pipeline Orchestrator
│   ├── dq_rules.py     # Data Quality Logic (NotNull, Regex, Min/Max, etc.)
│   ├── cleanse_rules.py# Cleansing Logic (Trim, Lowercase)
│   └── dq_utils.py     # Result capture utilities
└── main.py             # Entry point
```

## Setup
1.  **Prerequisites**: Python 3.8+, pip, Java 8/11/17 (for Spark).
2.  **Installation**:
    ```bash
    pip install pyspark pyyaml
    ```

## Usage

### Running the Simple Pipeline
Uses `config/pipeline_def.yaml` on `data/customers.csv`.
```bash
python main.py
```
Output is saved to `results.txt`.

### Running the Complex Pipeline
Uses `config/pipeline_complex.yaml` on `data/customers_large.csv`. Includes numeric checks, set validation, and more.
```bash
python main_complex.py
```
Output is saved to `results_complex.txt`.

## Configuration Schema
The pipeline is defined in YAML:
```yaml
stages:
  - name: "Stage Name"
    type: "dq" # or "cleanse"
    rules:
      - id: "unique_rule_id"
        type: "check_not_null" # Must match function in dq_rules.py
        column: "column_name"
        # ... other params specific to the rule
```

### Available Rules
**Data Quality (`src/dq_rules.py`)**:
-   `check_not_null`: Fail if null.
-   `check_regex`: Fail if doesn't match pattern.
-   `check_min` / `check_max`: Numeric bounds.
-   `check_in_set`: Value must be in list.
-   `check_length`: String length bounds.

**Cleansing (`src/cleanse_rules.py`)**:
-   `clean_trim`: Remove whitespace.
-   `clean_lowercase`: Convert to lowercase.

## GUI Visual Editor
A drag-and-drop interface is available in the `gui/` directory.

1.  Navigate to `gui/`:
    ```bash
    cd gui
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Start server:
    ```bash
    npm run dev
    ```
4.  Open `http://localhost:5173` in your browser.
5.  Design your pipeline and click **Download YAML**.

## Contributing
To add a new rule:
1.  Define the function in `src/dq_rules.py` or `src/cleanse_rules.py`.
2.  Register it in the map in `src/engine.py`.
3.  Use it in your YAML config.
