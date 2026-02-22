import {
  TransformationStep,
  TransformationPipeline,
  TransformationResult,
  TransformationPreview,
  TransformationType,
  TRANSFORMATION_CONFIGS
} from '@/types/transformations';

export class TransformationEngine {
  /**
   * Execute a single transformation step on a value
   */
  static executeStep(value: any, step: TransformationStep): { success: boolean; value: any; error?: string } {
    try {
      const transformedValue = this.applyTransformation(value, step.type, step.parameters);
      return { success: true, value: transformedValue };
    } catch (error) {
      return {
        success: false,
        value: value,
        error: error instanceof Error ? error.message : 'Unknown transformation error'
      };
    }
  }

  /**
   * Execute a complete transformation pipeline on a value
   */
  static executePipeline(value: any, pipeline: TransformationPipeline): TransformationResult {
    const stepResults: TransformationResult['stepResults'] = [];
    let currentValue = value;
    let overallSuccess = true;

    // Sort steps by order
    const sortedSteps = [...pipeline.steps].sort((a, b) => a.order - b.order);

    for (const step of sortedSteps) {
      const stepResult = this.executeStep(currentValue, step);
      stepResults.push({
        stepId: step.id,
        success: stepResult.success,
        value: stepResult.value,
        error: stepResult.error
      });

      if (stepResult.success) {
        currentValue = stepResult.value;
      } else {
        overallSuccess = false;
        // Continue with original value if step fails
      }
    }

    return {
      success: overallSuccess,
      originalValue: value,
      transformedValue: currentValue,
      error: overallSuccess ? undefined : 'One or more transformation steps failed',
      stepResults
    };
  }

  /**
   * Execute pipeline on array of values and generate preview
   */
  static generatePreview(
    data: any[],
    pipeline: TransformationPipeline,
    sampleSize: number = 5
  ): TransformationPreview {
    const sampleData = data.slice(0, sampleSize);
    const results = sampleData.map(value => this.executePipeline(value, pipeline));
    const errorCount = results.filter(r => !r.success).length;
    const successRate = results.length > 0 ? (results.length - errorCount) / results.length : 0;

    return {
      columnId: pipeline.columnId,
      sampleData,
      results,
      errorCount,
      successRate
    };
  }

  /**
   * Apply specific transformation type with parameters
   */
  private static applyTransformation(value: any, type: TransformationType, parameters: Record<string, any>): any {
    if (value === null || value === undefined) {
      return value;
    }

    switch (type) {
      case 'clean_string':
        return this.cleanString(String(value), parameters);

      case 'trim':
        return String(value).trim();

      case 'lowercase':
        return String(value).toLowerCase();

      case 'uppercase':
        return String(value).toUpperCase();

      case 'remove_special_chars':
        return this.removeSpecialChars(String(value), parameters);

      case 'cast_to_date':
        return this.castToDate(value, parameters);

      case 'cast_to_number':
        return this.castToNumber(value, parameters);

      case 'cast_to_string':
        return String(value);

      case 'convert_timezone':
        return this.convertTimezone(value, parameters);

      case 'format_date':
        return this.formatDate(value, parameters);

      case 'currency_conversion':
        return this.convertCurrency(value, parameters);

      case 'round_number':
        return this.roundNumber(value, parameters);

      case 'replace_text':
        return this.replaceText(String(value), parameters);

      case 'extract_substring':
        return this.extractSubstring(String(value), parameters);

      case 'standardize_format':
        return this.standardizeFormat(String(value), parameters);

      case 'conditional':
        return this.applyConditional(value, parameters);

      case 'absolute_value':
        return this.absoluteValue(value);

      case 'negate_number':
        return this.negateNumber(value);

      case 'scale_number':
        return this.scaleNumber(value, parameters);

      case 'fill_null':
        return this.fillNull(value, parameters);

      case 'flag_missing':
        return this.flagMissing(value, parameters);

      case 'exclude_if_null':
        return this.excludeIfNull(value, parameters);

      default:
        throw new Error(`Unsupported transformation type: ${type}`);
    }
  }

