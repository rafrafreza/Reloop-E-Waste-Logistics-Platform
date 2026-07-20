import React from 'react';
import { Check } from 'lucide-react';

const RequestStepper = ({ currentStep }) => {
  const steps = [
    { number: 1, label: 'Item Details' },
    { number: 2, label: 'Upload Media' },
    { number: 3, label: 'Fulfillment & Address' },
    { number: 4, label: 'Summary' }
  ];

  // Calculate progress percentage for the line
  // Step 1: 0%, Step 2: 33.3%, Step 3: 66.6%, Step 4: 100%
  const progressPercent = ((currentStep - 1) / (steps.length - 1)) * 100;

  return (
    <div className="stepper-container">
      <div className="stepper-line">
        <div 
          className="stepper-line-progress" 
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {steps.map((step) => {
        const isCompleted = step.number < currentStep;
        const isActive = step.number === currentStep;
        
        let itemClass = '';
        if (isCompleted) itemClass = 'completed';
        else if (isActive) itemClass = 'active';

        return (
          <div key={step.number} className={`step-item ${itemClass}`}>
            <div className="step-circle">
              {isCompleted ? (
                <Check size={18} strokeWidth={3} />
              ) : (
                <span>{step.number}</span>
              )}
            </div>
            <span className="step-label">{step.label}</span>
          </div>
        );
      })}
    </div>
  );
};

export default RequestStepper;
