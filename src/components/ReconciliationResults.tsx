import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, CheckCircle, XCircle, AlertTriangle, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

import { ReconciliationResult } from '@/types/reconciliation';

interface ReconciliationResultsProps {
  results: ReconciliationResult[];
  sourceFileName: string;
  targetFileName: string;
  className?: string;
}

export const ReconciliationResults: React.FC<ReconciliationResultsProps> = ({
  results,
  sourceFileName,
  targetFileName,
  className
}) => {
  const [selectedTab, setSelectedTab] = useState('summary');

  // Helper for flattening rows for export
  const flattenRow = (row: any, prefix: string) => {
    if (!row) return {};
    const flattened: any = {};
    Object.entries(row).forEach(([key, value]) => {
      if (key !== '__line') {
        flattened[`${prefix}_${key}`] = value;
      }
    });
    return flattened;
  };

  const exportToExcel = () => {
    const workbook = XLSX.utils.book_new();

    // 1. Summary Sheet
    const summaryData = [
      ['Reconciliation Report Summary'],
      ['Generated At', format(new Date(), 'yyyy-MM-dd HH:mm:ss')],
      [''],
      ['File Information'],
      ['Source File', sourceFileName],
      ['Target File', targetFileName],
      [''],
      ['Reconciliation Statistics'],
      ['Total Records', stats.total],
      ['Matched', stats.matched],
      ['Unmatched Source', stats.unmatchedSource],
      ['Unmatched Target', stats.unmatchedTarget],
      ['Discrepancies', stats.discrepancies],
      ['Match Rate', `${matchRate}%`],
      [''],
      ['How to read this report'],
      ['Status', 'Meaning'],
      ['Matched', 'Source and Target records match perfectly based on your rules.'],
      ['Discrepancy', 'Source and Target records match but have differences in mapped fields.'],
      ['Unmatched Source', 'Record exists in Source file but no matching record found in Target.'],
      ['Unmatched Target', 'Record exists in Target file but no matching record found in Source.']
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

    // 2. All Results Sheet
    const allResultsData = results.map(r => ({
      Status: r.status,
      'Src Line': r.sourceLine || '',
      'Tgt Line': r.targetLine || '',
      ...flattenRow(r.sourceRow, 'Src'),
      ...flattenRow(r.targetRow, 'Tgt'),
      Issues: r.discrepancies?.join(', ') || ''
    }));
    const allResultsSheet = XLSX.utils.json_to_sheet(allResultsData);
    XLSX.utils.book_append_sheet(workbook, allResultsSheet, 'All Results');

    // 3. Discrepancies Sheet
    const discrepancyData = results.filter(r => r.status === 'discrepancy').map(r => ({
      'Src Line': r.sourceLine,
      'Tgt Line': r.targetLine,
      ...flattenRow(r.sourceRow, 'Src'),
      ...flattenRow(r.targetRow, 'Tgt'),
      Issues: r.discrepancies?.join(', ')
    }));
    if (discrepancyData.length > 0) {
      const discrepancySheet = XLSX.utils.json_to_sheet(discrepancyData);
      XLSX.utils.book_append_sheet(workbook, discrepancySheet, 'Discrepancies');
    }

    // 4. Unmatched Sheets
    const sourceOnly = results.filter(r => r.status === 'unmatched-source').map(r => ({
      Line: r.sourceLine,
      ...flattenRow(r.sourceRow, 'Data')
    }));
    if (sourceOnly.length > 0) {
      const sourceOnlySheet = XLSX.utils.json_to_sheet(sourceOnly);
      XLSX.utils.book_append_sheet(workbook, sourceOnlySheet, 'Source Only (Missing in Target)');
    }

    const targetOnly = results.filter(r => r.status === 'unmatched-target').map(r => ({
      Line: r.targetLine,
      ...flattenRow(r.targetRow, 'Data')
    }));
    if (targetOnly.length > 0) {
      const targetOnlySheet = XLSX.utils.json_to_sheet(targetOnly);
      XLSX.utils.book_append_sheet(workbook, targetOnlySheet, 'Target Only (Missing in Source)');
    }

    XLSX.writeFile(workbook, `Reconciliation_Report_${format(new Date(), 'yyyy-MM-dd_HHmm')}.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF() as any;
    const timestamp = format(new Date(), 'yyyy-MM-dd HH:mm:ss');

    // Header
    doc.setFontSize(22);
    doc.setTextColor(40, 40, 40);
    doc.text('Reconciliation Report', 14, 22);

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated: ${timestamp}`, 14, 30);

    // KPI Cards Simulation
    doc.setDrawColor(230, 230, 230);
    doc.setFillColor(249, 250, 251);
    doc.roundedRect(14, 35, 40, 25, 3, 3, 'F');
    doc.roundedRect(60, 35, 40, 25, 3, 3, 'F');
    doc.roundedRect(106, 35, 40, 25, 3, 3, 'F');
    doc.roundedRect(152, 35, 40, 25, 3, 3, 'F');

    doc.setFontSize(14);
    doc.setTextColor(34, 197, 94); // success
    doc.text(stats.matched.toString(), 34, 48, { align: 'center' });
    doc.setTextColor(239, 68, 68); // destructive
    doc.text((stats.unmatchedSource + stats.unmatchedTarget).toString(), 80, 48, { align: 'center' });
    doc.setTextColor(245, 158, 11); // warning
    doc.text(stats.discrepancies.toString(), 126, 48, { align: 'center' });
    doc.setTextColor(59, 130, 246); // primary
    doc.text(`${matchRate}%`, 172, 48, { align: 'center' });

    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text('Matched', 34, 55, { align: 'center' });
    doc.text('Unmatched', 80, 55, { align: 'center' });
    doc.text('Discrepancies', 126, 55, { align: 'center' });
    doc.text('Match Rate', 172, 55, { align: 'center' });

    // File Info
    doc.setFontSize(10);
    doc.setTextColor(40, 40, 40);
    doc.text('File Analysis:', 14, 75);
    doc.setFontSize(9);
    doc.text(`Source: ${sourceFileName}`, 14, 82);
    doc.text(`Target: ${targetFileName}`, 14, 88);

    // Detailed Tables
    const tableData = results.slice(0, 100).map(r => [
      r.status.toUpperCase(),
      r.sourceLine || '-',
      r.targetLine || '-',
      Object.entries(r.sourceRow || {}).slice(0, 1).map(([k, v]) => `${k}:${v}`).join('') || '-',
      Object.entries(r.targetRow || {}).slice(0, 1).map(([k, v]) => `${k}:${v}`).join('') || '-',
      r.discrepancies?.join(', ') || '-'
    ]);

    autoTable(doc, {
      startY: 100,
      head: [['Status', 'Src Line', 'Tgt Line', 'Source Summary', 'Target Summary', 'Issues']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 8 },
      margin: { top: 10 }
    });

    if (results.length > 100) {
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`* Showing first 100 of ${results.length} records. For full details, please export to Excel.`, 14, (doc as any).lastAutoTable.finalY + 10);
    }

    doc.save(`Reconciliation_Report_${format(new Date(), 'yyyy-MM-dd_HHmm')}.pdf`);
  };

  // Calculate statistics
  const stats = {
    total: results.length,
    matched: results.filter(r => r.status === 'matched').length,
    unmatchedSource: results.filter(r => r.status === 'unmatched-source').length,
    unmatchedTarget: results.filter(r => r.status === 'unmatched-target').length,
    discrepancies: results.filter(r => r.status === 'discrepancy').length
  };

  const matchRate = stats.total > 0 ? (stats.matched / stats.total * 100).toFixed(1) : '0';

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'matched':
        return <CheckCircle className="w-4 h-4 text-success" />;
      case 'discrepancy':
        return <AlertTriangle className="w-4 h-4 text-warning" />;
      default:
        return <XCircle className="w-4 h-4 text-destructive" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      matched: 'bg-success/10 text-success border-success/20',
      'unmatched-source': 'bg-destructive/10 text-destructive border-destructive/20',
      'unmatched-target': 'bg-destructive/10 text-destructive border-destructive/20',
      discrepancy: 'bg-warning/10 text-warning border-warning/20'
    };

    const labels = {
      matched: 'Matched',
      'unmatched-source': 'Unmatched Source',
      'unmatched-target': 'Unmatched Target',
      discrepancy: 'Discrepancy'
    };

    return (
      <Badge variant="outline" className={variants[status as keyof typeof variants]}>
        {labels[status as keyof typeof labels]}
      </Badge>
    );
  };

  const filteredResults = (status?: string) => {
    if (!status) return results;
    if (status === 'unmatched-source') {
      return results.filter(r => r.status === 'unmatched-source');
    }
    if (status === 'unmatched-target') {
      return results.filter(r => r.status === 'unmatched-target');
    }
    return results.filter(r => r.status === status);
  };

  return (
    <Card className={cn("relative", className)}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-foreground">Reconciliation Results</h3>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportToExcel}>
              <Download className="w-4 h-4 mr-2" />
              Export Excel
            </Button>
            <Button variant="outline" size="sm" onClick={exportToPDF}>
              <FileText className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>

        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="matched">Matched ({stats.matched})</TabsTrigger>
            <TabsTrigger value="unmatched-source">Source ({stats.unmatchedSource})</TabsTrigger>
            <TabsTrigger value="unmatched-target">Target ({stats.unmatchedTarget})</TabsTrigger>
            <TabsTrigger value="discrepancy">Issues ({stats.discrepancies})</TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-8 h-8 text-success" />
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stats.matched}</p>
                    <p className="text-sm text-muted-foreground">Matched Records</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <XCircle className="w-8 h-8 text-destructive" />
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stats.unmatchedSource + stats.unmatchedTarget}</p>
                    <p className="text-sm text-muted-foreground">Unmatched Records</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-8 h-8 text-warning" />
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stats.discrepancies}</p>
                    <p className="text-sm text-muted-foreground">Discrepancies</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <FileText className="w-8 h-8 text-primary" />
                  <div>
                    <p className="text-2xl font-bold text-foreground">{matchRate}%</p>
                    <p className="text-sm text-muted-foreground">Match Rate</p>
                  </div>
                </div>
              </Card>
            </div>

            <div className="space-y-4">
              <h4 className="text-md font-semibold text-foreground">File Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="p-4">
                  <h5 className="font-medium text-foreground mb-2">Source File</h5>
                  <p className="text-sm text-muted-foreground">{sourceFileName}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {stats.unmatchedSource} unmatched records
                  </p>
                </Card>
                <Card className="p-4">
                  <h5 className="font-medium text-foreground mb-2">Target File</h5>
                  <p className="text-sm text-muted-foreground">{targetFileName}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {stats.unmatchedTarget} unmatched records
                  </p>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="matched" className="mt-6">
            <ResultsTable results={filteredResults('matched')} getStatusIcon={getStatusIcon} getStatusBadge={getStatusBadge} />
          </TabsContent>

          <TabsContent value="unmatched-source" className="mt-6">
            <ResultsTable results={filteredResults('unmatched-source')} getStatusIcon={getStatusIcon} getStatusBadge={getStatusBadge} />
          </TabsContent>

          <TabsContent value="unmatched-target" className="mt-6">
            <ResultsTable results={filteredResults('unmatched-target')} getStatusIcon={getStatusIcon} getStatusBadge={getStatusBadge} />
          </TabsContent>

          <TabsContent value="discrepancy" className="mt-6">
            <ResultsTable results={filteredResults('discrepancy')} getStatusIcon={getStatusIcon} getStatusBadge={getStatusBadge} />
          </TabsContent>
        </Tabs>
      </div>
    </Card>
  );
};

