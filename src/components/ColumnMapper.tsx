import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Plus, Trash2, Save, Calculator, Lightbulb, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ColumnMapping, VirtualField } from '@/types/reconciliation';
import { TransformationPipeline } from '@/types/transformations';
import { FormulaMapper } from '@/components/FormulaMapper';
import { VirtualFieldManager } from '@/components/VirtualFieldManager';
import { VirtualFieldBuilder } from '@/components/VirtualFieldBuilder';
import { TransformationBuilder } from '@/components/TransformationBuilder';
import { TransformationCard } from '@/components/TransformationCard';
import { DataTransformer } from '@/utils/dataTransformation';

interface ColumnMapperProps {
  sourceColumns: string[];
  targetColumns: string[];
  sourceFileName: string;
  targetFileName: string;
  onMappingsChange: (mappings: ColumnMapping[]) => void;
  onVirtualFieldsChange?: (sourceVFs: VirtualField[], targetVFs: VirtualField[]) => void;
  onTransformationsChange?: (transformations: TransformationPipeline[]) => void;
  sampleData?: { source: Record<string, any>[]; target: Record<string, any>[] };
  className?: string;
}

export const ColumnMapper: React.FC<ColumnMapperProps> = ({
  sourceColumns,
  targetColumns,
  sourceFileName,
  targetFileName,
  onMappingsChange,
  onVirtualFieldsChange,
  onTransformationsChange,
  sampleData,
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
  const [transformations, setTransformations] = useState<TransformationPipeline[]>([]);
  const [showVirtualFieldDialog, setShowVirtualFieldDialog] = useState(false);
  const [showTransformationDialog, setShowTransformationDialog] = useState(false);
  const [editingVirtualField, setEditingVirtualField] = useState<VirtualField | null>(null);
  const [editingTransformation, setEditingTransformation] = useState<TransformationPipeline | null>(null);
  const [virtualFieldSourceFile, setVirtualFieldSourceFile] = useState<'source' | 'target'>('source');
  const [transformationSourceFile, setTransformationSourceFile] = useState<'source' | 'target'>('source');

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

  // Handle virtual field operations
  const handleCreateVirtualField = (sourceFile: 'source' | 'target') => {
    setVirtualFieldSourceFile(sourceFile);
    setEditingVirtualField(null);
    setShowVirtualFieldDialog(true);
  };

  const handleEditVirtualField = (virtualField: VirtualField) => {
    setEditingVirtualField(virtualField);
    setVirtualFieldSourceFile(virtualField.sourceFile);
    setShowVirtualFieldDialog(true);
  };

  const handleDeleteVirtualField = (virtualFieldId: string) => {
    const updatedVirtualFields = virtualFields.filter(vf => vf.id !== virtualFieldId);
    setVirtualFields(updatedVirtualFields);
    
    if (onVirtualFieldsChange) {
      const sourceVFs = updatedVirtualFields.filter(vf => vf.sourceFile === 'source');
      const targetVFs = updatedVirtualFields.filter(vf => vf.sourceFile === 'target');
      onVirtualFieldsChange(sourceVFs, targetVFs);
    }
  };

  const handleSaveVirtualField = (virtualField: VirtualField) => {
    let updatedVirtualFields: VirtualField[];
    
    if (editingVirtualField) {
      updatedVirtualFields = virtualFields.map(vf => 
        vf.id === editingVirtualField.id ? virtualField : vf
      );
    } else {
      updatedVirtualFields = [...virtualFields, virtualField];
    }
    
    setVirtualFields(updatedVirtualFields);
    
    if (onVirtualFieldsChange) {
      const sourceVFs = updatedVirtualFields.filter(vf => vf.sourceFile === 'source');
      const targetVFs = updatedVirtualFields.filter(vf => vf.sourceFile === 'target');
      onVirtualFieldsChange(sourceVFs, targetVFs);
    }
    
    setShowVirtualFieldDialog(false);
    setEditingVirtualField(null);
  };

  // Handle transformation operations
  const handleCreateTransformation = (sourceFile: 'source' | 'target') => {
    setTransformationSourceFile(sourceFile);
    setEditingTransformation(null);
    setShowTransformationDialog(true);
  };

  const handleEditTransformation = (transformation: TransformationPipeline) => {
    setEditingTransformation(transformation);
    setTransformationSourceFile(transformation.sourceFile);
    setShowTransformationDialog(true);
  };

  const handleDeleteTransformation = (transformationId: string) => {
    const updatedTransformations = transformations.filter(t => t.id !== transformationId);
    setTransformations(updatedTransformations);
    
    if (onTransformationsChange) {
      onTransformationsChange(updatedTransformations);
    }
  };

  const handleSaveTransformation = (transformation: TransformationPipeline) => {
    let updatedTransformations: TransformationPipeline[];
    
    if (editingTransformation) {
      updatedTransformations = transformations.map(t => 
        t.id === editingTransformation.id ? transformation : t
      );
    } else {
      updatedTransformations = [...transformations, transformation];
    }
    
    setTransformations(updatedTransformations);
    
    if (onTransformationsChange) {
      onTransformationsChange(updatedTransformations);
    }
    
    setShowTransformationDialog(false);
    setEditingTransformation(null);
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
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-foreground">Column Mapping</h2>
        <p className="text-muted-foreground">Configure how your data columns should be mapped and processed</p>
      </div>

      {/* Advanced Processing Panel - Only show when needed */}
      {(virtualFields.length > 0 || transformations.length > 0) && (
        <Card className="border-dashed">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-foreground">Advanced Processing</h3>
              <div className="flex gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCreateVirtualField('source')}
                  disabled={!canCreateVirtualField('source')}
                  className="text-primary hover:text-primary/80"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Add Virtual Field
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCreateTransformation('source')}
                  className="text-blue-600 hover:text-blue-500"
                >
                  <Calculator className="w-4 h-4 mr-2" />
                  Add Transformation
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Virtual Fields Column */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <h4 className="font-medium text-foreground">Virtual Fields</h4>
                  <Badge variant="secondary" className="text-xs">
                    {virtualFields.length}
                  </Badge>
                </div>
                {virtualFields.length > 0 ? (
                  <div className="grid grid-cols-1 gap-2">
                    <VirtualFieldManager
                      virtualFields={virtualFields}
                      sourceFile="source"
                      onEdit={handleEditVirtualField}
                      onDelete={handleDeleteVirtualField}
                    />
                    <VirtualFieldManager
                      virtualFields={virtualFields}
                      sourceFile="target"
                      onEdit={handleEditVirtualField}
                      onDelete={handleDeleteVirtualField}
                    />
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No virtual fields created</p>
                )}
              </div>

              {/* Transformations Column */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-blue-600" />
                  <h4 className="font-medium text-foreground">Data Transformations</h4>
                  <Badge variant="secondary" className="text-xs">
                    {transformations.length}
                  </Badge>
                </div>
                {transformations.length > 0 ? (
                  <div className="space-y-3">
                    {transformations.map(transformation => (
                      <TransformationCard
                        key={transformation.id}
                        transformation={transformation}
                        onEdit={handleEditTransformation}
                        onDelete={handleDeleteTransformation}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No transformations created</p>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Quick Actions for first-time users */}
      {virtualFields.length === 0 && transformations.length === 0 && (
        <Card className="border-dashed bg-muted/20">
          <div className="p-6 text-center space-y-4">
            <div className="flex justify-center gap-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Sparkles className="w-4 h-4" />
                Need computed fields?
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calculator className="w-4 h-4" />
                Need data preprocessing?
              </div>
            </div>
            <div className="flex justify-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCreateVirtualField('source')}
                className="border-primary/20 text-primary hover:bg-primary/5"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Create Virtual Field
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCreateTransformation('source')}
                className="border-blue-200 text-blue-600 hover:bg-blue-50"
              >
                <Calculator className="w-4 h-4 mr-2" />
                Add Transformation
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Main Mapping Section */}
      <Card>

        <div className="p-6 space-y-6">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-foreground">Field Mappings</h3>
            <p className="text-sm text-muted-foreground">Map columns between your source and target files</p>
          </div>

          {/* Elegant Header Row */}
          <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-muted/30 rounded-lg">
            <div className="col-span-4 text-sm font-medium text-muted-foreground">
              Source ({sourceFileName})
            </div>
            <div className="col-span-1"></div>
            <div className="col-span-4 text-sm font-medium text-muted-foreground">
              Target ({targetFileName})
            </div>
            <div className="col-span-2 text-sm font-medium text-muted-foreground">Match Type</div>
            <div className="col-span-1"></div>
          </div>

          {/* Clean Mapping Rows */}
          <div className="space-y-3">
            {mappings.map((mapping, index) => (
              <div key={mapping.id} className="grid grid-cols-12 gap-4 p-4 rounded-lg border bg-card hover:bg-muted/10 transition-colors">
                {/* Source Column */}
                <div className="col-span-4">
                  <Select
                    value={typeof mapping.sourceColumn === 'string' ? mapping.sourceColumn : ''}
                    onValueChange={(value) => updateMapping(mapping.id, 'sourceColumn', value)}
                  >
                    <SelectTrigger className={cn(
                      "w-full border-0 bg-background shadow-sm",
                      !mapping.sourceColumn && "text-muted-foreground"
                    )}>
                      <SelectValue placeholder="Choose column..." />
                    </SelectTrigger>
                    <SelectContent>
                      {getColumnsWithVirtual('source').map((column) => (
                        <SelectItem key={column} value={column}>
                          <div className="flex items-center gap-2">
                            {virtualFields.some(f => f.name === column && f.sourceFile === 'source') && (
                              <Sparkles className="w-3 h-3 text-primary" />
                            )}
                            <span className="truncate">{column}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Arrow */}
                <div className="col-span-1 flex justify-center items-center">
                  <ArrowRight className={cn(
                    "w-4 h-4 transition-colors",
                    isValidMapping(mapping) ? "text-success" : "text-muted-foreground"
                  )} />
                </div>

                {/* Target Column */}
                <div className="col-span-4">
                  <Select
                    value={mapping.targetColumn}
                    onValueChange={(value) => updateMapping(mapping.id, 'targetColumn', value)}
                  >
                    <SelectTrigger className={cn(
                      "w-full border-0 bg-background shadow-sm",
                      !mapping.targetColumn && "text-muted-foreground"
                    )}>
                      <SelectValue placeholder="Choose column..." />
                    </SelectTrigger>
                    <SelectContent>
                      {getColumnsWithVirtual('target').map((column) => (
                        <SelectItem key={column} value={column}>
                          <div className="flex items-center gap-2">
                            {virtualFields.some(f => f.name === column && f.sourceFile === 'target') && (
                              <Sparkles className="w-3 h-3 text-primary" />
                            )}
                            <span className="truncate">{column}</span>
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
                    <SelectTrigger className="w-full border-0 bg-background shadow-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="exact">
                        <Badge variant="secondary" className={getMatchTypeColor('exact')}>
                          Exact
                        </Badge>
                      </SelectItem>
                      <SelectItem value="fuzzy">
                        <Badge variant="secondary" className={getMatchTypeColor('fuzzy')}>
                          Fuzzy
                        </Badge>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Actions */}
                <div className="col-span-1 flex justify-center items-center">
                  {mappings.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeMapping(mapping.id)}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {/* Add Mapping Button */}
          <div className="flex justify-center pt-2">
            <Button 
              variant="outline" 
              onClick={addMapping}
              className="border-dashed border-2 hover:border-solid"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Another Mapping
            </Button>
          </div>

          {/* Status Footer */}
          <div className="flex items-center justify-between p-4 bg-muted/20 rounded-lg">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">
                {mappings.filter(isValidMapping).length} of {mappings.length} mappings ready
              </span>
            </div>
            
            {allMappingsValid ? (
              <div className="flex items-center gap-2 text-success">
                <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
                <span className="text-sm font-medium">Ready to reconcile</span>
              </div>
            ) : (
              <span className="text-xs text-muted-foreground">
                Complete remaining mappings to proceed
              </span>
            )}
          </div>
        </div>
      </Card>

      {/* Dialog Components */}
      <VirtualFieldBuilder
        isOpen={showVirtualFieldDialog}
        onClose={() => setShowVirtualFieldDialog(false)}
        onSave={handleSaveVirtualField}
        availableColumns={virtualFieldSourceFile === 'source' ? sourceColumns : targetColumns}
        initialVirtualField={editingVirtualField}
        sourceFile={virtualFieldSourceFile}
      />

      <TransformationBuilder
        isOpen={showTransformationDialog}
        onClose={() => setShowTransformationDialog(false)}
        onSave={handleSaveTransformation}
        availableColumns={transformationSourceFile === 'source' ? [...sourceColumns, ...virtualFields.filter(vf => vf.sourceFile === 'source').map(vf => vf.name)] : [...targetColumns, ...virtualFields.filter(vf => vf.sourceFile === 'target').map(vf => vf.name)]}
        sampleData={sampleData?.[transformationSourceFile] || []}
        initialPipeline={editingTransformation}
        sourceFile={transformationSourceFile}
      />
    </div>
  );
};