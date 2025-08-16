import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Plus, Trash2, Save, Calculator, Lightbulb, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ColumnMapping, VirtualField } from '@/types/reconciliation';
import { FormulaMapper } from '@/components/FormulaMapper';
import { VirtualFieldManager } from '@/components/VirtualFieldManager';
import { VirtualFieldBuilder } from '@/components/VirtualFieldBuilder';
import { DataTransformer } from '@/utils/dataTransformation';

interface ColumnMapperProps {
  sourceColumns: string[];
  targetColumns: string[];
  sourceFileName: string;
  targetFileName: string;
  onMappingsChange: (mappings: ColumnMapping[]) => void;
  onVirtualFieldsChange?: (sourceVFs: VirtualField[], targetVFs: VirtualField[]) => void;
  className?: string;
}

export const ColumnMapper: React.FC<ColumnMapperProps> = ({
  sourceColumns,
  targetColumns,
  sourceFileName,
  targetFileName,
  onMappingsChange,
  onVirtualFieldsChange,
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
  const [virtualFields, setVirtualFields] = useState<VirtualField[]>([]);
  const [showVirtualFieldDialog, setShowVirtualFieldDialog] = useState(false);
  const [editingVirtualField, setEditingVirtualField] = useState<VirtualField | null>(null);
  const [virtualFieldSourceFile, setVirtualFieldSourceFile] = useState<'source' | 'target'>('source');

  useEffect(() => {
    // Get formula suggestions when columns change
    const formulaSuggestions = DataTransformer.suggestFormulaMappings(sourceColumns, targetColumns);
    setSuggestions(formulaSuggestions);
  }, [sourceColumns, targetColumns]);

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

  // Virtual field handlers
  const handleCreateVirtualField = (sourceFile: 'source' | 'target') => {
    setVirtualFieldSourceFile(sourceFile);
    setEditingVirtualField(null);
    setShowVirtualFieldDialog(true);
  };

  const handleEditVirtualField = (field: VirtualField) => {
    setEditingVirtualField(field);
    setVirtualFieldSourceFile(field.sourceFile);
    setShowVirtualFieldDialog(true);
  };

  const handleDeleteVirtualField = (fieldId: string) => {
    setVirtualFields(prev => prev.filter(f => f.id !== fieldId));
  };

  const handleSaveVirtualField = (field: VirtualField) => {
    setVirtualFields(prev => {
      const existing = prev.find(f => f.id === field.id);
      let newVirtualFields;
      if (existing) {
        newVirtualFields = prev.map(f => f.id === field.id ? field : f);
      } else {
        newVirtualFields = [...prev, field];
      }
      
      // Notify parent component
      if (onVirtualFieldsChange) {
        const sourceVFs = newVirtualFields.filter(f => f.sourceFile === 'source');
        const targetVFs = newVirtualFields.filter(f => f.sourceFile === 'target');
        onVirtualFieldsChange(sourceVFs, targetVFs);
      }
      
      return newVirtualFields;
    });
  };

  const canCreateVirtualField = (sourceFile: 'source' | 'target') => {
    return virtualFields.filter(f => f.sourceFile === sourceFile).length < 5;
  };

  // Get combined columns (real + virtual) for each file
  const getColumnsWithVirtual = (sourceFile: 'source' | 'target') => {
    const realColumns = sourceFile === 'source' ? sourceColumns : targetColumns;
    const virtualCols = virtualFields
      .filter(f => f.sourceFile === sourceFile && f.isValid)
      .map(f => f.name);
    return [...realColumns, ...virtualCols];
  };

  return (
    <Card className={cn("relative", className)}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-foreground">Column Mapping</h3>
        </div>


        {/* Virtual Fields Section */}
        {(virtualFields.length > 0 || true) && (
          <div className="mb-6 p-4 bg-accent/5 rounded-lg border border-border/50">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Virtual Fields
              </h4>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCreateVirtualField('source')}
                  disabled={!canCreateVirtualField('source')}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Source
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCreateVirtualField('target')}
                  disabled={!canCreateVirtualField('target')}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Target
                </Button>
              </div>
            </div>
            
            {virtualFields.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <VirtualFieldManager
                    virtualFields={virtualFields}
                    sourceFile="source"
                    onEdit={handleEditVirtualField}
                    onDelete={handleDeleteVirtualField}
                  />
                </div>
                <div>
                  <VirtualFieldManager
                    virtualFields={virtualFields}
                    sourceFile="target"
                    onEdit={handleEditVirtualField}
                    onDelete={handleDeleteVirtualField}
                  />
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-2">
                No virtual fields created yet. Click the buttons above to create computed columns.
              </p>
            )}
          </div>
        )}

        <div className="space-y-4">
          {/* Header */}
          <div className="grid grid-cols-12 gap-4 text-sm font-medium text-muted-foreground border-b border-border pb-2">
            <div className="col-span-4">Source Column</div>
            <div className="col-span-1"></div>
            <div className="col-span-4">Target Column</div>
            <div className="col-span-2">Match Type</div>
            <div className="col-span-1"></div>
          </div>

          {/* Mappings */}
          {mappings.map((mapping, index) => (
            <div key={mapping.id} className="space-y-4">
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
                        {getColumnsWithVirtual('source').map((column) => (
                          <SelectItem key={column} value={column}>
                            <div className="flex items-center gap-2">
                              {virtualFields.some(f => f.name === column && f.sourceFile === 'source') && (
                                <Calculator className="w-3 h-3 text-primary" />
                              )}
                              {column}
                            </div>
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
                        {getColumnsWithVirtual('target').map((column) => (
                          <SelectItem key={column} value={column}>
                            <div className="flex items-center gap-2">
                              {virtualFields.some(f => f.name === column && f.sourceFile === 'target') && (
                                <Calculator className="w-3 h-3 text-primary" />
                              )}
                              {column}
                            </div>
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
            </div>
          ))}
          
          {/* Add Mapping Button - moved below mappings for better UX */}
          <div className="flex justify-center pt-4">
            <Button variant="outline" size="sm" onClick={addMapping}>
              <Plus className="w-4 h-4 mr-2" />
              Add Mapping
            </Button>
          </div>
        </div>

        {/* Validation Summary */}
        <div className="mt-6 p-3 bg-card-secondary rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">
              {mappings.filter(isValidMapping).length} of {mappings.length} mappings configured
            </span>
            
            {allMappingsValid ? (
              <div className="flex items-center gap-2 text-success">
                <Save className="w-4 h-4" />
                <span className="text-sm font-medium">Ready to reconcile</span>
              </div>
            ) : (
              <span className="text-xs text-muted-foreground">
                Complete all mappings to proceed
              </span>
            )}
          </div>
        </div>

        {/* Virtual Field Builder Dialog */}
        <VirtualFieldBuilder
          isOpen={showVirtualFieldDialog}
          onClose={() => setShowVirtualFieldDialog(false)}
          onSave={handleSaveVirtualField}
          availableColumns={virtualFieldSourceFile === 'source' ? sourceColumns : targetColumns}
          sourceFile={virtualFieldSourceFile}
          editingField={editingVirtualField}
          sampleData={[]} // TODO: Pass actual sample data when available
        />
      </div>
    </Card>
  );
};