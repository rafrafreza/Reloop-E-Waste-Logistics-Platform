import React, { useState } from 'react';
import { Edit3, CheckCircle, Video, ArrowRight, Loader2 } from 'lucide-react';
import { createPickupRequest } from '../../api/pickups';

const RequestSummaryStep = ({ data, onEditStep, onBack, onSubmitSuccess }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [apiError, setApiError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError('');
    setIsSubmitting(true);

    try {
      await createPickupRequest(data);
      setShowModal(true);
    } catch (err) {
      console.error(err);
      setApiError(err.response?.data?.detail || 'Failed to submit pickup request. Please try again.');
      setIsSubmitting(false);
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
    onSubmitSuccess(); // This will trigger redirection to active requests
  };

  return (
    <div>
      <h3 className="step-heading">Step 4: Review Your Request</h3>
      <p className="step-subtitle">Please review all details before submitting your e-waste collection request.</p>

      {apiError && (
        <div className="auth-error-alert" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', color: '#B91C1C', borderRadius: '8px', fontSize: '0.875rem' }}>
          <span>{apiError}</span>
        </div>
      )}

      <div className="summary-container">
        {/* Section 1: Item Details */}
        <div className="summary-section">
          <div className="summary-section-header">
            <h4 className="summary-section-title">Item Details</h4>
            <button 
              type="button" 
              className="btn-edit" 
              onClick={() => onEditStep(1)}
              aria-label="Edit Item Details"
            >
              <Edit3 size={14} style={{ marginRight: '4px', display: 'inline' }} />
              Edit
            </button>
          </div>
          <div className="summary-grid">
            <div className="summary-item">
              <span className="summary-label">Appliance Type</span>
              <span className="summary-value">{data.applianceType}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Dimensions (W × L × H)</span>
              <span className="summary-value">
                {data.dimensions.width} cm × {data.dimensions.length} cm × {data.dimensions.height} cm
              </span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Estimated Weight</span>
              <span className="summary-value">{data.estimatedWeight} kg</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Condition</span>
              <span className="summary-value">{data.condition}</span>
            </div>
          </div>
        </div>

        {/* Section 2: Uploaded Media */}
        <div className="summary-section">
          <div className="summary-section-header">
            <h4 className="summary-section-title">Uploaded Media</h4>
            <button 
              type="button" 
              className="btn-edit" 
              onClick={() => onEditStep(2)}
              aria-label="Edit Media"
            >
              <Edit3 size={14} style={{ marginRight: '4px', display: 'inline' }} />
              Edit
            </button>
          </div>
          <div className="summary-media-row">
            {data.media.map((item, idx) => {
              const isImage = item.type.startsWith('image/');
              return isImage ? (
                <img 
                  key={idx} 
                  src={item.previewUrl} 
                  alt={`Thumbnail ${idx}`} 
                  className="summary-media-thumb" 
                />
              ) : (
                <div key={idx} className="summary-media-file">
                  <Video size={16} />
                  <span>{item.name}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 3: Fulfillment & Address */}
        <div className="summary-section">
          <div className="summary-section-header">
            <h4 className="summary-section-title">Fulfillment & Pickup Address</h4>
            <button 
              type="button" 
              className="btn-edit" 
              onClick={() => onEditStep(3)}
              aria-label="Edit Fulfillment and Address"
            >
              <Edit3 size={14} style={{ marginRight: '4px', display: 'inline' }} />
              Edit
            </button>
          </div>
          <div className="summary-grid">
            <div className="summary-item">
              <span className="summary-label">Fulfillment Option</span>
              <span className="summary-value" style={{ textTransform: 'capitalize' }}>
                {data.fulfillmentType === 'standard' ? 'Standard Weekend Pickup' : 'Priority Immediate Pickup'}
              </span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Street Address</span>
              <span className="summary-value">{data.address}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">City</span>
              <span className="summary-value">{data.city}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">State / Postal Code</span>
              <span className="summary-value">{data.state} - {data.postalCode}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="wizard-buttons">
        <button 
          type="button" 
          className="btn-secondary" 
          onClick={onBack}
          disabled={isSubmitting}
        >
          Back
        </button>
        <button 
          type="button" 
          className="btn-primary" 
          onClick={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 size={16} className="animate-spin" style={{ animation: 'spin 1s linear infinite', marginRight: '8px' }} />
              Submitting...
            </>
          ) : (
            'Confirm & Submit Request'
          )}
        </button>
      </div>

      {/* Success Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="success-modal">
            <div className="modal-icon-container">
              <CheckCircle size={36} />
            </div>
            <h4 className="modal-title">Request Submitted Successfully!</h4>
            <p className="modal-message">
              Your e-waste collection request has been submitted and is awaiting evaluation.
            </p>
            <button 
              type="button" 
              className="btn-primary" 
              onClick={handleModalClose}
              style={{ width: '100%' }}
            >
              <span>Go to Active Requests</span>
              <ArrowRight size={16} style={{ marginLeft: '8px', display: 'inline' }} />
            </button>
          </div>
        </div>
      )}

      {/* Basic Keyframe Animation Inject for loader spin */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default RequestSummaryStep;
