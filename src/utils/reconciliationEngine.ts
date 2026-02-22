import { ColumnMapping, ReconciliationResult, VirtualField, TransformedData } from '@/types/reconciliation';
import { DataTransformer } from '@/utils/dataTransformation';

export interface ReconciliationConfig {
  tolerance: number;
  matchStrategy: 'exact' | 'fuzzy' | 'smart';
  dateFormat?: string;
}

export interface ReconciliationInput {
  sourceData: Record<string, any>[];
  targetData: Record<string, any>[];
  sourceVirtualFields: VirtualField[];
  targetVirtualFields: VirtualField[];
  transformations?: import('@/types/transformations').TransformationPipeline[];
  mappings: ColumnMapping[];
  config: ReconciliationConfig;
}

export class ReconciliationEngine {
  /**
   * Perform reconciliation with virtual fields support
   */
  static async reconcile(input: ReconciliationInput): Promise<ReconciliationResult[]> {
    const {
      sourceData,
      targetData,
      sourceVirtualFields,
      targetVirtualFields,
      transformations = [],
      mappings,
      config
    } = input;

    const sourceTransformations = transformations.filter(t => t.sourceFile === 'source');
    const transformedSource = DataTransformer.transformDataWithVirtualFields(
      sourceData,
      sourceVirtualFields,
      mappings.filter(m => m.sourceColumn),
      true,
      sourceTransformations
    );

    const targetTransformations = transformations.filter(t => t.sourceFile === 'target');
    const transformedTarget = DataTransformer.transformDataWithVirtualFields(
      targetData,
      targetVirtualFields,
      mappings.filter(m => m.targetColumn),
      false,
      targetTransformations
    );

    // Perform matching based on mappings
    const results: ReconciliationResult[] = [];

    for (const sourceItem of transformedSource) {
      const matches = this.findMatches(
        sourceItem,
        transformedTarget,
        mappings,
        config
      );

      if (matches.length === 0) {
        // Unmatched source item
        results.push({
          id: this.generateId(),
          sourceRow: sourceItem.transformedRow,
          targetRow: null,
          sourceLine: sourceItem.transformedRow.__line,
          targetLine: undefined,
          status: 'unmatched-source'
        });
      } else {
        // Process matches
        for (const match of matches) {
          const discrepancies = this.calculateDiscrepancies(
            sourceItem.transformedRow,
            match.targetItem.transformedRow,
            mappings,
            config
          );

          results.push({
            id: this.generateId(),
            sourceRow: sourceItem.transformedRow,
            targetRow: match.targetItem.transformedRow,
            sourceLine: sourceItem.transformedRow.__line,
            targetLine: match.targetItem.transformedRow.__line,
            confidence: match.confidence,
            discrepancies,
            status: discrepancies.length === 0 ? 'matched' : 'discrepancy'
          });
        }
      }
    }

    // Find unmatched target items
    const matchedTargetIds = new Set(
      results
        .filter(r => r.targetRow)
        .map(r => this.getRowId(r.targetRow!))
    );

    for (const targetItem of transformedTarget) {
      const targetId = this.getRowId(targetItem.transformedRow);
      if (!matchedTargetIds.has(targetId)) {
        results.push({
          id: this.generateId(),
          sourceRow: null,
          targetRow: targetItem.transformedRow,
          sourceLine: undefined,
          targetLine: targetItem.transformedRow.__line,
          status: 'unmatched-target'
        });
      }
    }

    return results;
  }

  /**
   * Find matching target items for a source item
   */
  private static findMatches(
    sourceItem: TransformedData,
    targetItems: TransformedData[],
    mappings: ColumnMapping[],
    config: ReconciliationConfig
  ): Array<{ targetItem: TransformedData; confidence: number }> {
    const matches: Array<{ targetItem: TransformedData; confidence: number }> = [];

    for (const targetItem of targetItems) {
      const confidence = this.calculateMatchConfidence(
        sourceItem.transformedRow,
        targetItem.transformedRow,
        mappings,
        config
      );

      if (confidence > 0.3) { // Lower threshold for better matching
        matches.push({ targetItem, confidence });
      }
    }

    // Sort by confidence descending
    matches.sort((a, b) => b.confidence - a.confidence);

    // Return top matches based on strategy
    if (config.matchStrategy === 'exact') {
      return matches.filter(m => m.confidence > 0.8);
    } else if (config.matchStrategy === 'fuzzy') {
      return matches.slice(0, 3); // Top 3 matches
    } else {
      // Smart strategy - return exact matches or best fuzzy match
      const exactMatches = matches.filter(m => m.confidence > 0.8);
      return exactMatches.length > 0 ? exactMatches : matches.slice(0, 1);
    }
  }

