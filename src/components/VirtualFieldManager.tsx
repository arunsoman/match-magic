import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Calculator, Edit, Trash2, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { VirtualField } from '@/types/reconciliation';

interface VirtualFieldManagerProps {
  virtualFields: VirtualField[];
  sourceFile: 'source' | 'target';
  onEdit: (field: VirtualField) => void;
  onDelete: (fieldId: string) => void;
  className?: string;
}

export const VirtualFieldManager: React.FC<VirtualFieldManagerProps> = ({
  virtualFields,
  sourceFile,
  onEdit,
  onDelete,
  className
}) => {
  const fieldsForFile = virtualFields.filter(field => field.sourceFile === sourceFile);

  if (fieldsForFile.length === 0) {
    return null;
  }

  const getDataTypeColor = (dataType: string) => {
    switch (dataType) {
      case 'number': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'string': return 'bg-green-100 text-green-800 border-green-200';
      case 'date': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'boolean': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <Card className={cn("mt-4 border-l-4 border-l-primary bg-accent/5", className)}>
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Calculator className="w-4 h-4 text-primary" />
          <h4 className="text-sm font-medium text-foreground">
            Virtual Fields ({fieldsForFile.length}/5)
          </h4>
        </div>

        <div className="space-y-2">
          {fieldsForFile.map((field) => (
            <div
              key={field.id}
              className="flex items-center justify-between p-3 bg-background rounded-lg border border-border"
            >
              <div className="flex items-center gap-3 flex-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                    <Calculator className="w-3 h-3 mr-1" />
                    Virtual
                  </Badge>
                  <Badge variant="outline" className={getDataTypeColor(field.dataType)}>
                    {field.dataType}
                  </Badge>
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">{field.name}</span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="w-3 h-3 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="max-w-xs">
                            <p className="font-medium mb-1">Formula:</p>
                            <p className="text-sm">{field.formula.rawFormula}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Fields: {field.formula.fields.map(f => f.name).join(', ')}
                            </p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  
                  <p className="text-xs text-muted-foreground mt-1">
                    {field.formula.rawFormula}
                  </p>
                </div>

                {!field.isValid && (
                  <Badge variant="destructive" className="text-xs">
                    Invalid
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(field)}
                  className="h-8 w-8 p-0"
                >
                  <Edit className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(field.id)}
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {fieldsForFile.length >= 5 && (
          <div className="mt-3 p-2 bg-warning/10 rounded-lg border border-warning/20">
            <p className="text-xs text-warning-foreground">
              Maximum of 5 virtual fields per file reached
            </p>
          </div>
        )}
      </div>
    </Card>
  );
};
