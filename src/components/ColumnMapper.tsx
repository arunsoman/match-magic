import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Plus, Trash2, Save, Calculator, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ColumnMapping } from '@/types/reconciliation';
import { FormulaMapper } from '@/components/FormulaMapper';
import { DataTransformer } from '@/utils/dataTransformation';

interface ColumnMapperProps {
  sourceColumns: string[];
  targetColumns: string[];
  sourceFileName: string;
  targetFileName: string;
  onMappingsChange: (mappings: ColumnMapping[]) => void;
  className?: string;
}

export const ColumnMapper: React.FC<ColumnMapperProps> = ({
  sourceColumns,
  targetColumns,
  sourceFileName,
  targetFileName,
  onMappingsChange,
  className
}) => {
  const [mappings, setMappings] = useState<ColumnMapping[]>([
    {
      id: '1',
      sourceColumn: '',
      targetColumn: '',
      matchType: 'exact'
    }
  ]);
  
  const [suggestions, setSuggestions] = useState<Partial<ColumnMapping>[]>([]);

  useEffect(() => {
    // Get formula suggestions when columns change
    const formulaSuggestions = DataTransformer.suggestFormulaMappings(sourceColumns, targetColumns);
    setSuggestions(formulaSuggestions);
  }, [sourceColumns, targetColumns]);

  const addMapping = (type: 'standard' | 'formula' = 'standard') => {
    const newMapping: ColumnMapping = {
      id: Date.now().toString(),
      sourceColumn: type === 'formula' ? [] : '',
      targetColumn: '',
      matchType: type === 'formula' ? 'formula' : 'exact',
      ...(type === 'formula' && {
        formula: {
          type: 'debit_credit_to_amount',
          sourceColumns: {},
          targetColumns: {}
        }
      })
    };
    const updatedMappings = [...mappings, newMapping];
    setMappings(updatedMappings);
    onMappingsChange(updatedMappings);
  };

  const addSuggestion = (suggestion: Partial<ColumnMapping>) => {
    const newMapping: ColumnMapping = {
      id: Date.now().toString(),
      sourceColumn: suggestion.sourceColumn || '',
      targetColumn: suggestion.targetColumn || '',
      matchType: suggestion.matchType || 'exact',
      ...(suggestion.formula && { formula: suggestion.formula })
    };
    const updatedMappings = [...mappings, newMapping];
    setMappings(updatedMappings);
    onMappingsChange(updatedMappings);
  };

  const removeMapping = (id: string) => {
    const updatedMappings = mappings.filter(m => m.id !== id);
    setMappings(updatedMappings);
    onMappingsChange(updatedMappings);
  };

  const updateMapping = (id: string, field: keyof ColumnMapping, value: any) => {
    const updatedMappings = mappings.map(mapping =>
      mapping.id === id ? { ...mapping, [field]: value } : mapping
    );
    setMappings(updatedMappings);
    onMappingsChange(updatedMappings);
  };

  const getMatchTypeColor = (type: 'exact' | 'fuzzy' | 'formula') => {
    switch (type) {
      case 'exact': return 'bg-success';
      case 'fuzzy': return 'bg-warning';
      case 'formula': return 'bg-primary';
      default: return 'bg-muted';
    }
  };

  const isValidMapping = (mapping: ColumnMapping) => {
    if (mapping.matchType === 'formula') {
      return mapping.formula && mapping.targetColumn;
    }
    return mapping.sourceColumn && mapping.targetColumn;
  };

  const allMappingsValid = mappings.every(isValidMapping);

  return (
    <Card className={cn("relative", className)}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-foreground">Column Mapping</h3>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => addMapping('standard')}>
              <Plus className="w-4 h-4 mr-2" />
              Add Mapping
            </Button>
            <Button variant="outline" size="sm" onClick={() => addMapping('formula')}>
              <Calculator className="w-4 h-4 mr-2" />
              Add Formula
            </Button>
          </div>
        </div>

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div className="mb-6 p-4 bg-accent/10 rounded-lg border border-primary/20">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-foreground">Suggested Formula Mappings</span>
            </div>
            <div className="space-y-2">
              {suggestions.map((suggestion, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-background rounded border">
                  <div className="text-sm">
                    <span className="font-medium">
                      {suggestion.formula?.type === 'debit_credit_to_amount' 
                        ? 'Convert Debit/Credit → Amount' 
                        : 'Convert Amount → Debit/Credit'}
                    </span>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => addSuggestion(suggestion)}>
                    <Plus className="w-3 h-3 mr-1" />
                    Apply
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-4">
          {/* Header */}
          <div className="grid grid-cols-12 gap-4 text-sm font-medium text-muted-foreground">
            <div className="col-span-4">{sourceFileName}</div>
            <div className="col-span-1"></div>
            <div className="col-span-4">{targetFileName}</div>
            <div className="col-span-2">Match Type</div>
            <div className="col-span-1"></div>
          </div>

          {/* Mappings */}
          {mappings.map((mapping, index) => (
            <div key={mapping.id} className="space-y-4">
              {mapping.matchType === 'formula' ? (
                <FormulaMapper
                  mapping={mapping}
                  sourceColumns={sourceColumns}
                  targetColumns={targetColumns}
                  onMappingUpdate={(updatedMapping) => {
                    const updatedMappings = mappings.map(m => 
                      m.id === updatedMapping.id ? updatedMapping : m
                    );
                    setMappings(updatedMappings);
                    onMappingsChange(updatedMappings);
                  }}
                />
              ) : (
                <div className="grid grid-cols-12 gap-4 items-center">
                  {/* Source Column */}
                  <div className="col-span-4">
                    <Select
                      value={typeof mapping.sourceColumn === 'string' ? mapping.sourceColumn : ''}
                      onValueChange={(value) => updateMapping(mapping.id, 'sourceColumn', value)}
                    >
                      <SelectTrigger className={cn(
                        "w-full",
                        !mapping.sourceColumn && "border-border-light text-muted-foreground"
                      )}>
                        <SelectValue placeholder="Select source column" />
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

                  {/* Arrow */}
                  <div className="col-span-1 flex justify-center">
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  </div>

                  {/* Target Column */}
                  <div className="col-span-4">
                    <Select
                      value={mapping.targetColumn}
                      onValueChange={(value) => updateMapping(mapping.id, 'targetColumn', value)}
                    >
                      <SelectTrigger className={cn(
                        "w-full",
                        !mapping.targetColumn && "border-border-light text-muted-foreground"
                      )}>
                        <SelectValue placeholder="Select target column" />
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

                  {/* Match Type */}
                  <div className="col-span-2">
                    <Select
                      value={mapping.matchType}
                      onValueChange={(value: 'exact' | 'fuzzy' | 'formula') => updateMapping(mapping.id, 'matchType', value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="exact">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className={getMatchTypeColor('exact')}>
                              Exact
                            </Badge>
                          </div>
                        </SelectItem>
                        <SelectItem value="fuzzy">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className={getMatchTypeColor('fuzzy')}>
                              Fuzzy
                            </Badge>
                          </div>
                        </SelectItem>
                        <SelectItem value="formula">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className={getMatchTypeColor('formula')}>
                              Formula
                            </Badge>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Remove Button */}
                  <div className="col-span-1 flex justify-center">
                    {mappings.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeMapping(mapping.id)}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Validation Summary */}
        <div className="mt-6 p-4 bg-card-secondary rounded-lg">
          <div className="flex items-center justify-between">
            <div className="text-sm">
              <span className="font-medium text-foreground">
                {mappings.filter(isValidMapping).length} of {mappings.length} mappings configured
              </span>
              {!allMappingsValid && (
                <p className="text-muted-foreground mt-1">
                  Complete all mappings to proceed with reconciliation
                </p>
              )}
            </div>
            
            {allMappingsValid && (
              <div className="flex items-center gap-2 text-success">
                <Save className="w-4 h-4" />
                <span className="text-sm font-medium">Ready to reconcile</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};