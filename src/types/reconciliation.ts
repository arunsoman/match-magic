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
  sourceRow: Record<string, any> | null;
  targetRow?: Record<string, any> | null;
  status: 'matched' | 'unmatched-source' | 'unmatched-target' | 'discrepancy';
  matchType?: 'exact' | 'fuzzy' | 'unmatched_source' | 'unmatched_target';
  confidence?: number;
  differences?: Array<{ field: string; sourceValue: any; targetValue: any; difference: any }>;
  amount?: number;
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
  virtualFields?: {
    source: VirtualField[];
    target: VirtualField[];
  };
}

// Virtual Fields interfaces
export interface VirtualField {
  id: string;
  name: string;
  formula: VirtualFormulaDefinition;
  dataType: 'number' | 'string' | 'date' | 'boolean';
  sourceFile: 'source' | 'target';
  createdAt: Date;
  isValid: boolean;
  preview?: any[];
}

export interface VirtualFormulaDefinition {
  expression: string;
  operations: Operation[];
  fields: FieldReference[];
  rawFormula: string; // Human readable formula like "Field1 + Field2"
}

export interface Operation {
  id: string;
  type: 'add' | 'subtract' | 'multiply' | 'divide' | 'abs' | 'concat' | 'date_diff' | 'negate' | 'conditional';
  precedence: number;
  symbol: string;
  label: string;
  dataTypes: ('number' | 'string' | 'date' | 'boolean')[];
  description: string;
}

export interface FieldReference {
  id: string;
  name: string;
  dataType: 'number' | 'string' | 'date' | 'boolean';
  isVirtual: boolean;
}

export interface FormulaValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  preview?: any[];
}