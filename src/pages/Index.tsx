import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FileUpload } from '@/components/FileUpload';
import { ColumnMapper } from '@/components/ColumnMapper';
import { SortConfigurationPanel, SortConfiguration } from '@/components/SortConfigurationPanel';
import { ReconciliationResults } from '@/components/ReconciliationResults';
import { CheckCircle, FileSpreadsheet, ArrowRightLeft, BarChart3, Shield, Clock, Zap, Database, Settings } from 'lucide-react';
import { ColumnMapping, VirtualField, ReconciliationResult } from '@/types/reconciliation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ReconciliationEngine } from '@/utils/reconciliationEngine';
import { StreamingReconciliationEngine } from '@/utils/streamingReconciliationEngine';
import * as XLSX from 'xlsx';
import heroImage from '@/assets/hero-finance.jpg';

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
  const [reconciliationResults, setReconciliationResults] = useState<ReconciliationResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [useStreamingEngine, setUseStreamingEngine] = useState(false);
  const [sortConfiguration, setSortConfiguration] = useState<SortConfiguration>({
    sourceSortKey: '',
    targetSortKey: '',
    tolerance: 0,
    toleranceUnit: 'exact',
    matchStrategy: 'smart',
    chunkSize: 10000,
    timeDirection: 'bidirectional'
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
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          resolve(jsonData as Record<string, any>[]);
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
          mappings,
          config: {
            tolerance,
            toleranceUnit: sortConfiguration.toleranceUnit,
            matchStrategy: sortConfiguration.matchStrategy,
            chunkSize: sortConfiguration.chunkSize,
            sourceSortKey: sortConfiguration.sourceSortKey,
            targetSortKey: sortConfiguration.targetSortKey,
            timeDirection: sortConfiguration.timeDirection
          },
          onProgress: setProcessingProgress
        });
      } else {
        // Use standard reconciliation
        setProcessingProgress({ processed: 50, total: 100, stage: 'Processing records...' });
        results = await ReconciliationEngine.reconcile({
          sourceData,
          targetData,
          sourceVirtualFields,
          targetVirtualFields,
          mappings,
          config: {
            tolerance: 0.5,
            matchStrategy: 'smart'
          }
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
    setReconciliationResults([]);
    setIsProcessing(false);
  };

  const handleMappingComplete = () => {
    setCurrentStep('sort-config');
  };

  const handleSortConfigComplete = () => {
    setCurrentStep('results');
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
        {/* Hero Section */}
        <div className="relative overflow-hidden">
          <div 
            className="absolute inset-0 opacity-10 bg-cover bg-center"
            style={{ backgroundImage: `url(${heroImage})` }}
          />
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="text-center">
              <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
                Financial Reconciliation
                <span className="block text-primary">Made Simple</span>
              </h1>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
                Upload two Excel files, map columns intelligently, and get automated reconciliation 
                with detailed reports. Streamline your financial processes with enterprise-grade accuracy.
              </p>
              
              {/* Feature highlights */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-12">
                <div className="flex items-center gap-3 justify-center">
                  <CheckCircle className="w-6 h-6 text-success" />
                  <span className="text-foreground font-medium">99.9% Accuracy</span>
                </div>
                <div className="flex items-center gap-3 justify-center">
                  <Shield className="w-6 h-6 text-primary" />
                  <span className="text-foreground font-medium">Bank-Grade Security</span>
                </div>
                <div className="flex items-center gap-3 justify-center">
                  <Clock className="w-6 h-6 text-warning" />
                  <span className="text-foreground font-medium">10x Faster Processing</span>
                </div>
              </div>
            </div>
          </div>
        </div>

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

          {/* Process Steps */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
            <div className="flex items-center gap-4">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                currentStep === 'upload' ? 'bg-primary text-primary-foreground' : 
                canProceedToMapping ? 'bg-success text-success-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <span className={`font-medium ${
                currentStep === 'upload' ? 'text-foreground' : 
                canProceedToMapping ? 'text-success' : 'text-muted-foreground'
              }`}>
                Upload Files
              </span>
            </div>
            <ArrowRightLeft className="w-4 h-4 text-muted-foreground" />
            <div className="flex items-center gap-4">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                canProceedToMapping ? 'bg-muted text-muted-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                <ArrowRightLeft className="w-4 h-4" />
              </div>
              <span className={`font-medium ${
                canProceedToMapping ? 'text-muted-foreground' : 'text-muted-foreground'
              }`}>
                Map Columns
              </span>
            </div>
            <ArrowRightLeft className="w-4 h-4 text-muted-foreground" />
            <Button 
              variant="outline" 
              className="flex items-center gap-4 p-4 h-auto cursor-pointer transition-all hover:bg-primary/5"
              onClick={() => canProceedToMapping && setCurrentStep('mapping')}
              disabled={!canProceedToMapping}
            >
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                canProceedToMapping ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                <Zap className="w-4 h-4" />
              </div>
              <span className={`font-medium ${
                canProceedToMapping ? 'text-primary' : 'text-muted-foreground'
              }`}>
                Time-Based Matching Available
                <div className="text-sm text-muted-foreground">Click to start column mapping →</div>
              </span>
            </Button>
            <ArrowRightLeft className="w-4 h-4 text-muted-foreground" />
            <div className="flex items-center gap-4">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full bg-muted text-muted-foreground`}>
                <BarChart3 className="w-4 h-4" />
              </div>
              <span className={`font-medium text-muted-foreground`}>
                View Results
              </span>
            </div>
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
            <Button variant="outline" onClick={resetProcess}>
              ← Back to Upload
            </Button>
          </div>
          
          <SortConfigurationPanel
            sourceColumns={[...sourceColumns, ...sourceVirtualFields.map(vf => vf.name)]}
            targetColumns={[...targetColumns, ...targetVirtualFields.map(vf => vf.name)]}
            onConfigurationChange={handleSortConfigurationChange}
            initialConfig={sortConfiguration}
          />

          <div className="flex justify-between mt-6">
            <Button 
              variant="outline" 
              onClick={() => setCurrentStep('mapping')}
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
            sampleData={{
              source: sourceData.slice(0, 5),
              target: targetData.slice(0, 5)
            }}
          />

          <div className="flex justify-between mt-6">
            <div className="flex gap-4">
              <Button 
                variant="outline" 
                onClick={() => setCurrentStep('upload')}
              >
                Back to Upload
              </Button>
              {canProceedToSortConfig && (
                <Button 
                  onClick={handleMappingComplete}
                  className="ml-auto"
                >
                  Proceed to Time-Based Matching
                </Button>
              )}
            </div>
          </div>

          {/* Reconciliation Engine Selection */}
          <Card className="p-6 mt-8 mb-6">
            <h3 className="text-lg font-semibold mb-4">Reconciliation Engine</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div 
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  !useStreamingEngine 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => setUseStreamingEngine(false)}
              >
                <div className="flex items-center mb-2">
                  <Database className="w-5 h-5 mr-2" />
                  <span className="font-medium">Standard Engine</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Best for small to medium datasets (&lt;50K records). Loads all data into memory for fast processing.
                </p>
              </div>
              
              <div 
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  useStreamingEngine 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => setUseStreamingEngine(true)}
              >
                <div className="flex items-center mb-2">
                  <Zap className="w-5 h-5 mr-2" />
                  <span className="font-medium">Memory-Efficient Engine</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Ideal for large datasets (&gt;50K records). Uses streaming and two-pointer algorithm for minimal memory usage.
                </p>
                
                {/* Time-Based Matching Configuration */}
                {useStreamingEngine && (
                  <Dialog open={showSortConfigModal} onOpenChange={setShowSortConfigModal}>
                    <DialogTrigger asChild>
                      <div 
                        className="mt-3 p-3 bg-primary/10 border border-primary/20 rounded-lg text-center cursor-pointer hover:bg-primary/20 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (canProceedToSortConfig) {
                            setShowSortConfigModal(true);
                          }
                        }}
                      >
                        <div className="flex items-center justify-center gap-2">
                          <Settings className="w-4 h-4 text-primary" />
                          <span className="text-sm font-medium text-primary">
                            configure
                          </span>
                        </div>
                      </div>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Sort & Tolerance Configuration</DialogTitle>
                      </DialogHeader>
                      <SortConfigurationPanel
                        sourceColumns={[...sourceColumns, ...sourceVirtualFields.map(vf => vf.name)]}
                        targetColumns={[...targetColumns, ...targetVirtualFields.map(vf => vf.name)]}
                        onConfigurationChange={handleSortConfigurationChange}
                        initialConfig={sortConfiguration}
                      />
                      <div className="flex justify-end gap-2 mt-6">
                        <Button 
                          variant="outline" 
                          onClick={() => setShowSortConfigModal(false)}
                        >
                          Close
                        </Button>
                        <Button 
                          onClick={() => {
                            setShowSortConfigModal(false);
                            if (canProceedToResults) {
                              startReconciliation();
                            }
                          }}
                          disabled={!canProceedToResults}
                        >
                          Start Reconciliation
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </div>
            
          </Card>

          {/* Progress Display */}
          {isProcessing && (
            <Card className="p-6 mb-6">
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
            <Button 
              variant="outline" 
              onClick={() => setCurrentStep('sort-config')}
              disabled={isProcessing}
            >
              Back to Configuration
            </Button>
            <Button 
              variant="hero" 
              size="lg"
              onClick={startReconciliation}
              disabled={isProcessing}
              className="px-8 py-4"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full mr-2" />
                  Processing Reconciliation...
                </>
              ) : (
                <>
                  <BarChart3 className="w-5 h-5 mr-2" />
                  Start Reconciliation
                </>
              )}
            </Button>
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