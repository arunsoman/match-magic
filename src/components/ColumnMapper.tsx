import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Plus, Trash2, Save } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ColumnMapping {
  id: string;
  sourceColumn: string;
  targetColumn: string;
  matchType: 'exact' | 'fuzzy';
  tolerance?: number;
}

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

  const addMapping = () => {
    const newMapping: ColumnMapping = {
      id: Date.now().toString(),
      sourceColumn: '',
      targetColumn: '',
      matchType: 'exact'
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

  const getMatchTypeColor = (type: 'exact' | 'fuzzy') => {
    return type === 'exact' ? 'bg-success' : 'bg-warning';
  };

  const isValidMapping = (mapping: ColumnMapping) => {
    return mapping.sourceColumn && mapping.targetColumn;
  };

  const allMappingsValid = mappings.every(isValidMapping);

  return (
    <Card className={cn("relative", className)}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-foreground">Column Mapping</h3>
          <Button variant="outline" size="sm" onClick={addMapping}>
            <Plus className="w-4 h-4 mr-2" />
            Add Mapping
          </Button>
        </div>

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
            <div key={mapping.id} className="grid grid-cols-12 gap-4 items-center">
              {/* Source Column */}
              <div className="col-span-4">
                <Select
                  value={mapping.sourceColumn}
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
                  onValueChange={(value: 'exact' | 'fuzzy') => updateMapping(mapping.id, 'matchType', value)}
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