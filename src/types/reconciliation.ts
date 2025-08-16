// Types for the enhanced reconciliation system

export interface ColumnMapping {
  id: string;
  sourceColumn: string | string[]; // Support multiple source columns
  targetColumn: string;
  matchType: 'exact' | 'fuzzy' | 'formula';
  tolerance?: number;
  formula?: FormulaMapping;
}

export interface FormulaMapping {
  type: 'debit_credit_to_amount' | 'amount_to_debit_credit' | 'custom';
  sourceColumns?: {
    debit?: string;
    credit?: string;
    amount?: string;
  };
  targetColumns?: {
    debit?: string;
    credit?: string;
    amount?: string;
  };
  customFormula?: string;
}

export interface TransformedData {
  originalRow: Record<string, any>;
  transformedRow: Record<string, any>;
  appliedTransformations: string[];
}

export interface ReconciliationResult {
  id: string;
  sourceRow: Record<string, any>;
  targetRow?: Record<string, any>;
  status: 'matched' | 'unmatched-source' | 'unmatched-target' | 'discrepancy';
  discrepancies?: string[];
  transformations?: {
    source?: string[];
    target?: string[];
  };
}

export interface ReconciliationConfig {
  mappings: ColumnMapping[];
  tolerance: number;
  enableFuzzyMatching: boolean;
}