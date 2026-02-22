import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Plus, Trash2, Save, Calculator, Lightbulb, Sparkles, Download, Upload } from 'lucide-react';
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
  sortConfiguration?: import('@/components/SortConfigurationPanel').SortConfiguration;
  onSortConfigurationChange?: (config: import('@/components/SortConfigurationPanel').SortConfiguration) => void;
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
  sortConfiguration,
  onSortConfigurationChange,
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
  const fileInputRef = React.useRef<HTMLInputElement>(null);

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

  // Get combined columns (real + virtual + pipeline outputs) for each file
  const getColumnsWithVirtual = (sourceFile: 'source' | 'target') => {
    const realColumns = sourceFile === 'source' ? sourceColumns : targetColumns;
    const virtualCols = virtualFields
      .filter(f => f.sourceFile === sourceFile && f.isValid)
      .map(f => f.name);
    const pipelineCols = transformations
      .filter(t => t.sourceFile === sourceFile && t.outputColumn)
      .map(t => t.outputColumn as string);
    return Array.from(new Set([...realColumns, ...virtualCols, ...pipelineCols]));
  };

  const handleExportConfig = () => {
    const config = {
      mappings,
      virtualFields,
      transformations,
      sortConfiguration,
      version: '1.0'
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(config, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "match_magic_mapping_config.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImportConfig = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const config = JSON.parse(content);

        if (config.mappings) {
          setMappings(config.mappings);
          onMappingsChange(config.mappings);
        }

        if (config.virtualFields) {
          setVirtualFields(config.virtualFields);
          if (onVirtualFieldsChange) {
            const sourceVFs = config.virtualFields.filter((vf: VirtualField) => vf.sourceFile === 'source');
            const targetVFs = config.virtualFields.filter((vf: VirtualField) => vf.sourceFile === 'target');
            onVirtualFieldsChange(sourceVFs, targetVFs);
          }
        }

        if (config.transformations) {
          setTransformations(config.transformations);
          onTransformationsChange?.(config.transformations);
        }

        if (config.sortConfiguration && onSortConfigurationChange) {
          onSortConfigurationChange(config.sortConfiguration);
        }
      } catch (error) {
        console.error("Failed to parse config file", error);
        alert("Invalid configuration file format. Please upload a valid JSON file exported from Match Magic.");
      }

      // Reset input value to allow importing the same file again if needed
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };

    reader.readAsText(file);
  };

  return (
    <Card className={cn("relative", className)}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-foreground">Column Mapping</h3>
          <div className="flex gap-2">
            <input
              type="file"
              accept=".json"
              style={{ display: 'none' }}
              ref={fileInputRef}
              onChange={handleImportConfig}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-4 h-4 mr-2" />
              Import
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportConfig}
              disabled={mappings.length === 0 && virtualFields.length === 0 && transformations.length === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>


        {/* Data Processing Section */}
        <div className="mb-6 space-y-4">
          {/* Virtual Fields */}
          <div className="p-4 bg-accent/5 rounded-lg border border-border/50">
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

          {/* Transformations */}
          <div className="p-4 bg-blue-50/50 rounded-lg border border-blue-200/50">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                <Calculator className="w-4 h-4 text-blue-600" />
                Data Transformations
              </h4>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCreateTransformation('source')}
                  className="border-blue-200 text-blue-700 hover:bg-blue-50"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Source
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCreateTransformation('target')}
                  className="border-blue-200 text-blue-700 hover:bg-blue-50"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Target
                </Button>
              </div>
            </div>

            {transformations.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Source Transformations</h5>
                  {transformations
                    .filter(t => t.sourceFile === 'source')
                    .map(transformation => (
                      <TransformationCard
                        key={transformation.id}
                        transformation={transformation}
                        onEdit={handleEditTransformation}
                        onDelete={handleDeleteTransformation}
                      />
                    ))
                  }
                  {transformations.filter(t => t.sourceFile === 'source').length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      No source transformations
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Target Transformations</h5>
                  {transformations
                    .filter(t => t.sourceFile === 'target')
                    .map(transformation => (
                      <TransformationCard
                        key={transformation.id}
                        transformation={transformation}
                        onEdit={handleEditTransformation}
                        onDelete={handleDeleteTransformation}
                      />
                    ))
                  }
                  {transformations.filter(t => t.sourceFile === 'target').length === 0 && (
                    <p className="text-xs text-muted-foreground italic">No target transformations</p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-2">
                No transformations created yet. Click the buttons above to create data preprocessing pipelines.
              </p>
            )}
          </div>
        </div>

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
          editingField={editingVirtualField}
          sampleData={virtualFieldSourceFile === 'source' ? sampleData.source : sampleData.target}
          sourceFile={virtualFieldSourceFile}
        />

        {/* Transformation Builder Dialog */}
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
    </Card>
  );
};