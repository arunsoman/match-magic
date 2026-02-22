import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FileUpload } from '@/components/FileUpload';
import { ColumnMapper } from '@/components/ColumnMapper';
import { SortConfigurationPanel, SortConfiguration } from '@/components/SortConfigurationPanel';
import { ReconciliationResults } from '@/components/ReconciliationResults';
import { CheckCircle, FileSpreadsheet, ArrowRightLeft, BarChart3, Shield, Clock, Zap, Database, Settings } from 'lucide-react';
import { ColumnMapping, VirtualField, ReconciliationResult } from '@/types/reconciliation';
import { TransformationPipeline } from '@/types/transformations';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ReconciliationEngine } from '@/utils/reconciliationEngine';
import { StreamingReconciliationEngine } from '@/utils/streamingReconciliationEngine';
import * as XLSX from 'xlsx';

const Index = () => {
  const [currentStep, setCurrentStep] = useState<'upload' | 'mapping' | 'sort-config' | 'results'>('upload');
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [targetFile, setTargetFile] = useState<File | null>(null);
  const [sourceData, setSourceData] = useState<Record<string, any>[]>([]);
  const [targetData, setTargetData] = useState<Record<string, any>[]>([]);
  const [sourceColumns, setSourceColumns] = useState<string[]>([]);
  const [targetColumns, setTargetColumns] = useState<string[]>([]);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [sourceVirtualFields, setSourceVirtualFields] = useState<VirtualField[]>([]);
  const [targetVirtualFields, setTargetVirtualFields] = useState<VirtualField[]>([]);
  const [transformations, setTransformations] = useState<TransformationPipeline[]>([]);
  const [reconciliationResults, setReconciliationResults] = useState<ReconciliationResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [useStreamingEngine, setUseStreamingEngine] = useState(true);
  const [sortConfiguration, setSortConfiguration] = useState<SortConfiguration>({
    sourceSortKey: '',
    targetSortKey: '',
    tolerance: 0,
    toleranceUnit: 'exact',
    matchStrategy: 'smart',
    chunkSize: 10000
  });
  const [processingProgress, setProcessingProgress] = useState({ processed: 0, total: 100, stage: '' });
  const [showSortConfigModal, setShowSortConfigModal] = useState(false);

  const handleFileSelect = (type: 'source' | 'target') => async (file: File) => {
    try {
      const data = await parseExcelFile(file);
      const columns = data.length > 0 ? Object.keys(data[0]) : [];

      if (type === 'source') {
        setSourceFile(file);
        setSourceData(data);
        setSourceColumns(columns);
      } else {
        setTargetFile(file);
        setTargetData(data);
        setTargetColumns(columns);
      }
    } catch (error) {
      console.error('Error parsing file:', error);
    }
  };

  const parseExcelFile = (file: File): Promise<Record<string, any>[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array', raw: true });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: null }) as Record<string, any>[];
          const dataWithLines = jsonData.map((row, index) => ({
            ...row,
            __line: index + 2
          }));
          resolve(dataWithLines);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  };

  const proceedToMapping = () => {
    if (canProceedToMapping) {
      setCurrentStep('mapping');
    }
  };

  const startReconciliation = async () => {
    setIsProcessing(true);
    setProcessingProgress({ processed: 0, total: 100, stage: 'Initializing...' });

    try {
      console.log('Starting reconciliation with:', {
        sourceData: sourceData.length,
        targetData: targetData.length,
        sourceVirtualFields: sourceVirtualFields.length,
        targetVirtualFields: targetVirtualFields.length,
        mappings: mappings.length,
        mappingsDetails: mappings,
        useStreamingEngine,
        canProceedToMapping: sourceFile && targetFile && sourceData.length > 0 && targetData.length > 0,
        canProceedToSortConfig: mappings.length > 0 && mappings.every(m => m.sourceColumn && m.targetColumn),
        canProceedToResults: sortConfiguration.sourceSortKey && sortConfiguration.targetSortKey && (sortConfiguration.toleranceUnit === 'exact' || sortConfiguration.tolerance > 0)
      });

      let results: ReconciliationResult[];

      if (useStreamingEngine && sourceFile && targetFile) {
        // Use streaming reconciliation for memory efficiency
        const tolerance = sortConfiguration.toleranceUnit === 'exact' ? 0 :
          sortConfiguration.toleranceUnit === 'percentage' ? sortConfiguration.tolerance / 100 :
            sortConfiguration.tolerance;

        results = await StreamingReconciliationEngine.reconcileStreaming({
          sourceFile,
          targetFile,
          sourceVirtualFields,
          targetVirtualFields,
          transformations,
          mappings,
          config: {
            tolerance,
            toleranceUnit: sortConfiguration.toleranceUnit,
            matchStrategy: sortConfiguration.matchStrategy,
            chunkSize: sortConfiguration.chunkSize,
            sourceSortKey: sortConfiguration.sourceSortKey,
            targetSortKey: sortConfiguration.targetSortKey,
          },
          onProgress: setProcessingProgress
        });
      } else {
        // Use standard reconciliation (fallback shouldn't be used for dates, but let's wire it correctly)
        setProcessingProgress({ processed: 50, total: 100, stage: 'Processing records...' });
        results = await ReconciliationEngine.reconcile({
          sourceData,
          targetData,
          sourceVirtualFields,
          targetVirtualFields,
          transformations,
          mappings,
          config: {
            tolerance: sortConfiguration.toleranceUnit === 'exact' ? 0 : sortConfiguration.tolerance,
            matchStrategy: 'smart'
          }
        });
        // Force cleanup of stale unmapped statuses if any from standard engine
        results = results.map(r => {
          if (r.status === 'unmatched' as any) {
            return { ...r, status: r.sourceRow ? 'unmatched-source' : 'unmatched-target' } as ReconciliationResult;
          }
          return r;
        });
        setProcessingProgress({ processed: 100, total: 100, stage: 'Complete' });
      }

      console.log('Reconciliation results:', results);
      setReconciliationResults(results);
      setCurrentStep('results');
    } catch (error) {
      console.error('Reconciliation failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const resetProcess = () => {
    setCurrentStep('upload');
    setSourceFile(null);
    setTargetFile(null);
    setSourceData([]);
    setTargetData([]);
    setSourceColumns([]);
    setTargetColumns([]);
    setMappings([]);
    setSourceVirtualFields([]);
    setTargetVirtualFields([]);
    setTransformations([]);
    setReconciliationResults([]);
    setIsProcessing(false);
  };

  const handleMappingComplete = () => {
    setCurrentStep('sort-config');
  };

  const handleSortConfigComplete = () => {
    if (canProceedToResults) {
      startReconciliation();
    }
  };

  const handleSortConfigurationChange = (config: SortConfiguration) => {
    setSortConfiguration(config);
    setUseStreamingEngine(true); // Enable streaming when sort config is provided
  };

  const getAllAvailableColumns = () => {
    const allSourceColumns = [...sourceColumns, ...sourceVirtualFields.map(vf => vf.name)];
    const allTargetColumns = [...targetColumns, ...targetVirtualFields.map(vf => vf.name)];
    return [...new Set([...allSourceColumns, ...allTargetColumns])];
  };

  // Validation variables
  const canProceedToMapping = sourceFile && targetFile && sourceData.length > 0 && targetData.length > 0;
  const canProceedToSortConfig = mappings.length > 0 && mappings.every(m => m.sourceColumn && m.targetColumn);
  const canProceedToResults = sortConfiguration.sourceSortKey && sortConfiguration.targetSortKey && (sortConfiguration.toleranceUnit === 'exact' || sortConfiguration.tolerance > 0);

  if (currentStep === 'upload') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-background-secondary">

        {/* Upload Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">Start Your Reconciliation</h2>
            <p className="text-muted-foreground">Upload your two Excel files to begin the process</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
            <FileUpload
              title="Source File"
              onFileSelect={handleFileSelect('source')}
              acceptedFile={sourceFile}
            />
            <FileUpload
              title="Target File"
              onFileSelect={handleFileSelect('target')}
              acceptedFile={targetFile}
            />
          </div>

          <div className="text-center">
            <Button
              variant="hero"
              size="lg"
              onClick={proceedToMapping}
              disabled={!canProceedToMapping}
              className="px-8 py-4"
            >
              <ArrowRightLeft className="w-5 h-5 mr-2" />
              Proceed to Column Mapping
            </Button>
            {!canProceedToMapping && (
              <p className="text-sm text-muted-foreground mt-3">
                Please upload both files and ensure they have data to continue
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (currentStep === 'sort-config') {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <Button
              variant="outline"
              onClick={resetProcess}
              disabled={isProcessing}
            >
              ← Back to Upload
            </Button>
          </div>

          <SortConfigurationPanel
            sourceColumns={[
              ...sourceColumns,
              ...sourceVirtualFields.map(vf => vf.name),
              ...transformations.filter(t => t.sourceFile === 'source' && t.outputColumn).map(t => t.outputColumn as string)
            ]}
            targetColumns={[
              ...targetColumns,
              ...targetVirtualFields.map(vf => vf.name),
              ...transformations.filter(t => t.sourceFile === 'target' && t.outputColumn).map(t => t.outputColumn as string)
            ]}
            onConfigurationChange={handleSortConfigurationChange}
            initialConfig={sortConfiguration}
          />

          {/* Progress Display */}
          {isProcessing && (
            <Card className="p-6 mt-6 shadow-md border-primary/20">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
                Processing Reconciliation
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{processingProgress.stage}</span>
                  <span className="font-medium">{Math.round(processingProgress.processed)}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${processingProgress.processed}%` }}
                  />
                </div>
              </div>
            </Card>
          )}

          <div className="flex justify-between mt-6">
            <Button
              variant="outline"
              onClick={() => setCurrentStep('mapping')}
              disabled={isProcessing}
            >
              Back to Mapping
            </Button>
            <Button
              onClick={handleSortConfigComplete}
              disabled={!canProceedToResults}
            >
              Start Reconciliation
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (currentStep === 'mapping') {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <Button variant="outline" onClick={resetProcess}>
              ← Back to Upload
            </Button>
          </div>

          <ColumnMapper
            sourceColumns={sourceColumns}
            targetColumns={targetColumns}
            sourceFileName={sourceFile?.name || ''}
            targetFileName={targetFile?.name || ''}
            onMappingsChange={setMappings}
            onVirtualFieldsChange={(sourceVFs, targetVFs) => {
              setSourceVirtualFields(sourceVFs);
              setTargetVirtualFields(targetVFs);
            }}
            onTransformationsChange={setTransformations}
            sortConfiguration={sortConfiguration}
            onSortConfigurationChange={handleSortConfigurationChange}
            sampleData={{
              source: sourceData.slice(0, 5),
              target: targetData.slice(0, 5)
            }}
          />

          {/* Progress Display moved to mapping area for visibility */}
          {isProcessing && (
            <Card className="p-6 mt-6 mb-6">
              <h3 className="text-lg font-semibold mb-4">Processing Progress</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>{processingProgress.stage}</span>
                  <span>{Math.round(processingProgress.processed)}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${processingProgress.processed}%` }}
                  />
                </div>
              </div>
            </Card>
          )}

          <div className="flex justify-between mt-6">
            <div className="flex gap-4">

              {canProceedToSortConfig && (
                <Button
                  onClick={handleMappingComplete}
                  className="ml-auto"
                >
                  Configure Matching & Start
                </Button>
              )}
            </div>
          </div>


        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <Button variant="outline" onClick={resetProcess}>
            ← Start New Reconciliation
          </Button>
          <div className="text-sm text-muted-foreground">
            Processed: {sourceFile?.name} ↔ {targetFile?.name}
          </div>
        </div>

        <ReconciliationResults
          results={reconciliationResults}
          sourceFileName={sourceFile?.name || 'Source File'}
          targetFileName={targetFile?.name || 'Target File'}
        />
      </div>
    </div>
  );
};

export default Index;