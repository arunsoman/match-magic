import { ColumnMapping, FormulaMapping, TransformedData, VirtualField } from '@/types/reconciliation';
import { TransformationPipeline } from '@/types/transformations';
import { ExpressionEvaluator } from '@/utils/expressionEvaluator';
import { TransformationEngine } from '@/utils/transformationEngine';

export class DataTransformer {
  /**
   * Transform data with virtual fields and column mappings
   */
  static transformDataWithVirtualFields(
    data: Record<string, any>[],
    virtualFields: VirtualField[],
    mappings: ColumnMapping[],
    isSource: boolean = true,
    transformations: TransformationPipeline[] = []
  ): TransformedData[] {
    // First, compute virtual fields
    let currentData = this.computeVirtualFields(data, virtualFields);

    // Then apply pipeline transformations
    if (transformations && transformations.length > 0) {
      currentData = currentData.map(row => {
        const newRow = { ...row };
        transformations.forEach(pipeline => {
          if (newRow[pipeline.columnId] !== undefined) {
            const result = TransformationEngine.executePipeline(newRow[pipeline.columnId], pipeline);
            if (result.success) {
              const targetField = pipeline.outputColumn || pipeline.columnId;
              newRow[targetField] = result.transformedValue;
            }
          }
        });
        return newRow;
      });
    }

    // Then apply existing formula mapping transformations
    return this.transformData(currentData, mappings, isSource);
  }

  /**
   * Compute virtual fields for dataset
   */
  static computeVirtualFields(
    data: Record<string, any>[],
    virtualFields: VirtualField[]
  ): Record<string, any>[] {
    if (virtualFields.length === 0) return data;

    const result = ExpressionEvaluator.evaluateVirtualFields(virtualFields, data);

    if (result.success && result.data) {
      return result.data;
    } else {
      console.warn('Virtual field computation failed:', result.errors);
      return data;
    }
  }

  /**
   * Transform data based on column mappings with formulas
   */
  static transformData(
    data: Record<string, any>[],
    mappings: ColumnMapping[],
    isSource: boolean = true
  ): TransformedData[] {
    return data.map(row => {
      const transformedRow = { ...row };
      const appliedTransformations: string[] = [];

      mappings.forEach(mapping => {
        if (mapping.matchType === 'formula' && mapping.formula) {
          const transformation = this.applyFormula(row, mapping, isSource);
          if (transformation) {
            Object.assign(transformedRow, transformation.data);
            appliedTransformations.push(transformation.description);
          }
        }
      });

      return {
        originalRow: row,
        transformedRow,
        appliedTransformations
      };
    });
  }

  /**
   * Apply formula transformation to a single row
   */
  private static applyFormula(
    row: Record<string, any>,
    mapping: ColumnMapping,
    isSource: boolean
  ): { data: Record<string, any>; description: string } | null {
    if (!mapping.formula) return null;

    const { formula } = mapping;

    switch (formula.type) {
      case 'debit_credit_to_amount':
        return this.debitCreditToAmount(row, mapping, isSource);

      case 'amount_to_debit_credit':
        return this.amountToDebitCredit(row, mapping, isSource);

      case 'custom':
        return this.customFormula(row, mapping, isSource);

      default:
        return null;
    }
  }

  /**
   * Convert debit/credit columns to single amount column
   */
  private static debitCreditToAmount(
    row: Record<string, any>,
    mapping: ColumnMapping,
    isSource: boolean
  ): { data: Record<string, any>; description: string } | null {
    const { formula } = mapping;
    if (!formula?.sourceColumns) return null;

    const debitCol = formula.sourceColumns.debit;
    const creditCol = formula.sourceColumns.credit;
    const targetCol = mapping.targetColumn;

    if (!debitCol || !creditCol || !targetCol) return null;

    const debitValue = this.parseNumber(row[debitCol]) || 0;
    const creditValue = this.parseNumber(row[creditCol]) || 0;

    // Amount = Credit - Debit (positive for credit, negative for debit)
    const amount = creditValue - debitValue;

    return {
      data: { [targetCol]: amount },
      description: `Converted ${debitCol}(${debitValue}) and ${creditCol}(${creditValue}) to ${targetCol}(${amount})`
    };
  }

