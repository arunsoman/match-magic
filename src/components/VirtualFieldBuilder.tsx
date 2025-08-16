import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calculator, Plus, Minus, X, Divide, Hash, Calendar, Type, AlertTriangle, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { VirtualField, VirtualFormulaDefinition, Operation, FieldReference, FormulaValidationResult } from '@/types/reconciliation';
import { ExpressionEvaluator } from '@/utils/expressionEvaluator';

interface VirtualFieldBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (field: VirtualField) => void;
  availableColumns: string[];
  sourceFile: 'source' | 'target';
  editingField?: VirtualField | null;
  sampleData?: Record<string, any>[];
}

// Predefined operations
const OPERATIONS: Operation[] = [
  {
    id: 'add',
    type: 'add',
    precedence: 1,
    symbol: '+',
    label: 'Add',
    dataTypes: ['number'],
    description: 'Add two numbers'
  },
  {
    id: 'subtract',
    type: 'subtract',
    precedence: 1,
    symbol: '-',
    label: 'Subtract',
    dataTypes: ['number'],
    description: 'Subtract second number from first'
  },
  {
    id: 'multiply',
    type: 'multiply',
    precedence: 2,
    symbol: '*',
    label: 'Multiply',
    dataTypes: ['number'],
    description: 'Multiply two numbers'
  },
  {
    id: 'divide',
    type: 'divide',
    precedence: 2,
    symbol: '/',
    label: 'Divide',
    dataTypes: ['number'],
    description: 'Divide first number by second'
  },
  {
    id: 'abs',
    type: 'abs',
    precedence: 3,
    symbol: 'ABS',
    label: 'Absolute Value',
    dataTypes: ['number'],
    description: 'Get absolute value of a number'
  },
  {
    id: 'concat',
    type: 'concat',
    precedence: 1,
    symbol: '&',
    label: 'Concatenate',
    dataTypes: ['string'],
    description: 'Join two text values'
  },
  {
    id: 'negate',
    type: 'negate',
    precedence: 3,
    symbol: '-',
    label: 'Negate',
    dataTypes: ['number'],
    description: 'Make number negative'
  }
];

