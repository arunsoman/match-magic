import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Settings, ArrowRight } from 'lucide-react';
import { TransformationPipeline } from '@/types/transformations';

interface TransformationCardProps {
  transformation: TransformationPipeline;
  onEdit: (transformation: TransformationPipeline) => void;
  onDelete: (transformationId: string) => void;
}

export const TransformationCard: React.FC<TransformationCardProps> = ({
  transformation,
  onEdit,
  onDelete
}) => {
  const formatStepName = (stepName: string) => {
    return stepName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <Card className="p-3 bg-white border border-blue-100 hover:shadow-sm transition-all">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Settings className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <h4 className="font-medium text-sm text-foreground truncate">
              {transformation.name || 'Unnamed Pipeline'}
            </h4>
            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
              {transformation.steps.length} steps
            </Badge>
          </div>
          
          <div className="text-xs text-muted-foreground mb-2">
            <span className="font-medium">Column:</span> {transformation.columnId}
          </div>
          
          {transformation.steps.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              {transformation.steps
                .sort((a, b) => a.order - b.order)
                .slice(0, 3)
                .map((step, index) => (
                  <React.Fragment key={step.id}>
                    <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-xs">
                      {formatStepName(step.type)}
                    </span>
                    {index < Math.min(transformation.steps.length - 1, 2) && (
                      <ArrowRight className="w-3 h-3 text-blue-400" />
                    )}
                  </React.Fragment>
                ))
              }
              {transformation.steps.length > 3 && (
                <span className="text-blue-600 font-medium">+{transformation.steps.length - 3}</span>
              )}
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-1 ml-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(transformation)}
            className="h-7 w-7 p-0 text-blue-600 hover:bg-blue-50"
          >
            <Edit className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(transformation.id)}
            className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </Card>
  );
};
