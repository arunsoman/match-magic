import { VirtualField, VirtualFormulaDefinition, Operation, FieldReference } from '@/types/reconciliation';

export interface EvaluationResult {
  success: boolean;
  value?: any;
  error?: string;
}

export interface EvaluationContext {
  row: Record<string, any>;
  virtualFields?: VirtualField[];
}

export class ExpressionEvaluator {
  /**
   * Evaluate a virtual field formula for a single row of data
   */
  static evaluateFormula(
    formula: VirtualFormulaDefinition,
    context: EvaluationContext
  ): EvaluationResult {
    try {
      const { fields, operations } = formula;

      if (fields.length === 0) {
        return { success: false, error: 'No fields specified in formula' };
      }

      // Get field values from the row
      const fieldValues: any[] = [];
      for (const field of fields) {
        const value = this.getFieldValue(field, context);
        fieldValues.push(value === undefined ? null : value);
      }

      // If only one field, return its value
      if (fieldValues.length === 1 && operations.length === 0) {
        return { success: true, value: fieldValues[0] };
      }

      // Apply operations sequentially
      let result = fieldValues[0];
      for (let i = 0; i < operations.length && i < fieldValues.length - 1; i++) {
        const operation = operations[i];
        const nextValue = fieldValues[i + 1];

        const operationResult = this.applyOperation(result, nextValue, operation);
        if (!operationResult.success) {
          return operationResult;
        }
        result = operationResult.value;
      }

      return { success: true, value: result };
    } catch (error) {
      return {
        success: false,
        error: `Formula evaluation error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Get the value of a field from the context
   */
  private static getFieldValue(field: FieldReference, context: EvaluationContext): any {
    if (field.isVirtual && context.virtualFields) {
      // For virtual fields, we need to evaluate them first
      const virtualField = context.virtualFields.find(vf => vf.name === field.name);
      if (virtualField) {
        const result = this.evaluateFormula(virtualField.formula, context);
        return result.success ? result.value : null;
      }
    }

    return context.row[field.name];
  }

  /**
   * Apply a single operation between two values
   */
  private static applyOperation(
    leftValue: any,
    rightValue: any,
    operation: Operation
  ): EvaluationResult {
    try {
      switch (operation.type) {
        case 'add':
          return this.performArithmetic(leftValue, rightValue, (a, b) => a + b, 'addition');

        case 'subtract':
          return this.performArithmetic(leftValue, rightValue, (a, b) => a - b, 'subtraction');

        case 'multiply':
          return this.performArithmetic(leftValue, rightValue, (a, b) => a * b, 'multiplication');

        case 'divide':
          return this.performArithmetic(leftValue, rightValue, (a, b) => {
            if (b === 0) throw new Error('Division by zero');
            return a / b;
          }, 'division');

        case 'abs':
          const numValue = this.parseNumber(leftValue);
          if (numValue === null) {
            return { success: false, error: 'Absolute value requires a numeric value' };
          }
          return { success: true, value: Math.abs(numValue) };

        case 'negate':
          const negValue = this.parseNumber(leftValue);
          if (negValue === null) {
            return { success: false, error: 'Negation requires a numeric value' };
          }
          return { success: true, value: -negValue };

        case 'concat':
          const leftStr = this.parseString(leftValue);
          const rightStr = this.parseString(rightValue);
          return { success: true, value: leftStr + rightStr };

        case 'date_diff':
          return this.performDateDifference(leftValue, rightValue);

        default:
          return { success: false, error: `Unsupported operation: ${operation.type}` };
      }
    } catch (error) {
      return {
        success: false,
        error: `Operation '${operation.type}' failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Perform arithmetic operations with type conversion
   */
  private static performArithmetic(
    leftValue: any,
    rightValue: any,
    operation: (a: number, b: number) => number,
    operationName: string
  ): EvaluationResult {
    const leftNum = this.parseNumber(leftValue);
    const rightNum = this.parseNumber(rightValue);

    if (leftNum === null || rightNum === null) {
      return {
        success: false,
        error: `${operationName} requires numeric values. Got: ${leftValue} and ${rightValue}`
      };
    }

    const result = operation(leftNum, rightNum);

    if (!isFinite(result)) {
      return { success: false, error: `${operationName} resulted in invalid number: ${result}` };
    }

    return { success: true, value: result };
  }

  /**
   * Perform date difference calculation
   */
  private static performDateDifference(leftValue: any, rightValue: any): EvaluationResult {
    const leftDate = this.parseDate(leftValue);
    const rightDate = this.parseDate(rightValue);

    if (!leftDate || !rightDate) {
      return {
        success: false,
        error: `Date difference requires valid dates. Got: ${leftValue} and ${rightValue}`
      };
    }

    const diffMs = leftDate.getTime() - rightDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    return { success: true, value: diffDays };
  }

  /**
   * Parse a value as a number with various format support
   */
  private static parseNumber(value: any): number | null {
    if (value === null || value === undefined || value === '') {
      return 0;
    }

    if (typeof value === 'number') {
      return isNaN(value) ? 0 : value;
    }

    if (typeof value === 'string') {
      if (value.toUpperCase() === 'N/A') return 0;
      // Remove common formatting characters
      const cleaned = value.replace(/[,$\s%]/g, '');
      if (cleaned === '') return 0;

      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parsed;
    }

    if (typeof value === 'boolean') {
      return value ? 1 : 0;
    }

    return 0;
  }

  /**
   * Parse a value as a string
   */
  private static parseString(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }
    return String(value);
  }

  /**
   * Parse a value as a date
   */
  private static parseDate(value: any): Date | null {
    if (value instanceof Date) {
      return isNaN(value.getTime()) ? null : value;
    }

    if (typeof value === 'string') {
      const parsed = new Date(value);
      return isNaN(parsed.getTime()) ? null : parsed;
    }

    if (typeof value === 'number') {
      const parsed = new Date(value);
      return isNaN(parsed.getTime()) ? null : parsed;
    }

    return null;
  }

  /**
   * Evaluate multiple virtual fields for a dataset
   */
  static evaluateVirtualFields(
    virtualFields: VirtualField[],
    data: Record<string, any>[]
  ): { success: boolean; data?: Record<string, any>[]; errors?: string[] } {
    const errors: string[] = [];
    const enhancedData: Record<string, any>[] = [];

    // Sort virtual fields by dependencies (simple approach - fields without virtual dependencies first)
    const sortedFields = this.sortVirtualFieldsByDependencies(virtualFields);

    for (const row of data) {
      const enhancedRow = { ...row };
      const availableVirtualFields: VirtualField[] = [];

      for (const virtualField of sortedFields) {
        const context: EvaluationContext = {
          row: enhancedRow,
          virtualFields: availableVirtualFields
        };

        const result = this.evaluateFormula(virtualField.formula, context);

        if (result.success) {
          enhancedRow[virtualField.name] = result.value;
          availableVirtualFields.push(virtualField);
        } else {
          errors.push(`Row ${data.indexOf(row) + 1}, Field '${virtualField.name}': ${result.error}`);
          enhancedRow[virtualField.name] = null;
        }
      }

      enhancedData.push(enhancedRow);
    }

    return {
      success: errors.length === 0,
      data: enhancedData,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Sort virtual fields to handle dependencies
   */
  private static sortVirtualFieldsByDependencies(virtualFields: VirtualField[]): VirtualField[] {
    const sorted: VirtualField[] = [];
    const remaining = [...virtualFields];

    while (remaining.length > 0) {
      const initialLength = remaining.length;

      for (let i = remaining.length - 1; i >= 0; i--) {
        const field = remaining[i];
        const hasUnresolvedDependencies = field.formula.fields.some(
          fieldRef => fieldRef.isVirtual && !sorted.some(sf => sf.name === fieldRef.name)
        );

        if (!hasUnresolvedDependencies) {
          sorted.push(field);
          remaining.splice(i, 1);
        }
      }

      // Prevent infinite loop in case of circular dependencies
      if (remaining.length === initialLength) {
        // Add remaining fields anyway, they'll fail at runtime
        sorted.push(...remaining);
        break;
      }
    }

    return sorted;
  }

  /**
   * Preview formula evaluation on sample data
   */
  static previewFormula(
    formula: VirtualFormulaDefinition,
    sampleData: Record<string, any>[],
    virtualFields: VirtualField[] = []
  ): { success: boolean; preview?: any[]; errors?: string[] } {
    const preview: any[] = [];
    const errors: string[] = [];

    for (let i = 0; i < Math.min(sampleData.length, 5); i++) {
      const row = sampleData[i];
      const context: EvaluationContext = { row, virtualFields };

      const result = this.evaluateFormula(formula, context);

      if (result.success) {
        preview.push(result.value);
      } else {
        preview.push(null);
        errors.push(`Row ${i + 1}: ${result.error}`);
      }
    }

    return {
      success: errors.length === 0,
      preview,
      errors: errors.length > 0 ? errors : undefined
    };
  }
}
