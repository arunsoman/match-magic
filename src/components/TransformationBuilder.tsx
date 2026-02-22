import React, { useState, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Plus,
  Trash2,
  GripVertical,
  Play,
  Save,
  RotateCcw,
  Settings,
  Eye,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

import {
  TransformationPipeline,
  TransformationStep,
  TransformationType,
  TransformationPreset,
  TransformationPreview,
  TRANSFORMATION_CONFIGS,
  BUILT_IN_PRESETS
} from '@/types/transformations';
import { TransformationEngine } from '@/utils/transformationEngine';

interface TransformationBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (pipeline: TransformationPipeline) => void;
  availableColumns: string[];
  sampleData?: Record<string, any>[];
  initialPipeline?: TransformationPipeline;
  sourceFile: 'source' | 'target';
}

export const TransformationBuilder: React.FC<TransformationBuilderProps> = ({
  isOpen,
  onClose,
  onSave,
  availableColumns,
  sampleData = [],
  initialPipeline,
  sourceFile
}) => {
  const [pipeline, setPipeline] = useState<TransformationPipeline>(() =>
    initialPipeline || {
      id: Date.now().toString(),
      name: '',
      columnId: '',
      sourceFile,
      steps: [],
      createdAt: new Date(),
      updatedAt: new Date()
    }
  );

  const [selectedColumn, setSelectedColumn] = useState(initialPipeline?.columnId || '');
  const [draggedStepId, setDraggedStepId] = useState<string | null>(null);
  const [preview, setPreview] = useState<TransformationPreview | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Reset state when dialog opens with new/different initialPipeline
  useEffect(() => {
    if (isOpen) {
      const newPipeline = initialPipeline || {
        id: Date.now().toString(),
        name: '',
        columnId: '',
        sourceFile,
        steps: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      setPipeline(newPipeline);
      setSelectedColumn(initialPipeline?.columnId || '');
      setPreview(null);
      setShowPreview(false);
      setValidationErrors([]);
    }
  }, [isOpen, initialPipeline, sourceFile]);

  // Add new transformation step
  const addStep = useCallback((type: TransformationType) => {
    const newStep: TransformationStep = {
      id: Date.now().toString(),
      type,
      name: TRANSFORMATION_CONFIGS[type].name,
      description: TRANSFORMATION_CONFIGS[type].description,
      parameters: {},
      order: pipeline.steps.length
    };

    // Set default parameters
    const config = TRANSFORMATION_CONFIGS[type];
    const defaultParams: Record<string, any> = {};
    config.parameters.forEach(param => {
      if (param.default !== undefined) {
        defaultParams[param.name] = param.default;
      }
    });
    newStep.parameters = defaultParams;

    setPipeline(prev => ({
      ...prev,
      steps: [...prev.steps, newStep],
      updatedAt: new Date()
    }));
  }, [pipeline.steps.length]);

  // Remove transformation step
  const removeStep = useCallback((stepId: string) => {
    setPipeline(prev => ({
      ...prev,
      steps: prev.steps.filter(s => s.id !== stepId).map((step, index) => ({
        ...step,
        order: index
      })),
      updatedAt: new Date()
    }));
  }, []);

  // Update step parameters
  const updateStepParameter = useCallback((stepId: string, paramName: string, value: any) => {
    setPipeline(prev => ({
      ...prev,
      steps: prev.steps.map(step =>
        step.id === stepId
          ? { ...step, parameters: { ...step.parameters, [paramName]: value } }
          : step
      ),
      updatedAt: new Date()
    }));
  }, []);

  // Drag and drop handlers
  const handleDragStart = useCallback((e: React.DragEvent, stepId: string) => {
    setDraggedStepId(stepId);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetStepId: string) => {
    e.preventDefault();

    if (!draggedStepId || draggedStepId === targetStepId) {
      setDraggedStepId(null);
      return;
    }

    const draggedIndex = pipeline.steps.findIndex(s => s.id === draggedStepId);
    const targetIndex = pipeline.steps.findIndex(s => s.id === targetStepId);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedStepId(null);
      return;
    }

    const newSteps = [...pipeline.steps];
    const [draggedStep] = newSteps.splice(draggedIndex, 1);
    newSteps.splice(targetIndex, 0, draggedStep);

    // Update order
    const reorderedSteps = newSteps.map((step, index) => ({
      ...step,
      order: index
    }));

    setPipeline(prev => ({
      ...prev,
      steps: reorderedSteps,
      updatedAt: new Date()
    }));

    setDraggedStepId(null);
  }, [draggedStepId, pipeline.steps]);

  // Generate preview
  const generatePreview = useCallback(() => {
    if (!selectedColumn || !sampleData.length || !pipeline.steps.length) {
      setPreview(null);
      return;
    }

    const columnData = sampleData.map(row => row[selectedColumn]);
    const pipelineWithColumn = { ...pipeline, columnId: selectedColumn };

    const previewResult = TransformationEngine.generatePreview(columnData, pipelineWithColumn);
    setPreview(previewResult);
    setShowPreview(true);
  }, [selectedColumn, sampleData, pipeline]);

  // Load preset
  const loadPreset = useCallback((preset: TransformationPreset) => {
    const presetSteps: TransformationStep[] = preset.steps.map((step, index) => ({
      id: Date.now().toString() + index,
      ...step,
      order: index
    }));

    setPipeline(prev => ({
      ...prev,
      name: preset.name,
      steps: presetSteps,
      updatedAt: new Date()
    }));
  }, []);

  // Validate pipeline
  const validatePipeline = useCallback(() => {
    if (!selectedColumn) {
      setValidationErrors(['Please select a column to transform']);
      return false;
    }

    if (!pipeline.name.trim()) {
      setValidationErrors(['Please enter a pipeline name']);
      return false;
    }

    const pipelineWithColumn = { ...pipeline, columnId: selectedColumn };
    const validation = TransformationEngine.validatePipeline(pipelineWithColumn);

    setValidationErrors(validation.errors);
    return validation.valid;
  }, [selectedColumn, pipeline]);

  // Save pipeline
  const handleSave = useCallback(() => {
    if (!validatePipeline()) return;

    const finalPipeline: TransformationPipeline = {
      ...pipeline,
      columnId: selectedColumn,
      updatedAt: new Date()
    };

    onSave(finalPipeline);
    onClose();
  }, [pipeline, selectedColumn, validatePipeline, onSave, onClose]);

  // Reset pipeline
  const resetPipeline = useCallback(() => {
    setPipeline({
      id: Date.now().toString(),
      name: '',
      columnId: '',
      outputColumn: '',
      sourceFile,
      steps: [],
      createdAt: new Date(),
      updatedAt: new Date()
    });
    setSelectedColumn('');
    setPreview(null);
    setShowPreview(false);
    setValidationErrors([]);
  }, [sourceFile]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Transformation Pipeline Builder
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Pipeline Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pipeline-name">Pipeline Name</Label>
              <Input
                id="pipeline-name"
                value={pipeline.name}
                onChange={(e) => setPipeline(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter pipeline name..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="column-select">Target Column</Label>
              <Select value={selectedColumn} onValueChange={setSelectedColumn}>
                <SelectTrigger>
                  <SelectValue placeholder="Select column to transform" />
                </SelectTrigger>
                <SelectContent>
                  {availableColumns.map(column => (
                    <SelectItem key={column} value={column}>
                      {column}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="output-column-name">Output Column Name (Optional)</Label>
              <Input
                id="output-column-name"
                value={pipeline.outputColumn || ''}
                onChange={(e) => setPipeline(prev => ({ ...prev, outputColumn: e.target.value }))}
                placeholder="Leave blank to overwrite"
              />
            </div>
          </div>

          {/* Preset Loader */}
          <div className="space-y-2">
            <Label>Load Preset</Label>
            <div className="flex flex-wrap gap-2">
              {BUILT_IN_PRESETS.map(preset => (
                <Button
                  key={preset.id}
                  variant="outline"
                  size="sm"
                  onClick={() => loadPreset(preset)}
                  className="text-xs"
                >
                  {preset.name}
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {preset.category}
                  </Badge>
                </Button>
              ))}
            </div>
          </div>

          {/* Add Transformation Step */}
          <div className="space-y-2">
            <Label>Add Transformation Step</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {Object.entries(TRANSFORMATION_CONFIGS).map(([type, config]) => (
                <Button
                  key={type}
                  variant="outline"
                  size="sm"
                  onClick={() => addStep(type as TransformationType)}
                  className="justify-start text-xs h-auto p-2"
                >
                  <div className="text-left">
                    <div className="font-medium">{config.name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {config.category}
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </div>

          {/* Transformation Steps */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Transformation Steps ({pipeline.steps.length})</Label>
              {pipeline.steps.length > 0 && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={generatePreview}
                    disabled={!selectedColumn || !sampleData.length}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    Preview
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetPipeline}
                  >
                    <RotateCcw className="w-4 h-4 mr-1" />
                    Reset
                  </Button>
                </div>
              )}
            </div>

            {pipeline.steps.length === 0 ? (
              <Card className="p-8 text-center text-muted-foreground">
                <Settings className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No transformation steps added yet.</p>
                <p className="text-sm">Add steps above to build your pipeline.</p>
              </Card>
            ) : (
              <div className="space-y-2">
                {pipeline.steps
                  .sort((a, b) => a.order - b.order)
                  .map((step, index) => (
                    <TransformationStepCard
                      key={step.id}
                      step={step}
                      index={index}
                      onRemove={removeStep}
                      onUpdateParameter={updateStepParameter}
                      onDragStart={handleDragStart}
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                      isDragging={draggedStepId === step.id}
                    />
                  ))}
              </div>
            )}
          </div>

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <Card className="p-4 border-destructive bg-destructive/5">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
                <div>
                  <h4 className="font-medium text-destructive">Validation Errors</h4>
                  <ul className="mt-1 text-sm text-destructive space-y-1">
                    {validationErrors.map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>
          )}

          {/* Preview Results */}
          {showPreview && preview && (
            <TransformationPreviewCard
              preview={preview}
              onClose={() => setShowPreview(false)}
            />
          )}

          {/* Actions */}
          <div className="flex justify-between pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={generatePreview}
                disabled={!selectedColumn || !sampleData.length || pipeline.steps.length === 0}
              >
                <Play className="w-4 h-4 mr-2" />
                Test Pipeline
              </Button>
              <Button onClick={handleSave}>
                <Save className="w-4 h-4 mr-2" />
                Save Pipeline
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Individual transformation step card component
interface TransformationStepCardProps {
  step: TransformationStep;
  index: number;
  onRemove: (stepId: string) => void;
  onUpdateParameter: (stepId: string, paramName: string, value: any) => void;
  onDragStart: (e: React.DragEvent, stepId: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, stepId: string) => void;
  isDragging: boolean;
}

const TransformationStepCard: React.FC<TransformationStepCardProps> = ({
  step,
  index,
  onRemove,
  onUpdateParameter,
  onDragStart,
  onDragOver,
  onDrop,
  isDragging
}) => {
  const config = TRANSFORMATION_CONFIGS[step.type];
  const [expanded, setExpanded] = useState(false);

  return (
    <Card
      className={cn(
        "p-4 transition-all duration-200",
        isDragging && "opacity-50 scale-95",
        "hover:shadow-md"
      )}
      draggable
      onDragStart={(e) => onDragStart(e, step.id)}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, step.id)}
    >
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
          <Badge variant="outline" className="text-xs">
            {index + 1}
          </Badge>
        </div>

        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">{step.name}</h4>
              <p className="text-sm text-muted-foreground">{step.description}</p>
            </div>
            <div className="flex items-center gap-2">
              {config.parameters.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpanded(!expanded)}
                >
                  <Settings className="w-4 h-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemove(step.id)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Parameter Configuration */}
      {expanded && config.parameters.length > 0 && (
        <div className="mt-4 pt-4 border-t space-y-3">
          {config.parameters.map(param => (
            <div key={param.name} className="space-y-1">
              <Label className="text-xs font-medium">
                {param.name}
                {param.required && <span className="text-destructive ml-1">*</span>}
              </Label>
              <ParameterInput
                parameter={param}
                value={step.parameters[param.name]}
                onChange={(value) => onUpdateParameter(step.id, param.name, value)}
              />
              {param.description && (
                <p className="text-xs text-muted-foreground">{param.description}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

// Parameter input component
interface ParameterInputProps {
  parameter: any;
  value: any;
  onChange: (value: any) => void;
}

const ParameterInput: React.FC<ParameterInputProps> = ({ parameter, value, onChange }) => {
  switch (parameter.type) {
    case 'boolean':
      return (
        <div className="flex items-center space-x-2">
          <Switch
            checked={value || false}
            onCheckedChange={onChange}
          />
          <span className="text-sm">{value ? 'Yes' : 'No'}</span>
        </div>
      );

    case 'number':
      return (
        <Input
          type="number"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
          className="text-sm"
        />
      );

    case 'select':
      return (
        <Select value={value || ''} onValueChange={onChange}>
          <SelectTrigger className="text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {parameter.options?.map((option: any) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );

    case 'string':
    default:
      return (
        <Input
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="text-sm"
        />
      );
  }
};

// Preview results component
interface TransformationPreviewCardProps {
  preview: TransformationPreview;
  onClose: () => void;
}

const TransformationPreviewCard: React.FC<TransformationPreviewCardProps> = ({ preview, onClose }) => {
  return (
    <Card className="p-4 bg-accent/5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Eye className="w-5 h-5 text-primary" />
          <h4 className="font-medium">Transformation Preview</h4>
          <Badge variant={preview.successRate === 1 ? "default" : "destructive"}>
            {Math.round(preview.successRate * 100)}% success
          </Badge>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          ×
        </Button>
      </div>

      <div className="space-y-3 overflow-x-auto pb-2">
        {preview.results.map((result, index) => (
          <div key={index} className="flex items-center gap-4 p-2 bg-background rounded border min-w-max">
            <div className="flex items-center gap-2">
              {result.success ? (
                <CheckCircle className="w-4 h-4 text-success" />
              ) : (
                <AlertCircle className="w-4 h-4 text-destructive" />
              )}
              <Badge variant="outline" className="text-xs">
                {index + 1}
              </Badge>
            </div>

            <div className="flex-1 grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Original:</span>
                <span className="ml-2 font-mono">{String(result.originalValue)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Result:</span>
                <span className="ml-2 font-mono">
                  {result.success ? String(result.transformedValue) : result.error}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {preview.errorCount > 0 && (
        <div className="mt-3 p-2 bg-destructive/10 rounded text-sm text-destructive">
          {preview.errorCount} of {preview.results.length} transformations failed
        </div>
      )}
    </Card>
  );
};