  // String transformations
  private static cleanString(value: string, params: Record<string, any>): string {
    let result = value;

    if (params.trim !== false) {
      result = result.trim();
    }

    if (params.normalizeSpaces !== false) {
      result = result.replace(/\s+/g, ' ');
    }

    return result;
  }

  private static removeSpecialChars(value: string, params: Record<string, any>): string {
    if (params.keepAlphanumeric) {
      const replacement = params.replacement || '';
      return value.replace(/[^a-zA-Z0-9\s]/g, replacement);
    }
    return value;
  }

  private static replaceText(value: string, params: Record<string, any>): string {
    const { searchText, replaceWith, useRegex, caseSensitive } = params;

    if (useRegex) {
      const flags = caseSensitive ? 'g' : 'gi';
      const regex = new RegExp(searchText, flags);
      return value.replace(regex, replaceWith);
    } else {
      const flags = caseSensitive ? 'g' : 'gi';
      const regex = new RegExp(searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
      return value.replace(regex, replaceWith);
    }
  }

  private static extractSubstring(value: string, params: Record<string, any>): string {
    const { startPosition, length } = params;
    if (length !== undefined) {
      return value.substring(startPosition, startPosition + length);
    }
    return value.substring(startPosition);
  }

  private static standardizeFormat(value: string, params: Record<string, any>): string {
    const { formatType } = params;

    switch (formatType) {
      case 'phone':
        // Basic phone number formatting (US format)
        const digits = value.replace(/\D/g, '');
        if (digits.length === 10) {
          return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
        }
        return value;

      case 'email':
        return value.toLowerCase().trim();

      case 'title':
        return value.replace(/\w\S*/g, (txt) =>
          txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
        );

      case 'sentence':
        return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();

      default:
        return value;
    }
  }

  // Date transformations
  private static castToDate(value: any, params: Record<string, any>): Date {
    if (value instanceof Date) {
      return value;
    }

    const stringValue = String(value).trim();
    if (!stringValue) {
      throw new Error('Empty date string');
    }

    // Try parsing with specified format or auto-detect
    const { inputFormat, strictParsing } = params;

    if (inputFormat && inputFormat !== 'auto') {
      return this.parseWithFormat(stringValue, inputFormat, strictParsing);
    }

    // Auto-detection
    const parsed = new Date(stringValue);
    if (isNaN(parsed.getTime())) {
      throw new Error(`Unable to parse date: ${stringValue}`);
    }

    return parsed;
  }

  private static parseWithFormat(value: string, format: string, strict: boolean): Date {
    // Basic format parsing - in production, use a library like date-fns or moment.js
    const formatMap: Record<string, RegExp> = {
      'MM/DD/YYYY': /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
      'DD/MM/YYYY': /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
      'YYYY-MM-DD': /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
      'DD-MM-YYYY': /^(\d{1,2})-(\d{1,2})-(\d{4})$/,
      'DD-MM-YYYY HH:mm': /^(\d{1,2})-(\d{1,2})-(\d{4})\s+(\d{1,2}):(\d{2})$/,
      'MM-DD-YYYY HH:mm': /^(\d{1,2})-(\d{1,2})-(\d{4})\s+(\d{1,2}):(\d{2})$/
    };

    const regex = formatMap[format];
    if (!regex) {
      throw new Error(`Unsupported date format: ${format}`);
    }

    const match = value.match(regex);
    if (!match) {
      throw new Error(`Date does not match format ${format}: ${value}`);
    }

    let year: number, month: number, day: number;
    let hours: number = 0, minutes: number = 0;

    switch (format) {
      case 'MM/DD/YYYY':
        [, month, day, year] = match.map(Number);
        break;
      case 'DD/MM/YYYY':
      case 'DD-MM-YYYY':
        [, day, month, year] = match.map(Number);
        break;
      case 'YYYY-MM-DD':
        [, year, month, day] = match.map(Number);
        break;
      case 'DD-MM-YYYY HH:mm':
        [, day, month, year, hours, minutes] = match.map(Number);
        break;
      case 'MM-DD-YYYY HH:mm':
        [, month, day, year, hours, minutes] = match.map(Number);
        break;
      default:
        throw new Error(`Unsupported format: ${format}`);
    }

    const date = new Date(year, month - 1, day, hours, minutes); // Month is 0-indexed

    if (strict && (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day)) {
      throw new Error(`Invalid date: ${value}`);
    }

    return date;
  }

  private static convertTimezone(value: any, params: Record<string, any>): Date {
    if (!(value instanceof Date)) {
      throw new Error('Value must be a Date object for timezone conversion');
    }

    // Basic timezone conversion - in production, use a library like date-fns-tz
    const { fromTimezone, toTimezone } = params;

    // For now, return the date as-is since proper timezone conversion requires external libraries
    // In production, implement with libraries like date-fns-tz or moment-timezone
    console.warn('Timezone conversion not fully implemented - returning original date');
    return value;
  }

  private static formatDate(value: any, params: Record<string, any>): string {
    if (!(value instanceof Date)) {
      throw new Error('Value must be a Date object for formatting');
    }

    const { outputFormat } = params;

    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    const hours = String(value.getHours()).padStart(2, '0');
    const minutes = String(value.getMinutes()).padStart(2, '0');
    const seconds = String(value.getSeconds()).padStart(2, '0');

    switch (outputFormat) {
      case 'YYYY-MM-DD':
        return `${year}-${month}-${day}`;
      case 'MM/DD/YYYY':
        return `${month}/${day}/${year}`;
      case 'DD/MM/YYYY':
        return `${day}/${month}/${year}`;
      case 'YYYY-MM-DD HH:mm:ss':
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
      case 'DD-MM-YYYY HH:mm':
        return `${day}-${month}-${year} ${hours}:${minutes}`;
      case 'MM-DD-YYYY HH:mm':
        return `${month}-${day}-${year} ${hours}:${minutes}`;
      default:
        return value.toISOString();
    }
  }

  // Numeric transformations
  private static castToNumber(value: any, params: Record<string, any>): number {
    if (typeof value === 'number') {
      return value;
    }

    let stringValue = String(value).trim();

    if (params.removeCommas) {
      stringValue = stringValue.replace(/,/g, '');
    }

    if (params.removeCurrency) {
      stringValue = stringValue.replace(/[$€£¥₹]/g, '');
    }

    const parsed = parseFloat(stringValue);
    if (isNaN(parsed)) {
      throw new Error(`Unable to parse number: ${value}`);
    }

    return parsed;
  }

  private static roundNumber(value: any, params: Record<string, any>): number {
    const num = typeof value === 'number' ? value : parseFloat(String(value));
    if (isNaN(num)) {
      throw new Error(`Unable to round non-numeric value: ${value}`);
    }

    const { decimalPlaces, roundingMode } = params;
    const multiplier = Math.pow(10, decimalPlaces);

    switch (roundingMode) {
      case 'ceil':
        return Math.ceil(num * multiplier) / multiplier;
      case 'floor':
        return Math.floor(num * multiplier) / multiplier;
      case 'round':
      default:
        return Math.round(num * multiplier) / multiplier;
    }
  }

  private static convertCurrency(value: any, params: Record<string, any>): number {
    const num = typeof value === 'number' ? value : parseFloat(String(value));
    if (isNaN(num)) {
      throw new Error(`Unable to convert non-numeric currency value: ${value}`);
    }

    const { fromCurrency, toCurrency, exchangeRate } = params;

    if (fromCurrency === toCurrency) {
      return num;
    }

    if (exchangeRate) {
      return num * exchangeRate;
    }

    // In production, fetch real exchange rates from an API
    // For now, use mock rates
    const mockRates: Record<string, Record<string, number>> = {
      'USD': { 'EUR': 0.85, 'GBP': 0.73, 'JPY': 110 },
      'EUR': { 'USD': 1.18, 'GBP': 0.86, 'JPY': 129 },
      'GBP': { 'USD': 1.37, 'EUR': 1.16, 'JPY': 151 },
      'JPY': { 'USD': 0.009, 'EUR': 0.008, 'GBP': 0.007 }
    };

    const rate = mockRates[fromCurrency]?.[toCurrency];
    if (!rate) {
      throw new Error(`No exchange rate available for ${fromCurrency} to ${toCurrency}`);
    }

    return num * rate;
  }

  // Conditional logic transformation
  private static applyConditional(value: any, params: Record<string, any>): any {
    const { condition, trueValue, falseValue, dataType } = params;

    try {
      // Create a safe evaluation context
      const evaluationContext = {
        value: value,
        // Helper functions for common conditions
        isNull: (v: any) => v === null || v === undefined,
        isEmpty: (v: any) => v === '' || v === null || v === undefined,
        isNumber: (v: any) => typeof v === 'number' && !isNaN(v),
        isString: (v: any) => typeof v === 'string',
        contains: (str: string, substr: string) => String(str).toLowerCase().includes(String(substr).toLowerCase()),
        startsWith: (str: string, prefix: string) => String(str).toLowerCase().startsWith(String(prefix).toLowerCase()),
        endsWith: (str: string, suffix: string) => String(str).toLowerCase().endsWith(String(suffix).toLowerCase()),
        abs: Math.abs,
        length: (v: any) => String(v).length
      };

      // Replace 'value' in condition with actual value reference
      let evaluableCondition = condition.replace(/\bvalue\b/g, 'evaluationContext.value');

      // Add context functions
      evaluableCondition = evaluableCondition
        .replace(/\bisNull\(/g, 'evaluationContext.isNull(')
        .replace(/\bisEmpty\(/g, 'evaluationContext.isEmpty(')
        .replace(/\bisNumber\(/g, 'evaluationContext.isNumber(')
        .replace(/\bisString\(/g, 'evaluationContext.isString(')
        .replace(/\bcontains\(/g, 'evaluationContext.contains(')
        .replace(/\bstartsWith\(/g, 'evaluationContext.startsWith(')
        .replace(/\bendsWith\(/g, 'evaluationContext.endsWith(')
        .replace(/\babs\(/g, 'evaluationContext.abs(')
        .replace(/\blength\(/g, 'evaluationContext.length(');

      // Safe evaluation using Function constructor (more secure than eval)
      const result = new Function('evaluationContext', `return ${evaluableCondition}`)(evaluationContext);

      const returnValue = result ? trueValue : falseValue;

      // Cast return value to specified data type
      switch (dataType) {
        case 'number':
          const num = parseFloat(returnValue);
          if (isNaN(num)) {
            throw new Error(`Cannot convert "${returnValue}" to number`);
          }
          return num;
        case 'boolean':
          return returnValue === 'true' || returnValue === true;
        case 'string':
        default:
          return String(returnValue);
      }
    } catch (error) {
      throw new Error(`Conditional evaluation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Additional numeric transformations
  private static absoluteValue(value: any): number {
    const num = typeof value === 'number' ? value : parseFloat(String(value));
    if (isNaN(num)) {
      throw new Error(`Cannot get absolute value of non-numeric value: ${value}`);
    }
    return Math.abs(num);
  }

  private static negateNumber(value: any): number {
    const num = typeof value === 'number' ? value : parseFloat(String(value));
    if (isNaN(num)) {
      throw new Error(`Cannot negate non-numeric value: ${value}`);
    }
    return -num;
  }

  private static scaleNumber(value: any, params: Record<string, any>): number {
    const num = typeof value === 'number' ? value : parseFloat(String(value));
    if (isNaN(num)) {
      throw new Error(`Cannot scale non-numeric value: ${value}`);
    }

    const { factor } = params;
    if (typeof factor !== 'number') {
      throw new Error(`Scale factor must be a number, got: ${factor}`);
    }

    return num * factor;
  }

  // Data quality transformations
  private static fillNull(value: any, params: Record<string, any>): any {
    const { fillValue, treatEmptyAsNull, treatZeroAsNull } = params;

    // Check if value is considered null/missing
    const isNull = value === null || value === undefined;
    const isEmpty = treatEmptyAsNull && (value === '' || (typeof value === 'string' && value.trim() === ''));
    const isZero = treatZeroAsNull && (value === 0 || value === '0');

    if (isNull || isEmpty || isZero) {
      // Handle special fill values
      switch (fillValue) {
        case 'current_date':
          return new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
        case 'current_datetime':
          return new Date().toISOString();
        case 'current_timestamp':
          return Date.now();
        default:
          return fillValue;
      }
    }

    return value;
  }

  private static flagMissing(value: any, params: Record<string, any>): any {
    const { flagValue, flagPosition } = params;

    // Check if value is missing
    const isMissing = value === null || value === undefined || value === '' ||
      (typeof value === 'string' && value.trim() === '');

    if (!isMissing) {
      return value;
    }

    // Apply flag based on position
    switch (flagPosition) {
      case 'prefix':
        return `${flagValue}_${value || 'NULL'}`;
      case 'suffix':
        return `${value || 'NULL'}_${flagValue}`;
      case 'replace':
      default:
        return flagValue;
    }
  }

  private static excludeIfNull(value: any, params: Record<string, any>): any {
    const { threshold, treatEmptyAsNull } = params;

    // Check if value is missing
    const isNull = value === null || value === undefined;
    const isEmpty = treatEmptyAsNull && (value === '' || (typeof value === 'string' && value.trim() === ''));

    if (isNull || isEmpty) {
      // In a real implementation, this would mark the entire row for exclusion
      // For now, we'll throw a special error that can be caught and handled
      throw new Error(`EXCLUDE_ROW: Value is missing (threshold: ${threshold})`);
    }

    return value;
  }

  /**
   * Validate transformation step parameters
   */
  static validateStep(step: TransformationStep): { valid: boolean; errors: string[] } {
    const config = TRANSFORMATION_CONFIGS[step.type];
    if (!config) {
      return { valid: false, errors: [`Unknown transformation type: ${step.type}`] };
    }

    const errors: string[] = [];

    for (const paramConfig of config.parameters) {
      const value = step.parameters[paramConfig.name];

      if (paramConfig.required && (value === undefined || value === null)) {
        errors.push(`Required parameter '${paramConfig.name}' is missing`);
        continue;
      }

      if (value !== undefined && value !== null) {
        // Type validation
        switch (paramConfig.type) {
          case 'number':
            if (typeof value !== 'number' && isNaN(Number(value))) {
              errors.push(`Parameter '${paramConfig.name}' must be a number`);
            }
            break;
          case 'boolean':
            if (typeof value !== 'boolean') {
              errors.push(`Parameter '${paramConfig.name}' must be a boolean`);
            }
            break;
          case 'select':
            if (paramConfig.options && !paramConfig.options.some(opt => opt.value === value)) {
              errors.push(`Parameter '${paramConfig.name}' must be one of: ${paramConfig.options.map(o => o.value).join(', ')}`);
            }
            break;
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Validate complete transformation pipeline
   */
  static validatePipeline(pipeline: TransformationPipeline): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!pipeline.steps || pipeline.steps.length === 0) {
      errors.push('Pipeline must contain at least one transformation step');
      return { valid: false, errors };
    }

    // Validate each step
    for (const step of pipeline.steps) {
      const stepValidation = this.validateStep(step);
      if (!stepValidation.valid) {
        errors.push(`Step '${step.name}': ${stepValidation.errors.join(', ')}`);
      }
    }

    // Check for logical order issues
    const hasDateCast = pipeline.steps.some(s => s.type === 'cast_to_date');
    const hasTimezoneConversion = pipeline.steps.some(s => s.type === 'convert_timezone');

    if (hasTimezoneConversion && !hasDateCast) {
      const dateStepIndex = pipeline.steps.findIndex(s => s.type === 'cast_to_date');
      const timezoneStepIndex = pipeline.steps.findIndex(s => s.type === 'convert_timezone');

      if (dateStepIndex > timezoneStepIndex) {
        errors.push('Timezone conversion should come after date casting');
      }
    }

    return { valid: errors.length === 0, errors };
  }
}
