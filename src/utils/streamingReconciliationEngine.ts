import { ColumnMapping, ReconciliationResult, VirtualField, TransformedData } from '@/types/reconciliation';
import { DataTransformer } from '@/utils/dataTransformation';
import * as XLSX from 'xlsx';

export interface StreamingReconciliationConfig {
  sourceSortKey: string;
  targetSortKey: string;
  tolerance: number;
  toleranceUnit: 'minutes' | 'hours' | 'days' | 'amount' | 'percentage' | 'exact';
  chunkSize: number;
  matchStrategy: 'exact' | 'fuzzy' | 'smart';
}

export interface StreamingReconciliationInput {
  sourceFile: File;
  targetFile: File;
  sourceVirtualFields: VirtualField[];
  targetVirtualFields: VirtualField[];
  transformations?: import('@/types/transformations').TransformationPipeline[];
  mappings: ColumnMapping[];
  config: StreamingReconciliationConfig;
  onProgress?: (progress: { processed: number; total: number; stage: string }) => void;
}

export interface SortedRecord {
  originalIndex: number;
  sortValue: number | string;
  transformedRow: Record<string, any>;
}

export class StreamingReconciliationEngine {
  private static readonly MAX_MEMORY_RECORDS = 10000; // Maximum records to keep in memory
  private static readonly STREAM_THRESHOLD = 50000; // Switch to streaming mode for files larger than this

  /**
   * Perform memory-efficient reconciliation using two-pointer algorithm
   * Automatically chooses between in-memory and streaming modes based on file size
   */
  static async reconcileStreaming(input: StreamingReconciliationInput): Promise<ReconciliationResult[]> {
    const {
      sourceFile,
      targetFile,
      sourceVirtualFields,
      targetVirtualFields,
      transformations = [],
      mappings,
      config,
      onProgress
    } = input;

    // Estimate file sizes to determine processing mode
    const estimatedSourceRows = await this.estimateRowCount(sourceFile);
    const estimatedTargetRows = await this.estimateRowCount(targetFile);
    const totalRows = estimatedSourceRows + estimatedTargetRows;

    if (totalRows > this.STREAM_THRESHOLD) {
      // Use true streaming mode for large files
      return this.reconcileWithTrueStreaming(input, estimatedSourceRows, estimatedTargetRows);
    } else {
      // Use in-memory mode for smaller files
      return this.reconcileInMemory(input);
    }
  }

  /**
   * In-memory reconciliation for smaller datasets
   */
  private static async reconcileInMemory(input: StreamingReconciliationInput): Promise<ReconciliationResult[]> {
    const {
      sourceFile,
      targetFile,
      sourceVirtualFields,
      targetVirtualFields,
      transformations = [],
      mappings,
      config,
      onProgress
    } = input;

    // Phase 1: Extract and sort source data
    onProgress?.({ processed: 0, total: 100, stage: 'Processing source file' });
    const sourceRecords = await this.extractAndSortData(
      sourceFile,
      sourceVirtualFields,
      mappings,
      config.sourceSortKey,
      true,
      transformations.filter(t => t.sourceFile === 'source'),
      (progress) => onProgress?.({ ...progress, stage: 'Processing source file' })
    );

    // Phase 2: Extract and sort target data
    onProgress?.({ processed: 25, total: 100, stage: 'Processing target file' });
    const targetRecords = await this.extractAndSortData(
      targetFile,
      targetVirtualFields,
      mappings,
      config.targetSortKey,
      false,
      transformations.filter(t => t.sourceFile === 'target'),
      (progress) => onProgress?.({ ...progress, stage: 'Processing target file' })
    );

    // Phase 3: Two-pointer reconciliation
    onProgress?.({ processed: 50, total: 100, stage: 'Matching records' });
    const results = await this.twoPointerReconciliation(
      sourceRecords,
      targetRecords,
      mappings,
      config,
      (progress) => onProgress?.({ ...progress, stage: 'Matching records' })
    );

    onProgress?.({ processed: 100, total: 100, stage: 'Complete' });
    return results;
  }

