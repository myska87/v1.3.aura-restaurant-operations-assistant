/**
 * SOP Step Timeline Component
 * Beautiful step-by-step visualization
 */

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Circle, Clock, User, Wrench, AlertTriangle, Play, Image as ImageIcon } from 'lucide-react';

export default function SOPStepTimeline({ steps = [], onStepComplete, readonly = false }) {
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [currentStep, setCurrentStep] = useState(0);

  const handleStepComplete = (stepIndex) => {
    if (readonly) return;
    
    const newCompleted = new Set(completedSteps);
    if (completedSteps.has(stepIndex)) {
      newCompleted.delete(stepIndex);
    } else {
      newCompleted.add(stepIndex);
    }
    setCompletedSteps(newCompleted);

    if (onStepComplete) {
      onStepComplete(stepIndex, !completedSteps.has(stepIndex));
    }

    // Move to next incomplete step
    if (!completedSteps.has(stepIndex)) {
      const nextStep = steps.findIndex((_, i) => i > stepIndex && !completedSteps.has(i));
      if (nextStep !== -1) {
        setCurrentStep(nextStep);
      }
    }
  };

  const totalTime = steps.reduce((sum, step) => sum + (step.time_estimate_minutes || 0), 0);
  const completedCount = completedSteps.size;
  const progress = steps.length > 0 ? Math.round((completedCount / steps.length) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Progress Summary */}
      {!readonly && (
        <Card className="bg-gradient-to-r from-[#014D40] to-emerald-600 text-white border-none">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-lg">Progress</h3>
              <span className="text-2xl font-bold">{progress}%</span>
            </div>
            <div className="h-2 bg-white/30 rounded-full overflow-hidden mb-3">
              <div
                className="h-full bg-white transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-sm opacity-90">
              <span>{completedCount} / {steps.length} steps completed</span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                ~{totalTime} min total
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Steps Timeline */}
      <div className="space-y-4">
        {steps.map((step, index) => {
          const isCompleted = completedSteps.has(index);
          const isCurrent = index === currentStep && !readonly;
          const isLocked = !readonly && index > 0 && !completedSteps.has(index - 1);

          return (
            <div
              key={index}
              className={`relative pl-8 ${
                index < steps.length - 1 ? 'pb-8' : ''
              }`}
            >
              {/* Vertical line */}
              {index < steps.length - 1 && (
                <div className="absolute left-[15px] top-8 bottom-0 w-0.5 bg-gray-200">
                  <div
                    className="bg-emerald-500 w-full transition-all duration-300"
                    style={{
                      height: isCompleted ? '100%' : '0%'
                    }}
                  />
                </div>
              )}

              {/* Step indicator */}
              <div className="absolute left-0 top-0">
                {isCompleted ? (
                  <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                ) : (
                  <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${
                    isCurrent
                      ? 'border-[#014D40] bg-[#014D40] animate-pulse'
                      : isLocked
                        ? 'border-gray-300 bg-gray-100'
                        : 'border-gray-400 bg-white'
                  }`}>
                    {isCurrent ? (
                      <Play className="w-4 h-4 text-white" />
                    ) : (
                      <Circle className="w-3 h-3 text-gray-400" />
                    )}
                  </div>
                )}
              </div>

              {/* Step content */}
              <Card className={`${
                isCurrent ? 'border-2 border-[#014D40] shadow-lg' : 'border-gray-200'
              } ${isLocked ? 'opacity-50' : ''}`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-semibold text-gray-500">
                          Step {step.step_number || index + 1}
                        </span>
                        {step.time_estimate_minutes && (
                          <Badge variant="outline" className="text-xs">
                            <Clock className="w-3 h-3 mr-1" />
                            {step.time_estimate_minutes} min
                          </Badge>
                        )}
                      </div>
                      <h4 className="text-lg font-bold text-gray-900 mb-2">
                        {step.title}
                      </h4>
                      <p className="text-gray-700 leading-relaxed">
                        {step.description}
                      </p>
                    </div>

                    {!readonly && !isLocked && (
                      <Button
                        onClick={() => handleStepComplete(index)}
                        variant={isCompleted ? "outline" : "default"}
                        size="sm"
                        className={isCompleted ? "border-emerald-500 text-emerald-700" : "bg-emerald-600 hover:bg-emerald-700"}
                      >
                        {isCompleted ? 'Undo' : 'Complete'}
                      </Button>
                    )}
                  </div>

                  {/* Additional info */}
                  <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                    {step.role_responsible && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <User className="w-4 h-4 text-emerald-600" />
                        <span className="font-medium">Responsible:</span>
                        <span className="capitalize">{step.role_responsible}</span>
                      </div>
                    )}

                    {step.equipment_needed && step.equipment_needed.length > 0 && (
                      <div className="flex items-start gap-2 text-sm text-gray-600">
                        <Wrench className="w-4 h-4 text-emerald-600 mt-0.5" />
                        <div>
                          <span className="font-medium">Equipment needed:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {step.equipment_needed.map((eq, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {eq}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {step.safety_notes && (
                      <div className="flex items-start gap-2 text-sm bg-amber-50 p-3 rounded-lg border border-amber-200">
                        <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="font-medium text-amber-900">Safety Note:</span>
                          <p className="text-amber-800 mt-1">{step.safety_notes}</p>
                        </div>
                      </div>
                    )}

                    {/* Media */}
                    {(step.image_url || step.video_url) && (
                      <div className="grid grid-cols-2 gap-3 mt-3">
                        {step.image_url && (
                          <div className="relative h-40 rounded-lg overflow-hidden border border-gray-200">
                            <img
                              src={step.image_url}
                              alt={step.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        {step.video_url && (
                          <div className="relative h-40 rounded-lg overflow-hidden border border-gray-200 bg-gray-100 flex items-center justify-center">
                            <video
                              src={step.video_url}
                              controls
                              className="w-full h-full"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>
    </div>
  );
}