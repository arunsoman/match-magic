import React from 'react';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calculator, Info, Plus, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ColumnMapping, FormulaMapping } from '@/types/reconciliation';

interface FormulaMapperProps {
  mapping: ColumnMapping;
  sourceColumns: string[];
  targetColumns: string[];
  onMappingUpdate: (mapping: ColumnMapping) => void;
  className?: string;
}

export const FormulaMapper: React.FC<FormulaMapperProps> = ({
  mapping,
  sourceColumns,
  targetColumns,
  onMappingUpdate,
  className
}) => {
  const updateFormula = (updates: Partial<FormulaMapping>) => {
    const updatedMapping = {
      ...mapping,
      formula: {
        ...mapping.formula,
        ...updates
      } as FormulaMapping
    };
    onMappingUpdate(updatedMapping);
  };

  const updateSourceColumn = (field: string, value: string) => {
    updateFormula({
      sourceColumns: {
        ...mapping.formula?.sourceColumns,
        [field]: value
      }
    });
  };

  const updateTargetColumn = (field: string, value: string) => {
    updateFormula({
      targetColumns: {
        ...mapping.formula?.targetColumns,
        [field]: value
      }
    });
  };

  const renderDebitCreditToAmount = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
        <Calculator className="w-4 h-4" />
        <span>Converting Debit + Credit columns to single Amount column</span>
      </div>

      <div className="grid grid-cols-12 gap-4 items-center">
        {/* Source Debit */}
        <div className="col-span-3">
          <label className="text-xs text-muted-foreground mb-1 block">Source Debit</label>
          <Select
            value={mapping.formula?.sourceColumns?.debit || ''}
            onValueChange={(value) => updateSourceColumn('debit', value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select debit column" />
            </SelectTrigger>
            <SelectContent>
              {sourceColumns.map((column) => (
                <SelectItem key={column} value={column}>
                  {column}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="col-span-1 flex justify-center">
          <Plus className="w-4 h-4 text-muted-foreground" />
        </div>

        {/* Source Credit */}
        <div className="col-span-3">
          <label className="text-xs text-muted-foreground mb-1 block">Source Credit</label>
          <Select
            value={mapping.formula?.sourceColumns?.credit || ''}
            onValueChange={(value) => updateSourceColumn('credit', value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select credit column" />
            </SelectTrigger>
            <SelectContent>
              {sourceColumns.map((column) => (
                <SelectItem key={column} value={column}>
                  {column}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="col-span-1 flex justify-center">
          <span className="text-sm text-muted-foreground">→</span>
        </div>

        {/* Target Amount */}
        <div className="col-span-4">
          <label className="text-xs text-muted-foreground mb-1 block">Target Amount</label>
          <Select
            value={mapping.targetColumn}
            onValueChange={(value) => onMappingUpdate({ ...mapping, targetColumn: value })}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select amount column" />
            </SelectTrigger>
            <SelectContent>
              {targetColumns.map((column) => (
                <SelectItem key={column} value={column}>
                  {column}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-accent/10 p-3 rounded-lg">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-primary mt-0.5" />
          <div className="text-sm">
            <p className="text-foreground font-medium mb-1">Formula: Amount = Credit - Debit</p>
            <p className="text-muted-foreground">
              Positive values indicate credits, negative values indicate debits
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAmountToDebitCredit = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
        <Calculator className="w-4 h-4" />
        <span>Converting single Amount column to Debit + Credit columns</span>
      </div>

      <div className="grid grid-cols-12 gap-4 items-center">
        {/* Source Amount */}
        <div className="col-span-4">
          <label className="text-xs text-muted-foreground mb-1 block">Source Amount</label>
          <Select
            value={mapping.formula?.sourceColumns?.amount || ''}
            onValueChange={(value) => updateSourceColumn('amount', value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select amount column" />
            </SelectTrigger>
            <SelectContent>
              {sourceColumns.map((column) => (
                <SelectItem key={column} value={column}>
                  {column}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="col-span-1 flex justify-center">
          <span className="text-sm text-muted-foreground">→</span>
        </div>

        {/* Target Debit */}
        <div className="col-span-3">
          <label className="text-xs text-muted-foreground mb-1 block">Target Debit</label>
          <Select
            value={mapping.formula?.targetColumns?.debit || ''}
            onValueChange={(value) => updateTargetColumn('debit', value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select debit column" />
            </SelectTrigger>
            <SelectContent>
              {targetColumns.map((column) => (
                <SelectItem key={column} value={column}>
                  {column}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="col-span-1 flex justify-center">
          <Plus className="w-4 h-4 text-muted-foreground" />
        </div>

        {/* Target Credit */}
        <div className="col-span-3">
          <label className="text-xs text-muted-foreground mb-1 block">Target Credit</label>
          <Select
            value={mapping.formula?.targetColumns?.credit || ''}
            onValueChange={(value) => updateTargetColumn('credit', value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select credit column" />
            </SelectTrigger>
            <SelectContent>
              {targetColumns.map((column) => (
                <SelectItem key={column} value={column}>
                  {column}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-accent/10 p-3 rounded-lg">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-primary mt-0.5" />
          <div className="text-sm">
            <p className="text-foreground font-medium mb-1">Formula: If Amount &gt; 0 then Credit, else Debit</p>
            <p className="text-muted-foreground">
              Positive amounts go to credit column, negative amounts go to debit column (as absolute value)
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <Card className={cn("border-l-4 border-l-primary bg-accent/5", className)}>
      <div className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
            <Calculator className="w-3 h-3 mr-1" />
            Formula
          </Badge>
          <Select
            value={mapping.formula?.type || ''}
            onValueChange={(value: 'debit_credit_to_amount' | 'amount_to_debit_credit') =>
              updateFormula({ type: value })
            }
          >
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select formula type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="debit_credit_to_amount">
                Debit + Credit → Amount
              </SelectItem>
              <SelectItem value="amount_to_debit_credit">
                Amount → Debit + Credit
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {mapping.formula?.type === 'debit_credit_to_amount' && renderDebitCreditToAmount()}
        {mapping.formula?.type === 'amount_to_debit_credit' && renderAmountToDebitCredit()}
      </div>
    </Card>
  );
};