  /**
   * Convert single amount column to debit/credit columns
   */
  private static amountToDebitCredit(
    row: Record<string, any>,
    mapping: ColumnMapping,
    isSource: boolean
  ): { data: Record<string, any>; description: string } | null {
    const { formula } = mapping;
    if (!formula?.sourceColumns || !formula?.targetColumns) return null;

    const amountCol = formula.sourceColumns.amount;
    const targetDebitCol = formula.targetColumns.debit;
    const targetCreditCol = formula.targetColumns.credit;

    if (!amountCol || !targetDebitCol || !targetCreditCol) return null;

    const amount = this.parseNumber(row[amountCol]) || 0;

    // If amount is positive, it's a credit; if negative, it's a debit
    const debit = amount < 0 ? Math.abs(amount) : 0;
    const credit = amount > 0 ? amount : 0;

    return {
      data: {
        [targetDebitCol]: debit,
        [targetCreditCol]: credit
      },
      description: `Converted ${amountCol}(${amount}) to ${targetDebitCol}(${debit}) and ${targetCreditCol}(${credit})`
    };
  }

  /**
   * Apply custom formula (placeholder for future enhancement)
   */
  private static customFormula(
    row: Record<string, any>,
    mapping: ColumnMapping,
    isSource: boolean
  ): { data: Record<string, any>; description: string } | null {
    // Placeholder for custom formula implementation
    return null;
  }

  /**
   * Parse string to number, handling different formats
   */
  private static parseNumber(value: any): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      // Remove common formatting characters
      const cleaned = value.replace(/[,$\s]/g, '');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }

  /**
   * Get suggested formula mappings based on column names
   */
  static suggestFormulaMappings(
    sourceColumns: string[],
    targetColumns: string[]
  ): Partial<ColumnMapping>[] {
    const suggestions: Partial<ColumnMapping>[] = [];

    // Check for debit/credit to amount scenario
    const sourceHasDebitCredit = this.hasDebitCreditColumns(sourceColumns);
    const targetHasAmount = this.hasAmountColumn(targetColumns);

    if (sourceHasDebitCredit && targetHasAmount) {
      suggestions.push({
        id: 'suggested-debit-credit-to-amount',
        matchType: 'formula',
        formula: {
          type: 'debit_credit_to_amount',
          sourceColumns: {
            debit: this.findColumn(sourceColumns, ['debit', 'debit_amount']),
            credit: this.findColumn(sourceColumns, ['credit', 'credit_amount'])
          }
        },
        targetColumn: this.findColumn(targetColumns, ['amount', 'value', 'total']) || ''
      });
    }

    // Check for amount to debit/credit scenario
    const sourceHasAmount = this.hasAmountColumn(sourceColumns);
    const targetHasDebitCredit = this.hasDebitCreditColumns(targetColumns);

    if (sourceHasAmount && targetHasDebitCredit) {
      suggestions.push({
        id: 'suggested-amount-to-debit-credit',
        matchType: 'formula',
        formula: {
          type: 'amount_to_debit_credit',
          sourceColumns: {
            amount: this.findColumn(sourceColumns, ['amount', 'value', 'total'])
          },
          targetColumns: {
            debit: this.findColumn(targetColumns, ['debit', 'debit_amount']),
            credit: this.findColumn(targetColumns, ['credit', 'credit_amount'])
          }
        },
        targetColumn: 'calculated'
      });
    }

    return suggestions;
  }

  private static hasDebitCreditColumns(columns: string[]): boolean {
    const debitExists = this.findColumn(columns, ['debit', 'debit_amount']) !== null;
    const creditExists = this.findColumn(columns, ['credit', 'credit_amount']) !== null;
    return debitExists && creditExists;
  }

  private static hasAmountColumn(columns: string[]): boolean {
    return this.findColumn(columns, ['amount', 'value', 'total']) !== null;
  }

  private static findColumn(columns: string[], keywords: string[]): string | null {
    for (const keyword of keywords) {
      const found = columns.find(col =>
        col.toLowerCase().includes(keyword.toLowerCase())
      );
      if (found) return found;
    }
    return null;
  }
}