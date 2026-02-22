// Transformation system types for batch data preprocessing

export type TransformationType =
  | 'clean_string'
  | 'trim'
  | 'lowercase'
  | 'uppercase'
  | 'remove_special_chars'
  | 'cast_to_date'
  | 'cast_to_number'
  | 'cast_to_string'
  | 'convert_timezone'
  | 'format_date'
  | 'currency_conversion'
  | 'round_number'
  | 'replace_text'
  | 'extract_substring'
  | 'standardize_format'
  | 'conditional'
  | 'absolute_value'
  | 'negate_number'
  | 'scale_number'
  | 'fill_null'
  | 'flag_missing'
  | 'exclude_if_null';

export interface TransformationStep {
  id: string;
  type: TransformationType;
  name: string;
  description: string;
  parameters: Record<string, any>;
  order: number;
}

export interface TransformationPipeline {
  id: string;
  name: string;
  description?: string;
  columnId: string;
  outputColumn?: string;
  sourceFile: 'source' | 'target';
  steps: TransformationStep[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TransformationPreset {
  id: string;
  name: string;
  description: string;
  category: 'date' | 'string' | 'numeric' | 'currency' | 'custom';
  steps: Omit<TransformationStep, 'id' | 'order'>[];
  isBuiltIn: boolean;
  usageCount: number;
  tags: string[];
}

export interface TransformationResult {
  success: boolean;
  originalValue: any;
  transformedValue: any;
  error?: string;
  stepResults: {
    stepId: string;
    success: boolean;
    value: any;
    error?: string;
  }[];
}

export interface TransformationPreview {
  columnId: string;
  sampleData: any[];
  results: TransformationResult[];
  errorCount: number;
  successRate: number;
}

// Built-in transformation configurations
export const TRANSFORMATION_CONFIGS: Record<TransformationType, {
  name: string;
  description: string;
  category: string;
  parameters: {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'select' | 'date';
    required: boolean;
    default?: any;
    options?: { label: string; value: any }[];
    description: string;
  }[];
}> = {
  clean_string: {
    name: 'Clean String',
    description: 'Remove extra whitespace, normalize spacing',
    category: 'string',
    parameters: [
      {
        name: 'trim',
        type: 'boolean',
        required: false,
        default: true,
        description: 'Remove leading and trailing whitespace'
      },
      {
        name: 'normalizeSpaces',
        type: 'boolean',
        required: false,
        default: true,
        description: 'Replace multiple spaces with single space'
      }
    ]
  },
  trim: {
    name: 'Trim Whitespace',
    description: 'Remove leading and trailing whitespace',
    category: 'string',
    parameters: []
  },
  lowercase: {
    name: 'Convert to Lowercase',
    description: 'Convert all text to lowercase',
    category: 'string',
    parameters: []
  },
  uppercase: {
    name: 'Convert to Uppercase',
    description: 'Convert all text to uppercase',
    category: 'string',
    parameters: []
  },
  remove_special_chars: {
    name: 'Remove Special Characters',
    description: 'Remove or replace special characters',
    category: 'string',
    parameters: [
      {
        name: 'keepAlphanumeric',
        type: 'boolean',
        required: false,
        default: true,
        description: 'Keep only letters and numbers'
      },
      {
        name: 'replacement',
        type: 'string',
        required: false,
        default: '',
        description: 'Character to replace special chars with'
      }
    ]
  },
  cast_to_date: {
    name: 'Cast to Date',
    description: 'Parse text as date with format detection',
    category: 'date',
    parameters: [
      {
        name: 'inputFormat',
        type: 'select',
        required: false,
        options: [
          { label: 'Auto-detect', value: 'auto' },
          { label: 'MM/DD/YYYY', value: 'MM/DD/YYYY' },
          { label: 'DD/MM/YYYY', value: 'DD/MM/YYYY' },
          { label: 'YYYY-MM-DD', value: 'YYYY-MM-DD' },
          { label: 'DD-MM-YYYY', value: 'DD-MM-YYYY' },
          { label: 'DD-MM-YYYY HH:mm', value: 'DD-MM-YYYY HH:mm' },
          { label: 'MM-DD-YYYY HH:mm', value: 'MM-DD-YYYY HH:mm' }
        ],
        default: 'auto',
        description: 'Expected input date format'
      },
      {
        name: 'strictParsing',
        type: 'boolean',
        required: false,
        default: false,
        description: 'Fail on ambiguous dates'
      }
    ]
  },
  cast_to_number: {
    name: 'Cast to Number',
    description: 'Parse text as numeric value',
    category: 'numeric',
    parameters: [
      {
        name: 'removeCommas',
        type: 'boolean',
        required: false,
        default: true,
        description: 'Remove thousand separators'
      },
      {
        name: 'removeCurrency',
        type: 'boolean',
        required: false,
        default: true,
        description: 'Remove currency symbols'
      }
    ]
  },
  cast_to_string: {
    name: 'Cast to String',
    description: 'Convert value to text representation',
    category: 'string',
    parameters: []
  },
  convert_timezone: {
    name: 'Convert Timezone',
    description: 'Convert date/time to different timezone',
    category: 'date',
    parameters: [
      {
        name: 'fromTimezone',
        type: 'select',
        required: true,
        options: [
          { label: 'Auto-detect', value: 'auto' },
          { label: 'UTC', value: 'UTC' },
          { label: 'EST (Eastern)', value: 'America/New_York' },
          { label: 'PST (Pacific)', value: 'America/Los_Angeles' },
          { label: 'CST (Central)', value: 'America/Chicago' }
        ],
        description: 'Source timezone'
      },
      {
        name: 'toTimezone',
        type: 'select',
        required: true,
        options: [
          { label: 'UTC', value: 'UTC' },
          { label: 'EST (Eastern)', value: 'America/New_York' },
          { label: 'PST (Pacific)', value: 'America/Los_Angeles' },
          { label: 'CST (Central)', value: 'America/Chicago' }
        ],
        default: 'UTC',
        description: 'Target timezone'
      }
    ]
  },
  format_date: {
    name: 'Format Date',
    description: 'Format date to specific string representation',
    category: 'date',
    parameters: [
      {
        name: 'outputFormat',
        type: 'select',
        required: true,
        options: [
          { label: 'YYYY-MM-DD', value: 'YYYY-MM-DD' },
          { label: 'MM/DD/YYYY', value: 'MM/DD/YYYY' },
          { label: 'DD/MM/YYYY', value: 'DD/MM/YYYY' },
          { label: 'YYYY-MM-DD HH:mm:ss', value: 'YYYY-MM-DD HH:mm:ss' },
          { label: 'DD-MM-YYYY HH:mm', value: 'DD-MM-YYYY HH:mm' },
          { label: 'MM-DD-YYYY HH:mm', value: 'MM-DD-YYYY HH:mm' }
        ],
        default: 'YYYY-MM-DD',
        description: 'Output date format'
      }
    ]
  },
  currency_conversion: {
    name: 'Currency Conversion',
    description: 'Convert between currencies',
    category: 'currency',
    parameters: [
      {
        name: 'fromCurrency',
        type: 'select',
        required: true,
        options: [
          { label: 'USD', value: 'USD' },
          { label: 'EUR', value: 'EUR' },
          { label: 'GBP', value: 'GBP' },
          { label: 'JPY', value: 'JPY' }
        ],
        description: 'Source currency'
      },
      {
        name: 'toCurrency',
        type: 'select',
        required: true,
        options: [
          { label: 'USD', value: 'USD' },
          { label: 'EUR', value: 'EUR' },
          { label: 'GBP', value: 'GBP' },
          { label: 'JPY', value: 'JPY' }
        ],
        default: 'USD',
        description: 'Target currency'
      },
      {
        name: 'exchangeRate',
        type: 'number',
        required: false,
        description: 'Manual exchange rate (optional, will fetch current if not provided)'
      }
    ]
  },
  round_number: {
    name: 'Round Number',
    description: 'Round numeric values to specified decimal places',
    category: 'numeric',
    parameters: [
      {
        name: 'decimalPlaces',
        type: 'number',
        required: true,
        default: 2,
        description: 'Number of decimal places'
      },
      {
        name: 'roundingMode',
        type: 'select',
        required: false,
        options: [
          { label: 'Round to nearest', value: 'round' },
          { label: 'Round up (ceiling)', value: 'ceil' },
          { label: 'Round down (floor)', value: 'floor' }
        ],
        default: 'round',
        description: 'Rounding method'
      }
    ]
  },
  replace_text: {
    name: 'Replace Text',
    description: 'Find and replace text patterns',
    category: 'string',
    parameters: [
      {
        name: 'searchText',
        type: 'string',
        required: true,
        description: 'Text to find'
      },
      {
        name: 'replaceWith',
        type: 'string',
        required: true,
        description: 'Replacement text'
      },
      {
        name: 'useRegex',
        type: 'boolean',
        required: false,
        default: false,
        description: 'Use regular expressions'
      },
      {
        name: 'caseSensitive',
        type: 'boolean',
        required: false,
        default: true,
        description: 'Case sensitive matching'
      }
    ]
  },
  extract_substring: {
    name: 'Extract Substring',
    description: 'Extract portion of text',
    category: 'string',
    parameters: [
      {
        name: 'startPosition',
        type: 'number',
        required: true,
        default: 0,
        description: 'Starting position (0-based)'
      },
      {
        name: 'length',
        type: 'number',
        required: false,
        description: 'Length of substring (optional, extracts to end if not specified)'
      }
    ]
  },
  standardize_format: {
    name: 'Standardize Format',
    description: 'Apply standard formatting rules',
    category: 'string',
    parameters: [
      {
        name: 'formatType',
        type: 'select',
        required: true,
        options: [
          { label: 'Phone Number', value: 'phone' },
          { label: 'Email', value: 'email' },
          { label: 'Title Case', value: 'title' },
          { label: 'Sentence Case', value: 'sentence' }
        ],
        description: 'Type of standardization to apply'
      }
    ]
  },
  conditional: {
    name: 'Conditional Logic',
    description: 'Apply if-then-else transformations based on conditions',
    category: 'custom',
    parameters: [
      {
        name: 'condition',
        type: 'string',
        required: true,
        description: 'Condition expression (e.g., "value < 0", "value.includes(\'expense\')")'
      },
      {
        name: 'trueValue',
        type: 'string',
        required: true,
        description: 'Value to return if condition is true'
      },
      {
        name: 'falseValue',
        type: 'string',
        required: true,
        description: 'Value to return if condition is false'
      },
      {
        name: 'dataType',
        type: 'select',
        required: false,
        default: 'string',
        options: [
          { label: 'String', value: 'string' },
          { label: 'Number', value: 'number' },
          { label: 'Boolean', value: 'boolean' }
        ],
        description: 'Expected data type for comparison'
      }
    ]
  },
  absolute_value: {
    name: 'Absolute Value',
    description: 'Convert number to its absolute value',
    category: 'numeric',
    parameters: []
  },
  negate_number: {
    name: 'Negate Number',
    description: 'Multiply number by -1 to flip sign',
    category: 'numeric',
    parameters: []
  },
  scale_number: {
    name: 'Scale Number',
    description: 'Multiply number by a scaling factor',
    category: 'numeric',
    parameters: [
      {
        name: 'factor',
        type: 'number',
        required: true,
        default: 100,
        description: 'Scaling factor (e.g., 100 for percentage to decimal)'
      }
    ]
  },
  fill_null: {
    name: 'Fill Missing Values',
    description: 'Replace null, undefined, or empty values with defaults',
    category: 'custom',
    parameters: [
      {
        name: 'fillValue',
        type: 'string',
        required: true,
        default: '0',
        description: 'Value to use for missing data (e.g., "0", "current_date", "N/A")'
      },
      {
        name: 'treatEmptyAsNull',
        type: 'boolean',
        required: false,
        default: true,
        description: 'Treat empty strings as missing values'
      },
      {
        name: 'treatZeroAsNull',
        type: 'boolean',
        required: false,
        default: false,
        description: 'Treat zero values as missing (for numeric fields)'
      }
    ]
  },
  flag_missing: {
    name: 'Flag Missing Data',
    description: 'Add flag indicating if original value was missing',
    category: 'custom',
    parameters: [
      {
        name: 'flagValue',
        type: 'string',
        required: false,
        default: 'MISSING',
        description: 'Flag to append/prepend for missing values'
      },
      {
        name: 'flagPosition',
        type: 'select',
        required: false,
        default: 'suffix',
        options: [
          { label: 'Prefix (before value)', value: 'prefix' },
          { label: 'Suffix (after value)', value: 'suffix' },
          { label: 'Replace entirely', value: 'replace' }
        ],
        description: 'Where to place the missing data flag'
      }
    ]
  },
  exclude_if_null: {
    name: 'Exclude Missing Data',
    description: 'Mark rows for exclusion if value is missing',
    category: 'custom',
    parameters: [
      {
        name: 'threshold',
        type: 'number',
        required: false,
        default: 1,
        description: 'Minimum number of missing values to trigger exclusion'
      },
      {
        name: 'treatEmptyAsNull',
        type: 'boolean',
        required: false,
        default: true,
        description: 'Treat empty strings as missing values'
      }
    ]
  }
};

// Built-in presets
export const BUILT_IN_PRESETS: TransformationPreset[] = [
  {
    id: 'date-normalize-utc',
    name: 'Date to UTC',
    description: 'Clean string, parse date, convert to UTC',
    category: 'date',
    isBuiltIn: true,
    usageCount: 0,
    tags: ['date', 'timezone', 'utc'],
    steps: [
      {
        type: 'clean_string',
        name: 'Clean String',
        description: 'Remove extra whitespace',
        parameters: { trim: true, normalizeSpaces: true }
      },
      {
        type: 'cast_to_date',
        name: 'Parse Date',
        description: 'Convert to date object',
        parameters: { inputFormat: 'auto', strictParsing: false }
      },
      {
        type: 'convert_timezone',
        name: 'Convert to UTC',
        description: 'Normalize to UTC timezone',
        parameters: { fromTimezone: 'auto', toTimezone: 'UTC' }
      }
    ]
  },
  {
    id: 'amount-normalize-usd',
    name: 'Amount to USD',
    description: 'Clean string, parse number, round to 2 decimals',
    category: 'currency',
    isBuiltIn: true,
    usageCount: 0,
    tags: ['currency', 'amount', 'usd'],
    steps: [
      {
        type: 'clean_string',
        name: 'Clean String',
        description: 'Remove extra whitespace',
        parameters: { trim: true, normalizeSpaces: true }
      },
      {
        type: 'cast_to_number',
        name: 'Parse Number',
        description: 'Convert to numeric value',
        parameters: { removeCommas: true, removeCurrency: true }
      },
      {
        type: 'round_number',
        name: 'Round Amount',
        description: 'Round to 2 decimal places',
        parameters: { decimalPlaces: 2, roundingMode: 'round' }
      }
    ]
  },
  {
    id: 'description-cleanup',
    name: 'Description Cleanup',
    description: 'Clean, standardize, and normalize description text',
    category: 'string',
    isBuiltIn: true,
    usageCount: 0,
    tags: ['string', 'cleanup', 'standardize'],
    steps: [
      {
        type: 'clean_string',
        name: 'Clean String',
        description: 'Remove extra whitespace',
        parameters: { trim: true, normalizeSpaces: true }
      },
      {
        type: 'lowercase',
        name: 'Convert to Lowercase',
        description: 'Normalize case',
        parameters: {}
      },
      {
        type: 'remove_special_chars',
        name: 'Remove Special Characters',
        description: 'Keep only alphanumeric',
        parameters: { keepAlphanumeric: true, replacement: ' ' }
      }
    ]
  },
  {
    id: 'expense-income-categorizer',
    name: 'Expense/Income Categorizer',
    description: 'Categorize amounts as Expense or Income based on value',
    category: 'custom',
    isBuiltIn: true,
    usageCount: 0,
    tags: ['conditional', 'categorize', 'expense', 'income'],
    steps: [
      {
        type: 'cast_to_number',
        name: 'Parse Amount',
        description: 'Convert to numeric value',
        parameters: { removeCommas: true, removeCurrency: true }
      },
      {
        type: 'conditional',
        name: 'Categorize by Sign',
        description: 'Expense if negative, Income if positive',
        parameters: {
          condition: 'value < 0',
          trueValue: 'Expense',
          falseValue: 'Income',
          dataType: 'string'
        }
      }
    ]
  },
  {
    id: 'data-quality-cleanup',
    name: 'Data Quality Cleanup',
    description: 'Handle missing values and improve data quality',
    category: 'custom',
    isBuiltIn: true,
    usageCount: 0,
    tags: ['missing', 'null', 'quality', 'cleanup'],
    steps: [
      {
        type: 'fill_null',
        name: 'Fill Missing Values',
        description: 'Replace missing values with defaults',
        parameters: { fillValue: '0', treatEmptyAsNull: true, treatZeroAsNull: false }
      },
      {
        type: 'flag_missing',
        name: 'Flag Originally Missing',
        description: 'Mark values that were originally missing',
        parameters: { flagValue: 'WAS_MISSING', flagPosition: 'suffix' }
      }
    ]
  }
];