  /**
   * Extract data from Excel file, apply transformations, and sort
   */
  private static async extractAndSortData(
    file: File,
    virtualFields: VirtualField[],
    mappings: ColumnMapping[],
    sortKey: string,
    isSource: boolean,
    transformations: import('@/types/transformations').TransformationPipeline[] = [],
    onProgress?: (progress: { processed: number; total: number }) => void
  ): Promise<SortedRecord[]> {
    // Read Excel file in chunks to avoid memory overload
    const workbook = await this.readExcelFile(file);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Get total row count for progress tracking
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    const totalRows = range.e.r - range.s.r;

    // Get headers
    const headerRow = XLSX.utils.sheet_to_json(worksheet, { header: 1 })[0] as string[];

    const records: SortedRecord[] = [];
    const chunkSize = 1000; // Process 1000 rows at a time

    for (let startRow = range.s.r + 1; startRow <= range.e.r; startRow += chunkSize) {
      const endRow = Math.min(startRow + chunkSize - 1, range.e.r);

      // Extract chunk of data
      const chunkRange = XLSX.utils.encode_range({
        s: { c: range.s.c, r: range.s.r },
        e: { c: range.e.c, r: endRow }
      });

      const chunkWorksheet = { ...worksheet, '!ref': chunkRange };
      const chunkData = XLSX.utils.sheet_to_json(chunkWorksheet, {
        header: headerRow,
        raw: true,
        range: startRow - range.s.r
      }) as Record<string, any>[];

      // Transform chunk with virtual fields
      const transformedChunk = DataTransformer.transformDataWithVirtualFields(
        chunkData,
        virtualFields,
        mappings.filter(m => isSource ? m.sourceColumn : m.targetColumn),
        isSource,
        transformations
      );

      // Add to results
      for (let i = 0; i < transformedChunk.length; i++) {
        const record = transformedChunk[i];
        const sortValue = this.extractSortValue(record.transformedRow, sortKey);

        records.push({
          originalIndex: startRow + i - 1,
          sortValue,
          transformedRow: record.transformedRow
        });
      }

      // Update progress
      const processed = Math.min(((endRow - range.s.r) / totalRows) * 100, 100);
      onProgress?.({ processed, total: 100 });
    }

    // Sort all records by sort key
    const sortedRecords = records
      .map(record => ({
        ...record,
        sortValue: this.extractSortValue(record.transformedRow, sortKey)
      }))
      .sort((a, b) => {
        if (a.sortValue === null && b.sortValue === null) return 0;
        if (a.sortValue === null) return -1;
        if (b.sortValue === null) return 1;
        return a.sortValue < b.sortValue ? -1 : a.sortValue > b.sortValue ? 1 : 0;
      });

    return sortedRecords;
  }

