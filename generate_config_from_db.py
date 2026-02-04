import yaml

class IndentDumper(yaml.Dumper):
    def increase_indent(self, flow=False, indentless=False):
        return super(IndentDumper, self).increase_indent(flow, False)


# 1. Simulate fetching rich metadata from a Database
# We expanded this to include constraints like min/max usually found in 'check constraints' or application metadata sidecars.
mock_db_metadata = [
    {"column": "id", "type": "INTEGER", "nullable": False, "constraints": {}},
    {"column": "name", "type": "VARCHAR", "length": 50, "nullable": True, "constraints": {}},
    {"column": "email", "type": "VARCHAR", "length": 100, "nullable": True, "constraints": {"regex": "^[a-z0-9_.+-]+@[a-z0-9-]+\\.[a-z0-9-.]+$"}},
    {"column": "age", "type": "INTEGER", "nullable": True, "constraints": {"min": 18, "max": 120}},
    {"column": "country", "type": "CHAR", "length": 2, "nullable": True, "constraints": {"enum": ["usa", "uk", "ca", "au", "de"]}},
    {"column": "signup_date", "type": "DATE", "nullable": True, "constraints": {"regex": "^\\d{4}-\\d{2}-\\d{2}$"}}
]

def generate_yaml_from_schema(table_name, metadata):
    ingestion_rules = []
    cleanse_rules = []
    business_rules = []
    
    for col in metadata:
        col_name = col["column"]
        constraints = col.get("constraints", {})
        
        # --- Stage 1: Ingestion Quality ---
        # Rule: Not Null
        if not col["nullable"]:
            ingestion_rules.append({
                "id": f"dq_{col_name}_not_null",
                "type": "check_not_null",
                "column": col_name
            })
            
        # Rule: Basic Patterns (e.g. Date format)
        if "regex" in constraints:
             ingestion_rules.append({
                "id": f"dq_{col_name}_regex",
                "type": "check_regex",
                "column": col_name,
                "pattern": constraints["regex"]
            })

        # --- Stage 2: Standardization ---
        # Rule: Auto-trim and Lowercase all Strings
        if col["type"] in ["VARCHAR", "CHAR", "STRING"]:
            cleanse_rules.append({
                "type": "clean_trim",
                "column": col_name
            })
            # Heuristic: Lowercase emails and country codes
            if "email" in col_name or "country" in col_name:
                cleanse_rules.append({
                    "type": "clean_lowercase",
                    "column": col_name
                })
        
        # --- Stage 3: Business Logic Verification ---
        # Rule: Min/Max
        if "min" in constraints:
            business_rules.append({
                "id": f"dq_{col_name}_min",
                "type": "check_min",
                "column": col_name,
                "value": constraints["min"]
            })
        if "max" in constraints:
             business_rules.append({
                "id": f"dq_{col_name}_max",
                "type": "check_max",
                "column": col_name,
                "value": constraints["max"]
            })
            
        # Rule: Enum/Set
        if "enum" in constraints:
             business_rules.append({
                "id": f"dq_{col_name}_valid_set",
                "type": "check_in_set",
                "column": col_name,
                "values": constraints["enum"]
            })
            
        # Rule: Length
        if "length" in col and col["type"] in ["VARCHAR", "CHAR"]:
             business_rules.append({
                "id": f"dq_{col_name}_len",
                "type": "check_length",
                "column": col_name,
                "min_len": 0,
                "max_len": col["length"]
            })

    # Assemble the Pipeline
    stages = []
    
    if ingestion_rules:
        stages.append({
            "name": "Ingestion Quality",
            "type": "dq",
            "rules": ingestion_rules
        })
        
    if cleanse_rules:
        stages.append({
            "name": "Standardization",
            "type": "cleanse",
            "rules": cleanse_rules
        })
        
    if business_rules:
        stages.append({
            "name": "Business Logic Verification",
            "type": "dq",
            "rules": business_rules
        })

    return {"stages": stages}

if __name__ == "__main__":
    table = "customers"
    print(f"Generating complex pipeline config for table: {table}")
    
    config = generate_yaml_from_schema(table, mock_db_metadata)
    
    yaml_str = yaml.dump(config, sort_keys=False, Dumper=IndentDumper)
    print("\nGenerated YAML:\n")
    print(yaml_str)
    
    with open("config/generated_complex.yaml", "w") as f:
        f.write(yaml_str)

