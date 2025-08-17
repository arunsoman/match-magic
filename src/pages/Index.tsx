import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FileUpload } from '@/components/FileUpload';
import { ColumnMapper } from '@/components/ColumnMapper';
import { ReconciliationResults } from '@/components/ReconciliationResults';
import { CheckCircle, FileSpreadsheet, ArrowRightLeft, BarChart3, Shield, Clock } from 'lucide-react';
import { ColumnMapping, VirtualField, ReconciliationResult } from '@/types/reconciliation';
import { ReconciliationEngine } from '@/utils/reconciliationEngine';
import * as XLSX from 'xlsx';
import heroImage from '@/assets/hero-finance.jpg';

const Index = () => {
  const [currentStep, setCurrentStep] = useState<'upload' | 'mapping' | 'results'>('upload');
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
    if (sourceFile && targetFile) {
      setCurrentStep('mapping');
    }
  };

  const startReconciliation = async () => {
    setIsProcessing(true);
    try {
      console.log('Starting reconciliation with:', {
        sourceData: sourceData.length,
        targetData: targetData.length,
        sourceVirtualFields: sourceVirtualFields.length,
        targetVirtualFields: targetVirtualFields.length,
        mappings: mappings.length,
        mappingsDetails: mappings
      });

      const results = await ReconciliationEngine.reconcile({
        sourceData,
        targetData,
        sourceVirtualFields,
        targetVirtualFields,
        mappings,
        config: {
          tolerance: 0.5, // Increased tolerance for amount matching
          matchStrategy: 'smart'
        }
      });

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
              disabled={!sourceFile || !targetFile}
              className="px-8 py-4"
            >
              <ArrowRightLeft className="w-5 h-5 mr-2" />
              Proceed to Column Mapping
            </Button>
            {(!sourceFile || !targetFile) && (
              <p className="text-sm text-muted-foreground mt-3">
                Please upload both files to continue
              </p>
            )}
          </div>

          {/* Process Steps */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <FileSpreadsheet className="w-8 h-8 text-primary-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">1. Upload Files</h3>
              <p className="text-muted-foreground">Upload your Excel files with drag & drop support</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <ArrowRightLeft className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">2. Map Columns</h3>
              <p className="text-muted-foreground">Define relationships between your data columns</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">3. Get Results</h3>
              <p className="text-muted-foreground">Review detailed reconciliation reports</p>
            </div>
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
            sourceFileName={sourceFile?.name || 'Source File'}
            targetFileName={targetFile?.name || 'Target File'}
            onMappingsChange={setMappings}
            onVirtualFieldsChange={(sourceVFs, targetVFs) => {
              setSourceVirtualFields(sourceVFs);
              setTargetVirtualFields(targetVFs);
            }}
            onTransformationsChange={(transformations) => {
              console.log('Transformations updated:', transformations);
            }}
            sampleData={{
              source: sourceData.slice(0, 5),
              target: targetData.slice(0, 5)
            }}
          />

          <div className="text-center mt-8">
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