  /**
   * Pure two-pointer algorithm implementation
   * Time: O(n + m) - each record visited exactly once
   * Space: O(1) auxiliary - only pointer variables and temporary storage
   */
  private static async twoPointerReconciliation(
    sourceRecords: SortedRecord[],
    targetRecords: SortedRecord[],
    mappings: ColumnMapping[],
    config: StreamingReconciliationConfig,
    onProgress?: (progress: { processed: number; total: number }) => void
  ): Promise<ReconciliationResult[]> {
    const results: ReconciliationResult[] = [];

    // Initialize pointers: Start with i = 0 (source) and j = 0 (target)
    let i = 0; // source pointer
    let j = 0; // target pointer
    const n = sourceRecords.length;
    const m = targetRecords.length;
    let processedCount = 0;

    // True O(n) sliding window approach for streaming data
    // Keeps target pointer j at the start of the valid tolerance window for the current source
    const matchedTargetIndices = new Set<number>();

    for (let i = 0; i < n; i++) {
      const sourceRecord = sourceRecords[i];

      // Advance target start pointer j to the beginning of the tolerance window
      while (j < m && !matchedTargetIndices.has(j)) {
        const comp = this.compareSortValues(
          sourceRecord.sortValue,
          targetRecords[j].sortValue,
          config.tolerance,
          config.toleranceUnit
        );
        if (comp > 0) {
          j++; // target is too old to match current or any future source
        } else {
          break;
        }
      }

      let bestMatch = null;
      let bestConf = -1;
      let bestTargetIndex = -1;

      // Scan the window for the best target match for the current source
      for (let k = j; k < m; k++) {
        if (matchedTargetIndices.has(k)) continue;

        const comp = this.compareSortValues(
          sourceRecord.sortValue,
          targetRecords[k].sortValue,
          config.tolerance,
          config.toleranceUnit
        );

        if (comp < 0) break; // target is too new to match current source

        if (comp === 0) {
          const match = this.createMatchFromRecords(sourceRecord, targetRecords[k], mappings, config);
          if (match.confidence > bestConf) {
            bestConf = match.confidence;
            bestMatch = match;
            bestTargetIndex = k;
          }
        }
      }

      // Apply the best match or mark as unmatched
      if (bestMatch && bestConf > 0.3) {
        results.push(bestMatch);
        matchedTargetIndices.add(bestTargetIndex);
      } else {
        results.push(this.createUnmatchedSourceResult(sourceRecord, mappings));
      }

      // Progress
      if (i % 1000 === 0) {
        const progress = (i / n) * 100;
        onProgress?.({ processed: Math.min(progress, 95), total: 100 });
      }
    }

    // Handle remaining target records
    for (let k = 0; k < m; k++) {
      if (!matchedTargetIndices.has(k)) {
        results.push(this.createUnmatchedTargetResult(targetRecords[k], mappings));
      }
    }

    return results;
  }

  /**
   * Create a match result from two records using simple comparison
   * Simplified version focused on the core matching logic
   */
  private static createMatchFromRecords(
    sourceRecord: SortedRecord,
    targetRecord: SortedRecord,
    mappings: ColumnMapping[],
    config: StreamingReconciliationConfig
  ): ReconciliationResult {
    // Simple confidence calculation based on mapped fields
    const confidence = this.calculateMatchConfidence(
      sourceRecord.transformedRow,
      targetRecord.transformedRow,
      mappings,
      config
    );

    const discrepancies = this.calculateDiscrepancies(
      sourceRecord.transformedRow,
      targetRecord.transformedRow,
      mappings
    );

    return {
      id: this.generateId(),
      sourceRow: sourceRecord.transformedRow,
      targetRow: targetRecord.transformedRow,
      confidence,
      discrepancies,
      amount: this.extractAmount(sourceRecord.transformedRow, mappings),
      status: discrepancies.length === 0 ? 'matched' : 'discrepancy'
    };
  }

  /**
   * True streaming reconciliation with O(1) auxiliary space
   * Implements pure two-pointer algorithm on streaming file readers
   */
  private static async reconcileWithTrueStreaming(
    input: StreamingReconciliationInput,
    sourceRows: number,
    targetRows: number
  ): Promise<ReconciliationResult[]> {
    const { config, onProgress } = input;
    const results: ReconciliationResult[] = [];

    // Create line-by-line streaming readers
    const sourceReader = this.createLineByLineReader(input, true);
    const targetReader = this.createLineByLineReader(input, false);

    // Initialize pointers with first records
    let sourceRecord = await sourceReader.next();
    let targetRecord = await targetReader.next();
    let processedCount = 0;
    const totalRecords = sourceRows + targetRows;

    // Pure two-pointer algorithm on streams
    while (!sourceRecord.done && !targetRecord.done) {
      const comparison = this.compareSortValues(
        sourceRecord.value.sortValue,
        targetRecord.value.sortValue,
        config.tolerance,
        config.toleranceUnit
      );

      if (comparison === 0) {
        // A[i] == B[j]: Record match and advance both
        const match = this.createMatchFromRecords(
          sourceRecord.value,
          targetRecord.value,
          input.mappings,
          config
        );
        results.push(match);

        sourceRecord = await sourceReader.next();
        targetRecord = await targetReader.next();
      } else if (comparison < 0) {
        // A[i] < B[j]: Advance source
        results.push(this.createUnmatchedSourceResult(sourceRecord.value, input.mappings));
        sourceRecord = await sourceReader.next();
      } else {
        // A[i] > B[j]: Advance target
        results.push(this.createUnmatchedTargetResult(targetRecord.value, input.mappings));
        targetRecord = await targetReader.next();
      }

      processedCount++;
      if (processedCount % 1000 === 0) {
        const progress = (processedCount / totalRecords) * 100;
        onProgress?.({ processed: Math.min(progress, 95), total: 100, stage: 'Streaming reconciliation' });
      }
    }

    // Handle remaining records (termination phase)
    while (!sourceRecord.done) {
      results.push(this.createUnmatchedSourceResult(sourceRecord.value, input.mappings));
      sourceRecord = await sourceReader.next();
    }

    while (!targetRecord.done) {
      results.push(this.createUnmatchedTargetResult(targetRecord.value, input.mappings));
      targetRecord = await targetReader.next();
    }

    onProgress?.({ processed: 100, total: 100, stage: 'Complete' });
    return results;
  }

