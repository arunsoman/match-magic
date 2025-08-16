import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FileUpload } from '@/components/FileUpload';
import { ColumnMapper } from '@/components/ColumnMapper';
import { ReconciliationResults } from '@/components/ReconciliationResults';
import { CheckCircle, FileSpreadsheet, ArrowRightLeft, BarChart3, Shield, Clock } from 'lucide-react';
import heroImage from '@/assets/hero-finance.jpg';

// Mock data for demonstration
const mockResults = [
  {
    id: 'TXN001',
    sourceRow: { 'Transaction ID': 'TXN001', 'Amount': 1500.00, 'Date': '2024-01-15' },
    targetRow: { 'ID': 'TXN001', 'Value': 1500.00, 'Date': '2024-01-15' },
    status: 'matched' as const
  },
  {
    id: 'TXN002',
    sourceRow: { 'Transaction ID': 'TXN002', 'Amount': 750.50, 'Date': '2024-01-16' },
    status: 'unmatched-source' as const
  },
  {
    id: 'TXN003',
    sourceRow: { 'Transaction ID': 'TXN003', 'Amount': 2200.00, 'Date': '2024-01-17' },
    targetRow: { 'ID': 'TXN003', 'Value': 2199.99, 'Date': '2024-01-17' },
    status: 'discrepancy' as const,
    discrepancies: ['Amount difference: $0.01']
  }
];

const Index = () => {
  const [currentStep, setCurrentStep] = useState<'upload' | 'mapping' | 'results'>('upload');
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [targetFile, setTargetFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileSelect = (type: 'source' | 'target') => (file: File) => {
    if (type === 'source') {
      setSourceFile(file);
    } else {
      setTargetFile(file);
    }
  };

  const proceedToMapping = () => {
    if (sourceFile && targetFile) {
      setCurrentStep('mapping');
    }
  };

  const startReconciliation = () => {
    setIsProcessing(true);
    // Simulate processing
    setTimeout(() => {
      setIsProcessing(false);
      setCurrentStep('results');
    }, 3000);
  };

  const resetProcess = () => {
    setCurrentStep('upload');
    setSourceFile(null);
    setTargetFile(null);
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
              title="Source File (Bank Statement)"
              onFileSelect={handleFileSelect('source')}
              acceptedFile={sourceFile}
            />
            <FileUpload
              title="Target File (Internal Ledger)"
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
            sourceColumns={['Transaction ID', 'Amount', 'Date', 'Description', 'Account']}
            targetColumns={['ID', 'Value', 'Date', 'Notes', 'Category']}
            sourceFileName={sourceFile?.name || 'Source File'}
            targetFileName={targetFile?.name || 'Target File'}
            onMappingsChange={(mappings) => console.log('Mappings:', mappings)}
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
          results={mockResults}
          sourceFileName={sourceFile?.name || 'Source File'}
          targetFileName={targetFile?.name || 'Target File'}
        />
      </div>
    </div>
  );
};

export default Index;