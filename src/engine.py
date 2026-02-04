import yaml
from pyspark.sql import DataFrame
from src.dq_rules import check_not_null, check_regex, check_min, check_max, check_in_set, check_length
from src.cleanse_rules import clean_lowercase, clean_trim

# Mapping rule names to functions
DQ_RULES_MAP = {
    'check_not_null': check_not_null,
    'check_regex': check_regex,
    'check_min': check_min,
    'check_max': check_max,
    'check_in_set': check_in_set,
    'check_length': check_length
}

CLEANSE_RULES_MAP = {
    'clean_lowercase': clean_lowercase,
    'clean_trim': clean_trim
}

class Pipeline:
    def __init__(self, config_path: str):
        with open(config_path, 'r') as f:
            self.config = yaml.safe_load(f)
            
    def run(self, df: DataFrame) -> DataFrame:
        """
        Executes the pipeline stages in order.
        """
        current_df = df
        
        for stage in self.config['stages']:
            stage_name = stage['name']
            stage_type = stage['type']
            print(f"Executing stage: {stage_name} ({stage_type})")
            
            if stage_type == 'dq':
                current_df = self._run_dq_stage(current_df, stage['rules'])
            elif stage_type == 'cleanse':
                current_df = self._run_cleanse_stage(current_df, stage['rules'])
                
        return current_df

    def _run_dq_stage(self, df: DataFrame, rules: list) -> DataFrame:
        for rule in rules:
            rule_func = DQ_RULES_MAP.get(rule['type'])
            if rule_func:
                print(f"  Running DQ rule: {rule['id']}")
                # Pass all params dynamically except 'type' and 'id'
                params = {k: v for k, v in rule.items() if k not in ['type', 'id']}
                df = rule_func(df, rule_id=rule['id'], **params)
            else:
                print(f"  Warning: DQ rule type '{rule['type']}' not found.")
        return df

    def _run_cleanse_stage(self, df: DataFrame, rules: list) -> DataFrame:
        for rule in rules:
            rule_func = CLEANSE_RULES_MAP.get(rule['type'])
            if rule_func:
                print(f"  Running Cleanse rule: {rule['type']} on {rule['column']}")
                params = {k: v for k, v in rule.items() if k not in ['type']}
                df = rule_func(df, **params)
            else:
                 print(f"  Warning: Cleanse rule type '{rule['type']}' not found.")
        return df
