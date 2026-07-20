import React, { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import RequestStepper from '../../components/dashboard/RequestStepper';
import ItemDetailsStep from '../../components/request/ItemDetailsStep';
import MediaUploadStep from '../../components/request/MediaUploadStep';
import FulfillmentStep from '../../components/request/FulfillmentStep';
import RequestSummaryStep from '../../components/request/RequestSummaryStep';

const NewRequestPage = () => {
  const navigate = useNavigate();
  const { userProfile } = useOutletContext();
  const [step, setStep] = useState(1);

  const [formData, setFormData] = useState({
    applianceType: '',
    dimensions: {
      width: '',
      length: '',
      height: ''
    },
    estimatedWeight: '',
    condition: '',
    media: [],
    fulfillmentType: '',
    address: '',
    city: '',
    state: '',
    postalCode: ''
  });

  // Pre-fill address fields if they exist in user profile
  useEffect(() => {
    if (userProfile?.customer_profile) {
      const { address, city, state, postal_code } = userProfile.customer_profile;
      setFormData((prev) => ({
        ...prev,
        address: prev.address || address || '',
        city: prev.city || city || '',
        state: prev.state || state || '',
        postalCode: prev.postalCode || postal_code || ''
      }));
    }
  }, [userProfile]);

  const updateFormData = (newData) => {
    setFormData((prev) => ({
      ...prev,
      ...newData
    }));
  };

  const handleNext = () => {
    setStep((prev) => Math.min(prev + 1, 4));
  };

  const handleBack = () => {
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleEditStep = (stepNumber) => {
    setStep(stepNumber);
  };

  const handleSubmitSuccess = () => {
    navigate('/dashboard/requests/active');
  };

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">New E-Waste Request</h2>
        <p className="page-subtitle">Provide details about your e-waste for a quick pickup.</p>
      </div>

      <RequestStepper currentStep={step} />

      <div className="form-card">
        {step === 1 && (
          <ItemDetailsStep 
            data={formData} 
            updateData={updateFormData} 
            onNext={handleNext} 
          />
        )}
        {step === 2 && (
          <MediaUploadStep 
            data={formData} 
            updateData={updateFormData} 
            onNext={handleNext} 
            onBack={handleBack} 
          />
        )}
        {step === 3 && (
          <FulfillmentStep 
            data={formData} 
            updateData={updateFormData} 
            onNext={handleNext} 
            onBack={handleBack} 
          />
        )}
        {step === 4 && (
          <RequestSummaryStep 
            data={formData} 
            onEditStep={handleEditStep} 
            onBack={handleBack} 
            onSubmitSuccess={handleSubmitSuccess} 
          />
        )}
      </div>
    </div>
  );
};

export default NewRequestPage;