export const VirtualFieldBuilder: React.FC<VirtualFieldBuilderProps> = ({
  isOpen,
  onClose,
  onSave,
  availableColumns,
  sourceFile,
  editingField,
  sampleData = []
}) => {
  const [fieldName, setFieldName] = useState('');
  const [selectedFields, setSelectedFields] = useState<FieldReference[]>([]);
  const [selectedOperations, setSelectedOperations] = useState<Operation[]>([]);
  const [dataType, setDataType] = useState<'number' | 'string' | 'date' | 'boolean'>('number');
  const [rawFormula, setRawFormula] = useState('');
  const [validation, setValidation] = useState<FormulaValidationResult>({ isValid: true, errors: [], warnings: [] });
  const [showPreview, setShowPreview] = useState(false);
  const [previewResults, setPreviewResults] = useState<any[]>([]);

  useEffect(() => {
    if (editingField) {
      setFieldName(editingField.name);
      setSelectedFields(editingField.formula.fields);
      setSelectedOperations(editingField.formula.operations);
      setDataType(editingField.dataType);
      setRawFormula(editingField.formula.rawFormula);
    } else {
      resetForm();
    }
  }, [editingField, isOpen]);

  const resetForm = () => {
    setFieldName('');
    setSelectedFields([]);
    setSelectedOperations([]);
    setDataType('number');
    setRawFormula('');
    setValidation({ isValid: true, errors: [], warnings: [] });
    setShowPreview(false);
  };

  const addField = (columnName: string) => {
    if (selectedFields.some(f => f.name === columnName)) return;
    
    const newField: FieldReference = {
      id: Date.now().toString(),
      name: columnName,
      dataType: inferDataType(columnName),
      isVirtual: false
    };
    
    setSelectedFields([...selectedFields, newField]);
    updateRawFormula([...selectedFields, newField], selectedOperations);
  };

  const removeField = (fieldId: string) => {
    const updatedFields = selectedFields.filter(f => f.id !== fieldId);
    setSelectedFields(updatedFields);
    updateRawFormula(updatedFields, selectedOperations);
  };

  const addOperation = (operationType: string) => {
    const operation = OPERATIONS.find(op => op.type === operationType);
    if (!operation) return;

    setSelectedOperations([...selectedOperations, operation]);
    updateRawFormula(selectedFields, [...selectedOperations, operation]);
  };

  const removeOperation = (index: number) => {
    const updatedOperations = selectedOperations.filter((_, i) => i !== index);
    setSelectedOperations(updatedOperations);
    updateRawFormula(selectedFields, updatedOperations);
  };

  const updateRawFormula = (fields: FieldReference[], operations: Operation[]) => {
    if (fields.length === 0) {
      setRawFormula('');
      setPreviewResults([]);
      return;
    }

    if (fields.length === 1 && operations.length === 0) {
      setRawFormula(fields[0].name);
      updatePreview(fields, operations);
      return;
    }

    // Build formula string based on fields and operations
    let formula = '';
    fields.forEach((field, index) => {
      formula += field.name;
      if (index < operations.length) {
        formula += ` ${operations[index].symbol} `;
      }
    });

    setRawFormula(formula);
    updatePreview(fields, operations);
  };

  const updatePreview = (fields: FieldReference[], operations: Operation[]) => {
    if (sampleData.length === 0 || fields.length === 0) {
      setPreviewResults([]);
      return;
    }

    const formula: VirtualFormulaDefinition = {
      expression: '',
      operations,
      fields,
      rawFormula: ''
    };

    const previewResult = ExpressionEvaluator.previewFormula(formula, sampleData);
    setPreviewResults(previewResult.preview || []);
  };

  const inferDataType = (columnName: string): 'number' | 'string' | 'date' | 'boolean' => {
    const lowerName = columnName.toLowerCase();
    if (lowerName.includes('amount') || lowerName.includes('value') || lowerName.includes('price')) {
      return 'number';
    }
    if (lowerName.includes('date') || lowerName.includes('time')) {
      return 'date';
    }
    if (lowerName.includes('flag') || lowerName.includes('active') || lowerName.includes('enabled')) {
      return 'boolean';
    }
    return 'string';
  };

  const validateFormula = (): FormulaValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!fieldName.trim()) {
      errors.push('Field name is required');
    }

    if (selectedFields.length === 0) {
      errors.push('At least one field must be selected');
    }

    if (selectedFields.length > 1 && selectedOperations.length !== selectedFields.length - 1) {
      errors.push('Number of operations must be one less than number of fields');
    }

    // Check data type compatibility
    const fieldDataTypes = selectedFields.map(f => f.dataType);
    const operationDataTypes = selectedOperations.map(op => op.dataTypes).flat();
    
    if (dataType === 'number' && fieldDataTypes.some(dt => dt !== 'number')) {
      warnings.push('Some fields may not be numeric - conversion will be attempted');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  };

  const handleSave = () => {
    const validationResult = validateFormula();
    setValidation(validationResult);

    if (!validationResult.isValid) return;

    const formula: VirtualFormulaDefinition = {
      expression: rawFormula,
      operations: selectedOperations,
      fields: selectedFields,
      rawFormula
    };

    const virtualField: VirtualField = {
      id: editingField?.id || Date.now().toString(),
      name: fieldName.trim(),
      formula,
      dataType,
      sourceFile,
      createdAt: editingField?.createdAt || new Date(),
      isValid: true,
      preview: sampleData.slice(0, 5) // TODO: Compute actual preview
    };

    onSave(virtualField);
    onClose();
    resetForm();
  };

  const getDataTypeIcon = (type: string) => {
    switch (type) {
      case 'number': return <Hash className="w-3 h-3" />;
      case 'string': return <Type className="w-3 h-3" />;
      case 'date': return <Calendar className="w-3 h-3" />;
      case 'boolean': return <div className="w-3 h-3 rounded-full bg-current" />;
      default: return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            {editingField ? 'Edit Virtual Field' : 'Create Virtual Field'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Field Name and Data Type */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fieldName">Field Name</Label>
              <Input
                id="fieldName"
                value={fieldName}
                onChange={(e) => setFieldName(e.target.value)}
                placeholder="e.g., Net_Amount"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dataType">Data Type</Label>
              <Select value={dataType} onValueChange={(value: any) => setDataType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="number">
                    <div className="flex items-center gap-2">
                      <Hash className="w-3 h-3" />
                      Number
                    </div>
                  </SelectItem>
                  <SelectItem value="string">
                    <div className="flex items-center gap-2">
                      <Type className="w-3 h-3" />
                      Text
                    </div>
                  </SelectItem>
                  <SelectItem value="date">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3 h-3" />
                      Date
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Available Fields */}
          <div className="space-y-2">
            <Label>Available Fields</Label>
            <div className="flex flex-wrap gap-2 p-3 border rounded-lg bg-muted/20">
              {availableColumns.map((column) => (
                <Button
                  key={column}
                  variant="outline"
                  size="sm"
                  onClick={() => addField(column)}
                  disabled={selectedFields.some(f => f.name === column)}
                  className="h-8"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  {column}
                </Button>
              ))}
            </div>
          </div>

          {/* Formula Builder */}
          <div className="space-y-2">
            <Label>Formula Builder</Label>
            <Card className="p-4">
              <div className="space-y-4">
                {/* Selected Fields and Operations */}
                <div className="flex flex-wrap items-center gap-2 min-h-[40px] p-2 border rounded-lg bg-background">
                  {selectedFields.map((field, index) => (
                    <React.Fragment key={field.id}>
                      <Badge variant="secondary" className="flex items-center gap-1">
                        {getDataTypeIcon(field.dataType)}
                        {field.name}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeField(field.id)}
                          className="h-4 w-4 p-0 ml-1"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </Badge>
                      
                      {index < selectedOperations.length && (
                        <Badge variant="outline" className="flex items-center gap-1">
                          {selectedOperations[index].symbol}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeOperation(index)}
                            className="h-4 w-4 p-0 ml-1"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </Badge>
                      )}
                    </React.Fragment>
                  ))}
                  
                  {selectedFields.length === 0 && (
                    <span className="text-muted-foreground text-sm">
                      Add fields from above to build your formula
                    </span>
                  )}
                </div>

                {/* Operations */}
                {selectedFields.length > 0 && selectedOperations.length < selectedFields.length - 1 && (
                  <div className="space-y-2">
                    <Label className="text-sm">Add Operation</Label>
                    <div className="flex flex-wrap gap-2">
                      {OPERATIONS.filter(op => op.dataTypes.includes(dataType)).map((operation) => (
                        <Button
                          key={operation.id}
                          variant="outline"
                          size="sm"
                          onClick={() => addOperation(operation.type)}
                          className="h-8"
                        >
                          {operation.symbol} {operation.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Raw Formula Display */}
                {rawFormula && (
                  <div className="space-y-2">
                    <Label className="text-sm">Formula Preview</Label>
                    <div className="p-2 bg-muted rounded font-mono text-sm">
                      {rawFormula}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Validation Messages */}
          {(!validation.isValid || validation.warnings.length > 0) && (
            <div className="space-y-2">
              {validation.errors.map((error, index) => (
                <Alert key={index} variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ))}
              {validation.warnings.map((warning, index) => (
                <Alert key={index}>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{warning}</AlertDescription>
                </Alert>
              ))}
            </div>
          )}

          {/* Preview Toggle */}
          {sampleData.length > 0 && rawFormula && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
              >
                <Eye className="w-4 h-4 mr-2" />
                {showPreview ? 'Hide' : 'Show'} Preview
              </Button>
            </div>
          )}

          {/* Sample Data Preview */}
          {showPreview && sampleData.length > 0 && (
            <Card className="p-4">
              <Label className="text-sm font-medium mb-2 block">Sample Results (First 5 rows)</Label>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      {selectedFields.map(field => (
                        <th key={field.id} className="text-left p-2">{field.name}</th>
                      ))}
                      <th className="text-left p-2 font-bold">{fieldName || 'Result'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sampleData.slice(0, 5).map((row, index) => (
                      <tr key={index} className="border-b">
                        {selectedFields.map(field => (
                          <td key={field.id} className="p-2">{row[field.name] || 'N/A'}</td>
                        ))}
                        <td className="p-2 font-mono">
                          {previewResults[index] !== undefined ? (
                            <span className="text-foreground">{String(previewResults[index])}</span>
                          ) : (
                            <span className="text-muted-foreground">Error</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!validation.isValid}>
            {editingField ? 'Update' : 'Create'} Virtual Field
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
