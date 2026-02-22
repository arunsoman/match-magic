import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, Clock, DollarSign, Percent, Hash, Calendar, Settings } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

export interface SortConfiguration {
  sourceSortKey: string;
  targetSortKey: string;
  tolerance: number;
  toleranceUnit: 'minutes' | 'hours' | 'days' | 'amount' | 'percentage' | 'exact';
  matchStrategy: 'exact' | 'fuzzy' | 'smart';
  chunkSize: number;
}

interface SortConfigurationPanelProps {
  sourceColumns: string[];
  targetColumns: string[];
  onConfigurationChange: (config: SortConfiguration) => void;
  initialConfig?: Partial<SortConfiguration>;
  className?: string;
}

export const SortConfigurationPanel: React.FC<SortConfigurationPanelProps> = ({
  sourceColumns,
  targetColumns,
  onConfigurationChange,
  initialConfig,
  className
}) => {
  const [config, setConfig] = useState<SortConfiguration>({
    sourceSortKey: initialConfig?.sourceSortKey || '',
    targetSortKey: initialConfig?.targetSortKey || '',
    tolerance: initialConfig?.tolerance || 0,
    toleranceUnit: initialConfig?.toleranceUnit || 'exact',
    matchStrategy: initialConfig?.matchStrategy || 'smart',
    chunkSize: initialConfig?.chunkSize || 10000,
  });

  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    validateConfiguration();
    onConfigurationChange(config);
  }, [config, onConfigurationChange]);

  const validateConfiguration = () => {
    const newErrors: string[] = [];

    if (!config.sourceSortKey) {
      newErrors.push('Please select a source sort field');
    }

    if (!config.targetSortKey) {
      newErrors.push('Please select a target sort field');
    }

    if (config.toleranceUnit !== 'exact' && config.tolerance <= 0) {
      newErrors.push('Tolerance must be greater than 0 when not using exact matching');
    }

    setErrors(newErrors);
  };

  const updateConfig = (field: keyof SortConfiguration, value: any) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const getRecommendedToleranceUnit = (sourceColumn: string, targetColumn: string): string => {
    const checkColumn = (columnName: string) => {
      const lowerName = columnName.toLowerCase();
      if (lowerName.includes('date') || lowerName.includes('time') || lowerName.includes('timestamp')) {
        return 'minutes';
      }
      if (lowerName.includes('amount') || lowerName.includes('value') || lowerName.includes('price')) {
        return 'amount';
      }
      if (lowerName.includes('percent') || lowerName.includes('rate')) {
        return 'percentage';
      }
      return 'exact';
    };

    const sourceType = checkColumn(sourceColumn);
    const targetType = checkColumn(targetColumn);

    // Prioritize time-based if either field is time-related
    if (sourceType === 'minutes' || targetType === 'minutes') return 'minutes';
    if (sourceType === 'amount' || targetType === 'amount') return 'amount';
    if (sourceType === 'percentage' || targetType === 'percentage') return 'percentage';
    return 'exact';
  };

  const getColumnType = (columnName: string): 'date' | 'amount' | 'text' | 'number' => {
    const lowerName = columnName.toLowerCase();

    if (lowerName.includes('date') || lowerName.includes('time') || lowerName.includes('timestamp')) {
      return 'date';
    }
    if (lowerName.includes('amount') || lowerName.includes('value') || lowerName.includes('price') || lowerName.includes('cost')) {
      return 'amount';
    }
    if (lowerName.includes('id') || lowerName.includes('number') || lowerName.includes('count')) {
      return 'number';
    }
    return 'text';
  };

  const getColumnIcon = (columnName: string) => {
    const type = getColumnType(columnName);
    switch (type) {
      case 'date': return <Calendar className="w-3 h-3 text-blue-500" />;
      case 'amount': return <DollarSign className="w-3 h-3 text-green-500" />;
      case 'number': return <Hash className="w-3 h-3 text-purple-500" />;
      default: return null;
    }
  };

  const getToleranceLabel = () => {
    switch (config.toleranceUnit) {
      case 'minutes': return 'Minutes';
      case 'hours': return 'Hours';
      case 'days': return 'Days';
      case 'amount': return 'Amount';
      case 'percentage': return 'Percentage';
      case 'exact': return 'No Tolerance';
      default: return 'Tolerance';
    }
  };

  const getToleranceHelp = () => {
    switch (config.toleranceUnit) {
      case 'minutes': return 'Records within ± this many minutes will be considered matches';
      case 'hours': return 'Records within ± this many hours will be considered matches';
      case 'days': return 'Records within ± this many days will be considered matches';
      case 'amount': return 'Records within ± this amount will be considered matches';
      case 'percentage': return 'Records within ± this percentage will be considered matches';
      case 'exact': return 'Only exact matches will be considered';
      default: return '';
    }
  };

  const isConfigValid = errors.length === 0 && config.sourceSortKey && config.targetSortKey;

  return (
    <Card className={cn("relative", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-primary" />
          Sort & Tolerance Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Sort Field Selection */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="source-sort-field" className="text-sm font-medium">
                Source Sort Field
              </Label>
              <Select
                value={config.sourceSortKey}
                onValueChange={(value) => updateConfig('sourceSortKey', value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select source field" />
                </SelectTrigger>
                <SelectContent>
                  {sourceColumns.map((column) => (
                    <SelectItem key={column} value={column}>
                      {column}
                      {column.startsWith('VF_') && (
                        <Badge variant="secondary" className="ml-2 text-xs">
                          Virtual
                        </Badge>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Field to sort source file by
              </p>
            </div>

            <div>
              <Label htmlFor="target-sort-field" className="text-sm font-medium">
                Target Sort Field
              </Label>
              <Select
                value={config.targetSortKey}
                onValueChange={(value) => updateConfig('targetSortKey', value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select target field" />
                </SelectTrigger>
                <SelectContent>
                  {targetColumns.map((column) => (
                    <SelectItem key={column} value={column}>
                      {column}
                      {column.startsWith('VF_') && (
                        <Badge variant="secondary" className="ml-2 text-xs">
                          Virtual
                        </Badge>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Field to sort target file by
              </p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Tolerance Configuration */}
        <div className="space-y-4">
          <Label className="text-sm font-medium">Matching Tolerance</Label>

          <div className="grid grid-cols-2 gap-4">
            {/* Tolerance Value */}
            <div>
              <Label htmlFor="tolerance" className="text-sm font-medium">
                Tolerance Value
              </Label>
              <Input
                id="tolerance"
                type="number"
                min="0"
                step="0.01"
                value={config.tolerance}
                onChange={(e) => updateConfig('tolerance', parseFloat(e.target.value) || 0)}
                disabled={config.toleranceUnit === 'exact'}
                className="mt-1"
              />
            </div>

            {/* Tolerance Unit */}
            <div>
              <Label htmlFor="tolerance-unit" className="text-sm font-medium">
                Tolerance Unit
              </Label>
              <Select
                value={config.toleranceUnit}
                onValueChange={(value: any) => updateConfig('toleranceUnit', value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="exact">
                    <div className="flex items-center">
                      <Hash className="w-4 h-4 mr-2" />
                      Exact Match
                    </div>
                  </SelectItem>
                  <SelectItem value="minutes">
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-2" />
                      Minutes
                    </div>
                  </SelectItem>
                  <SelectItem value="hours">
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-2" />
                      Hours
                    </div>
                  </SelectItem>
                  <SelectItem value="days">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-2" />
                      Days
                    </div>
                  </SelectItem>
                  <SelectItem value="amount">
                    <div className="flex items-center">
                      <DollarSign className="w-4 h-4 mr-2" />
                      Amount
                    </div>
                  </SelectItem>
                  <SelectItem value="percentage">
                    <div className="flex items-center">
                      <Percent className="w-4 h-4 mr-2" />
                      Percentage
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>



          {/* Chunk Size */}
          <div className="space-y-2">
            <Label htmlFor="chunk-size" className="text-xs text-muted-foreground">
              Processing Chunk Size
            </Label>
            <Select
              value={config.chunkSize.toString()}
              onValueChange={(value) => updateConfig('chunkSize', parseInt(value))}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1000">1,000 rows (Small files)</SelectItem>
                <SelectItem value="5000">5,000 rows (Medium files)</SelectItem>
                <SelectItem value="10000">10,000 rows (Large files)</SelectItem>
                <SelectItem value="25000">25,000 rows (Very large files)</SelectItem>
                <SelectItem value="50000">50,000 rows (Huge files)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Validation Errors */}
        {errors.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <ul className="list-disc list-inside space-y-1">
                {errors.map((error, index) => (
                  <li key={index} className="text-sm">{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Configuration Summary */}
        {isConfigValid && (
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm font-medium text-green-800">Configuration Ready</span>
            </div>
            <div className="text-xs text-green-700 space-y-1">
              <div>• Source Field: <strong>{config.sourceSortKey}</strong></div>
              <div>• Target Field: <strong>{config.targetSortKey}</strong></div>
              <div>• Tolerance: <strong>
                {config.toleranceUnit === 'exact'
                  ? 'Exact matches only'
                  : `±${config.tolerance} ${config.toleranceUnit}`}
              </strong></div>

              <div>• Strategy: <strong>{config.matchStrategy}</strong></div>
              <div>• Chunk Size: <strong>{config.chunkSize.toLocaleString()} rows</strong></div>
              {config.sourceSortKey && config.targetSortKey && (
                <p className="text-xs text-muted-foreground mt-2">
                  💡 Recommended tolerance: {getRecommendedToleranceUnit(config.sourceSortKey, config.targetSortKey)}
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