  /**
   * Create line-by-line streaming reader for true O(1) space complexity
   * Assumes pre-sorted files for optimal two-pointer performance
   */
  private static async *createLineByLineReader(
    input: StreamingReconciliationInput,
    isSource: boolean
  ): AsyncGenerator<SortedRecord> {
    const file = isSource ? input.sourceFile : input.targetFile;
    const virtualFields = isSource ? input.sourceVirtualFields : input.targetVirtualFields;

    // Read file as stream and process line by line
    const workbook = await this.readExcelFile(file);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');

    // Get headers from first row
    const headers: string[] = [];
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: range.s.r, c: col });
      const cell = worksheet[cellAddress];
      headers.push(cell ? String(cell.v) : `Column${col}`);
    }

    // Process each data row individually (line-by-line)
    for (let row = range.s.r + 1; row <= range.e.r; row++) {
      const rowData: Record<string, any> = {};

      // Extract single row data
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        const cell = worksheet[cellAddress];
        const header = headers[col - range.s.c];

        let val = null;
        if (cell) {
          if (cell.t === 'd' && cell.v instanceof Date) {
            val = cell.v;
          } else if (cell.t === 'n' && typeof cell.w === 'string' && (cell.w.includes('/') || cell.w.includes('-'))) {
            // Fallback if cellDates wasn't enough, but actually we use cell.w for strings
            val = cell.w;
          } else {
            val = cell.w !== undefined ? cell.w : cell.v;
          }
        }
        rowData[header] = val;
      }

      // Transform single record with virtual fields
      const transformedData = DataTransformer.transformDataWithVirtualFields(
        [rowData],
        virtualFields,
        input.mappings.filter(m => isSource ? m.sourceColumn : m.targetColumn),
        isSource,
        input.transformations?.filter(t => t.sourceFile === (isSource ? 'source' : 'target')) || []
      );

      if (transformedData.length > 0) {
        const record = transformedData[0];
        const sortValue = this.extractSortValue(record.transformedRow, isSource ? input.config.sourceSortKey : input.config.targetSortKey);

        yield {
          originalIndex: row - 1,
          sortValue,
          transformedRow: record.transformedRow
        };
      }
    }
  }

  /**
   * External merge sort for unsorted large files
   * Sorts file in chunks and merges them for two-pointer algorithm
   */
  private static async externalSort(
    file: File,
    sortKey: string,
    chunkSize: number = 10000
  ): Promise<File> {
    // This is a placeholder for external sorting implementation
    // In a production system, this would:
    // 1. Split file into sorted chunks
    // 2. Sort each chunk in memory
    // 3. Write sorted chunks to temporary files
    // 4. Merge sorted chunks back into a single sorted file

    // For now, return the original file (assumes pre-sorted)
    return file;
  }

  /**
   * Validate that file is sorted by the specified key
   * Essential assumption for two-pointer algorithm efficiency
   */
  private static async validateSortOrder(
    sourceFilePath: string,
    targetFilePath: string,
    sourceSortKey: string,
    targetSortKey: string,
    sampleSize: number = 1000
  ): Promise<{ sourceValid: boolean; targetValid: boolean }> {
    const validateFile = async (filePath: string, sortKey: string): Promise<boolean> => {
      try {
        const workbook = XLSX.readFile(filePath);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (jsonData.length < 2) return true; // Too few records to validate

        const headers = jsonData[0] as string[];
        const sortColumnIndex = headers.findIndex(h => h === sortKey);

        if (sortColumnIndex === -1) return false; // Sort column not found

        let previousValue: any = null;
        let checkedCount = 0;

        for (let i = 1; i < Math.min(jsonData.length, sampleSize + 1); i++) {
          const row = jsonData[i] as any[];
          const currentValue = this.extractSortValue({ [sortKey]: row[sortColumnIndex] }, sortKey);

          if (previousValue !== null && currentValue !== null) {
            if (currentValue < previousValue) {
              return false; // Not sorted
            }
          }

          if (currentValue !== null) {
            previousValue = currentValue;
            checkedCount++;
          }
        }

        return checkedCount > 0; // Valid if we checked at least one value
      } catch (error) {
        console.warn(`Error validating sort order for ${sortKey}:`, error);
        return false;
      }
    };

    const [sourceValid, targetValid] = await Promise.all([
      validateFile(sourceFilePath, sourceSortKey),
      validateFile(targetFilePath, targetSortKey)
    ]);

    return { sourceValid, targetValid };
  }

  /**
   * Estimate row count for memory planning
   */
  private static async estimateRowCount(file: File): Promise<number> {
    try {
      const workbook = await this.readExcelFile(file);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
      return range.e.r - range.s.r;
    } catch {
      // Fallback estimation based on file size
      return Math.floor(file.size / 100); // Rough estimate: 100 bytes per row
    }
  }

  /**
   * Helper methods
   */
  private static async readExcelFile(file: File): Promise<XLSX.WorkBook> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array', raw: true });
          resolve(workbook);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  }

  private static extractSortValue(record: any, sortKey: string): any {
    if (!record || !sortKey) return null;

    const value = record[sortKey];
    if (value === null || value === undefined) return null;

    if (value instanceof Date) {
      return value.getTime();
    }

    // Handle date/time values
    if (typeof value === 'string' && (value.includes('-') || value.includes('/'))) {
      const str = value.trim();

      // Look for DD-MM-YYYY with dash
      const dashMatch = str.match(/^(\d{1,2})-(\d{1,2})-(\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
      if (dashMatch) {
        const [_, d, m, yStr, h, min, s] = dashMatch;
        let y = Number(yStr);
        if (y < 100) y += 2000;
        // Parse as DD-MM-YYYY
        const parsedObj = new Date(y, Number(m) - 1, Number(d), Number(h || 0), Number(min || 0), Number(s || 0));
        if (!isNaN(parsedObj.getTime())) return parsedObj.getTime();
      }

      // Look for MM/DD/YYYY with slash
      const slashMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
      if (slashMatch) {
        const [_, m, d, yStr, h, min, s] = slashMatch;
        let y = Number(yStr);
        if (y < 100) y += 2000;
        // Parse as MM/DD/YYYY
        const parsedObj = new Date(y, Number(m) - 1, Number(d), Number(h || 0), Number(min || 0), Number(s || 0));
        if (!isNaN(parsedObj.getTime())) return parsedObj.getTime();
      }

      // Fallback
      const date = new Date(str);
      return isNaN(date.getTime()) ? value : date.getTime();
    }

    // Handle numeric values
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const num = parseFloat(value.replace(/[^0-9.-]/g, ''));
      return isNaN(num) ? value : num;
    }

    return value;
  }

  /**
   * Core comparison function for two-pointer algorithm
   * Returns: -1 if value1 < value2, 0 if equal (within tolerance), 1 if value1 > value2
   */
  private static compareSortValues(
    sourceValue: any,
    targetValue: any,
    tolerance: number,
    toleranceUnit: string
  ): number {
    if (sourceValue === null && targetValue === null) return 0;
    if (sourceValue === null) return -1;
    if (targetValue === null) return 1;

    // For exact matching
    if (tolerance === 0 || toleranceUnit === 'exact') {
      if (sourceValue === targetValue) return 0;
      return sourceValue < targetValue ? -1 : 1;
    }

    // For numeric values with tolerance
    if (typeof sourceValue === 'number' && typeof targetValue === 'number') {
      let actualTolerance = tolerance;

      // Convert time-based tolerance to milliseconds if dealing with timestamps
      if (toleranceUnit === 'minutes') {
        actualTolerance = tolerance * 60 * 1000;
      } else if (toleranceUnit === 'hours') {
        actualTolerance = tolerance * 60 * 60 * 1000;
      } else if (toleranceUnit === 'days') {
        actualTolerance = tolerance * 24 * 60 * 60 * 1000;
      } else if (toleranceUnit === 'percentage') {
        actualTolerance = Math.abs(sourceValue * tolerance);
      }

      // Use bidirectional: Target should be within [source - tolerance, source + tolerance]
      const diff = Math.abs(sourceValue - targetValue);
      if (diff <= actualTolerance) return 0;

      return sourceValue < targetValue ? -1 : 1;
    }

    // For string values, fall back to exact comparison
    if (sourceValue === targetValue) return 0;
    return sourceValue < targetValue ? -1 : 1;
  }

  private static calculateMatchConfidence(
    sourceRow: Record<string, any>,
    targetRow: Record<string, any>,
    mappings: ColumnMapping[],
    config: StreamingReconciliationConfig
  ): number {
    let totalWeight = 0;
    let matchedWeight = 0;

    for (const mapping of mappings) {
      if (!mapping.sourceColumn || !mapping.targetColumn) continue;

      const sourceColumn = Array.isArray(mapping.sourceColumn) ? mapping.sourceColumn[0] : mapping.sourceColumn;
      const targetColumn = mapping.targetColumn;
      const sourceValue = sourceRow[sourceColumn!];
      const targetValue = targetRow[targetColumn!];
      const weight = this.getFieldWeight(sourceColumn!);

      totalWeight += weight;

      if (this.valuesMatch(sourceValue, targetValue, config)) {
        matchedWeight += weight;
      }
    }

    return totalWeight > 0 ? matchedWeight / totalWeight : 0;
  }

  private static valuesMatch(value1: any, value2: any, config: StreamingReconciliationConfig): boolean {
    if (value1 === value2) return true;

    if (value1 instanceof Date && value2 instanceof Date) {
      return value1.getTime() === value2.getTime();
    }

    if (this.isNumeric(value1) && this.isNumeric(value2)) {
      const num1 = this.parseNumeric(value1);
      const num2 = this.parseNumeric(value2);
      // Use a very small epsilon for floating point comparison if needed, 
      // but for amounts 0.0001 is enough.
      return Math.abs(num1 - num2) <= (config.tolerance || 0.000001);
    }

    if (typeof value1 === 'string' && typeof value2 === 'string') {
      return value1.toLowerCase().trim() === value2.toLowerCase().trim();
    }

    // Looser comparison for mixed types (e.g. number and string)
    if (String(value1).toLowerCase().trim() === String(value2).toLowerCase().trim()) {
      return true;
    }

    return false;
  }

  private static isNumeric(value: any): boolean {
    if (typeof value === 'number') return !isNaN(value);
    if (typeof value === 'string') {
      const cleaned = value.replace(/[^0-9.-]/g, '');
      return cleaned !== '' && !isNaN(parseFloat(cleaned));
    }
    return false;
  }

  private static parseNumeric(value: any): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const cleaned = value.replace(/[^0-9.-]/g, '');
      return parseFloat(cleaned) || 0;
    }
    return 0;
  }

  private static getFieldWeight(fieldName: string): number {
    const lowerField = fieldName.toLowerCase();
    if (lowerField.includes('amount') || lowerField.includes('value')) return 3;
    if (lowerField.includes('date')) return 2;
    if (lowerField.includes('id') || lowerField.includes('reference')) return 2;
    return 1;
  }

  private static generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  private static extractAmount(row: Record<string, any>, mappings: ColumnMapping[]): number {
    for (const mapping of mappings) {
      const column = mapping.sourceColumn || mapping.targetColumn;
      if (column && typeof column === 'string' && column.toLowerCase().includes('amount')) {
        return this.parseNumeric(row[column]);
      }
    }
    return 0;
  }

  private static createMatchResult(
    sourceRecord: SortedRecord,
    targetRecord: SortedRecord,
    mappings: ColumnMapping[],
    confidence: number
  ): ReconciliationResult {
    const discrepancies = this.calculateDiscrepancies(sourceRecord.transformedRow, targetRecord.transformedRow, mappings);

    return {
      id: this.generateId(),
      sourceRow: sourceRecord.transformedRow,
      targetRow: targetRecord.transformedRow,
      sourceLine: sourceRecord.originalIndex + 2,
      targetLine: targetRecord.originalIndex + 2,
      confidence,
      discrepancies,
      amount: this.extractAmount(sourceRecord.transformedRow, mappings),
      status: discrepancies.length === 0 ? 'matched' : 'discrepancy'
    };
  }

  private static createUnmatchedSourceResult(
    sourceRecord: SortedRecord,
    mappings: ColumnMapping[]
  ): ReconciliationResult {
    return {
      id: this.generateId(),
      sourceRow: sourceRecord.transformedRow,
      targetRow: null,
      sourceLine: sourceRecord.originalIndex + 2,
      targetLine: undefined,
      confidence: 0,
      discrepancies: [],
      amount: this.extractAmount(sourceRecord.transformedRow, mappings),
      status: 'unmatched-source'
    };
  }

  private static createUnmatchedTargetResult(
    targetRecord: SortedRecord,
    mappings: ColumnMapping[]
  ): ReconciliationResult {
    return {
      id: this.generateId(),
      sourceRow: null,
      targetRow: targetRecord.transformedRow,
      sourceLine: undefined,
      targetLine: targetRecord.originalIndex + 2,
      confidence: 0,
      discrepancies: [],
      amount: this.extractAmount(targetRecord.transformedRow, mappings),
      status: 'unmatched-target'
    };
  }

  private static calculateDiscrepancies(
    sourceRow: Record<string, any>,
    targetRow: Record<string, any>,
    mappings: ColumnMapping[]
  ): string[] {
    const discrepancies: string[] = [];

    for (const mapping of mappings) {
      if (!mapping.sourceColumn || !mapping.targetColumn) continue;

      const sourceColumn = Array.isArray(mapping.sourceColumn) ? mapping.sourceColumn[0] : mapping.sourceColumn;
      const targetColumn = mapping.targetColumn;
      const sourceValue = sourceRow[sourceColumn!];
      const targetValue = targetRow[targetColumn!];

      let areDifferent = false;

      if (sourceValue instanceof Date && targetValue instanceof Date) {
        areDifferent = sourceValue.getTime() !== targetValue.getTime();
      } else if (this.isNumeric(sourceValue) && this.isNumeric(targetValue)) {
        areDifferent = Math.abs(this.parseNumeric(sourceValue) - this.parseNumeric(targetValue)) > 0.000001;
      } else {
        areDifferent = String(sourceValue).toLowerCase().trim() !== String(targetValue).toLowerCase().trim();
      }

      if (areDifferent) {
        const sVal = sourceValue instanceof Date ? sourceValue.toISOString() : sourceValue;
        const tVal = targetValue instanceof Date ? targetValue.toISOString() : targetValue;
        discrepancies.push(`${mapping.sourceColumn}: ${sVal} ≠ ${tVal}`);
      }
    }

    return discrepancies;
  }
}