  /**
   * Calculate match confidence between two rows
   */
  private static calculateMatchConfidence(
    sourceRow: Record<string, any>,
    targetRow: Record<string, any>,
    mappings: ColumnMapping[],
    config: ReconciliationConfig
  ): number {
    let totalWeight = 0;
    let matchedWeight = 0;

    console.log('Calculating confidence for:', {
      sourceRow: Object.keys(sourceRow).slice(0, 3).reduce((acc, key) => ({ ...acc, [key]: sourceRow[key] }), {}),
      targetRow: Object.keys(targetRow).slice(0, 3).reduce((acc, key) => ({ ...acc, [key]: targetRow[key] }), {}),
      mappings: mappings.map(m => ({ source: m.sourceColumn, target: m.targetColumn }))
    });

    for (const mapping of mappings) {
      if (!mapping.sourceColumn || !mapping.targetColumn) continue;

      const sourceValue = Array.isArray(mapping.sourceColumn)
        ? mapping.sourceColumn.map(col => sourceRow[col]).join(' ')
        : sourceRow[mapping.sourceColumn];
      const targetValue = targetRow[mapping.targetColumn];
      const weight = this.getFieldWeight(Array.isArray(mapping.sourceColumn) ? mapping.sourceColumn[0] : mapping.sourceColumn);

      totalWeight += weight;

      const matches = this.valuesMatch(sourceValue, targetValue, config);
      console.log(`Field ${mapping.sourceColumn} -> ${mapping.targetColumn}: ${sourceValue} vs ${targetValue} = ${matches}`);

      if (matches) {
        matchedWeight += weight;
      }
    }

    const confidence = totalWeight > 0 ? matchedWeight / totalWeight : 0;
    console.log(`Final confidence: ${confidence} (${matchedWeight}/${totalWeight})`);

    return confidence;
  }

  /**
   * Check if two values match based on configuration
   */
  private static valuesMatch(
    value1: any,
    value2: any,
    config: ReconciliationConfig
  ): boolean {
    if (value1 === value2) return true;

    // Handle numeric values with tolerance
    if (this.isNumeric(value1) && this.isNumeric(value2)) {
      const num1 = this.parseNumeric(value1);
      const num2 = this.parseNumeric(value2);
      return Math.abs(num1 - num2) <= config.tolerance;
    }

    // Handle string values (case-insensitive)
    if (typeof value1 === 'string' && typeof value2 === 'string') {
      return value1.toLowerCase().trim() === value2.toLowerCase().trim();
    }

    // Handle dates
    if (this.isDate(value1) && this.isDate(value2)) {
      const date1 = this.parseDate(value1);
      const date2 = this.parseDate(value2);
      return date1.getTime() === date2.getTime();
    }

    return false;
  }

  /**
   * Check if value is numeric
   */
  private static isNumeric(value: any): boolean {
    if (typeof value === 'number') return !isNaN(value);
    if (typeof value === 'string') {
      const cleaned = value.replace(/[,$\s]/g, '');
      return !isNaN(parseFloat(cleaned)) && isFinite(parseFloat(cleaned));
    }
    return false;
  }