const ResultsTable: React.FC<{ results: ReconciliationResult[]; getStatusIcon: (status: string) => JSX.Element; getStatusBadge: (status: string) => JSX.Element }> = ({ results, getStatusIcon, getStatusBadge }) => {
  if (results.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No records in this category</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-2 px-4 text-sm font-medium text-foreground">Status</th>
            <th className="text-left py-2 px-4 text-sm font-medium text-foreground">Src Line</th>
            <th className="text-left py-2 px-4 text-sm font-medium text-foreground">Tgt Line</th>
            <th className="text-left py-2 px-4 text-sm font-medium text-foreground">Source Data</th>
            <th className="text-left py-2 px-4 text-sm font-medium text-foreground">Target Data</th>
            <th className="text-left py-2 px-4 text-sm font-medium text-foreground">Issues</th>
          </tr>
        </thead>
        <tbody>
          {results.slice(0, 50).map((result) => (
            <tr key={result.id} className="border-b border-border-light hover:bg-accent/20">
              <td className="py-3 px-4">
                <div className="flex items-center gap-2">
                  {getStatusIcon(result.status)}
                  {getStatusBadge(result.status)}
                </div>
              </td>
              <td className="py-3 px-4 text-sm text-foreground">{result.sourceLine || '-'}</td>
              <td className="py-3 px-4 text-sm text-foreground">{result.targetLine || '-'}</td>
              <td className="py-3 px-4 text-sm text-muted-foreground">
                {result.sourceRow ?
                  Object.entries(result.sourceRow).slice(0, 2).map(([key, value]) => (
                    <div key={key}>{key}: {String(value)}</div>
                  ))
                  : <span className="text-muted-foreground">No source data</span>
                }
              </td>
              <td className="py-3 px-4 text-sm text-muted-foreground">
                {result.targetRow ?
                  Object.entries(result.targetRow).slice(0, 2).map(([key, value]) => (
                    <div key={key}>{key}: {String(value)}</div>
                  ))
                  : <span className="text-muted-foreground">No match</span>
                }
              </td>
              <td className="py-3 px-4 text-sm text-warning">
                {result.discrepancies?.join(', ') || '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {results.length > 50 && (
        <div className="text-center py-4 text-muted-foreground text-sm">
          Showing first 50 of {results.length} records
        </div>
      )}
    </div>
  );
};