  /**
   * Parse numeric value
   */
  private static parseNumeric(value: any): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const cleaned = value.replace(/[,$\s]/g, '');
      return parseFloat(cleaned);
    }
    return 0;
  }

  /**
   * Calculate discrepancies between matched rows
   */
  private static calculateDiscrepancies(
    sourceRow: Record<string, any>,
    targetRow: Record<string, any>,
    mappings: ColumnMapping[],
    config: ReconciliationConfig
  ): string[] {
    const discrepancies: string[] = [];

    for (const mapping of mappings) {
      if (!mapping.sourceColumn || !mapping.targetColumn) continue;

      const sourceValue = Array.isArray(mapping.sourceColumn)
        ? mapping.sourceColumn.map(col => sourceRow[col]).join(' ')
        : sourceRow[mapping.sourceColumn];
      const targetValue = targetRow[mapping.targetColumn];

      // Use the smart comparison logic from valuesMatch, but inverted
      let areDifferent = false;

      if (sourceValue instanceof Date && targetValue instanceof Date) {
        areDifferent = sourceValue.getTime() !== targetValue.getTime();
      } else if (this.isNumeric(sourceValue) && this.isNumeric(targetValue)) {
        const num1 = this.parseNumeric(sourceValue);
        const num2 = this.parseNumeric(targetValue);
        areDifferent = Math.abs(num1 - num2) > (config.tolerance || 0.000001);
      } else if (typeof sourceValue === 'string' && typeof targetValue === 'string') {
        areDifferent = sourceValue.toLowerCase().trim() !== targetValue.toLowerCase().trim();
      } else {
        // Fallback for mixed types or non-string/numeric/date
        areDifferent = String(sourceValue).toLowerCase().trim() !== String(targetValue).toLowerCase().trim();
      }

      if (areDifferent) {
        const sVal = sourceValue instanceof Date ? sourceValue.toISOString() : sourceValue;
        const tVal = targetValue instanceof Date ? targetValue.toISOString() : targetValue;
        discrepancies.push(`${mapping.targetColumn}: ${sVal} ≠ ${tVal}`);
      }
    }

    return discrepancies;
  }

  /**
   * Extract amount value from row based on mappings
   */
  private static extractAmount(
    row: Record<string, any>,
    mappings: ColumnMapping[]
  ): number {
    // Look for amount-related columns
    const amountColumns = ['amount', 'value', 'total', 'debit_amount', 'credit_amount'];

    for (const col of amountColumns) {
      if (row[col] !== undefined && typeof row[col] === 'number') {
        return row[col];
      }
    }

    // Try to find from mappings
    for (const mapping of mappings) {
      const sourceCol = mapping.sourceColumn;
      const targetCol = mapping.targetColumn;

      if (sourceCol && typeof sourceCol === 'string' && amountColumns.some(ac => sourceCol.toLowerCase().includes(ac))) {
        const value = typeof sourceCol === 'string' ? row[sourceCol] : 0;
        if (typeof value === 'number') return value;
      }

      if (targetCol && amountColumns.some(ac => targetCol.toLowerCase().includes(ac))) {
        const value = row[targetCol];
        if (typeof value === 'number') return value;
      }
    }

    return 0;
  }

  /**
   * Get field weight for confidence calculation
   */
  private static getFieldWeight(fieldName: string | string[]): number {
    if (Array.isArray(fieldName)) {
      fieldName = fieldName[0]; // Use first field for weight calculation
    }
    const lowerField = fieldName.toLowerCase();

    // High importance fields
    if (lowerField.includes('id') || lowerField.includes('reference')) return 3;
    if (lowerField.includes('amount') || lowerField.includes('value')) return 3;

    // Medium importance fields
    if (lowerField.includes('date')) return 2;
    if (lowerField.includes('description') || lowerField.includes('details')) return 2;

    // Default weight
    return 1;
  }

  /**
   * Check if value is a date
   */
  private static isDate(value: any): boolean {
    if (value instanceof Date) return true;
    if (typeof value === 'string') {
      if (value.trim() === '') return false;
      const str = value.trim();

      const dashMatch = str.match(/^(\d{1,2})-(\d{1,2})-(\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
      if (dashMatch) {
        const [_, d, m, yStr, h, min, s] = dashMatch;
        let y = Number(yStr);
        if (y < 100) y += 2000;
        const parsedObj = new Date(y, Number(m) - 1, Number(d), Number(h || 0), Number(min || 0), Number(s || 0));
        return !isNaN(parsedObj.getTime());
      }

      const slashMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
      if (slashMatch) {
        const [_, m, d, yStr, h, min, s] = slashMatch;
        let y = Number(yStr);
        if (y < 100) y += 2000;
        const parsedObj = new Date(y, Number(m) - 1, Number(d), Number(h || 0), Number(min || 0), Number(s || 0));
        return !isNaN(parsedObj.getTime());
      }

      const date = new Date(str);
      return !isNaN(date.getTime());
    }
    return false;
  }

  /**
   * Parse a date value robustly
   */
  private static parseDate(value: any): Date {
    if (value instanceof Date) return value;
    if (typeof value === 'string') {
      const str = value.trim();

      const dashMatch = str.match(/^(\d{1,2})-(\d{1,2})-(\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
      if (dashMatch) {
        const [_, d, m, yStr, h, min, s] = dashMatch;
        let y = Number(yStr);
        if (y < 100) y += 2000;
        return new Date(y, Number(m) - 1, Number(d), Number(h || 0), Number(min || 0), Number(s || 0));
      }

      const slashMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
      if (slashMatch) {
        const [_, m, d, yStr, h, min, s] = slashMatch;
        let y = Number(yStr);
        if (y < 100) y += 2000;
        return new Date(y, Number(m) - 1, Number(d), Number(h || 0), Number(min || 0), Number(s || 0));
      }
      return new Date(str);
    }
    return new Date(NaN);
  }

  /**
   * Generate unique ID for reconciliation result
   */
  private static generateId(): string {
    return `recon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get unique identifier for a row
   */
  private static getRowId(row: Record<string, any>): string {
    // Try to find a unique identifier
    const idFields = ['id', 'transaction_id', 'reference', 'ref_number'];

    for (const field of idFields) {
      const value = row[field] || row[field.toUpperCase()] || row[field.toLowerCase()];
      if (value !== undefined) {
        return String(value);
      }
    }

    // Fallback to hash of row content
    return this.hashRow(row);
  }

  /**
   * Create hash of row for identification
   */
  private static hashRow(row: Record<string, any>): string {
    const str = JSON.stringify(row, Object.keys(row).sort());
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }
}
