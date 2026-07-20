import React, { useState } from 'react';
import { Calendar, Zap, Check } from 'lucide-react';

const FulfillmentStep = ({ data, updateData, onNext, onBack }) => {
  const [errors, setErrors] = useState({});

  const handleSelectFulfillment = (type) => {
    updateData({ fulfillmentType: type });
    if (errors.fulfillmentType) {
      setErrors({ ...errors, fulfillmentType: null });
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    updateData({ [name]: value });
    if (errors[name]) {
      setErrors({ ...errors, [name]: null });
    }
  };

  const validate = () => {
    const tempErrors = {};
    if (!data.fulfillmentType) {
      tempErrors.fulfillmentType = 'Please select a fulfillment option';
    }
    if (!data.address?.trim()) {
      tempErrors.address = 'Address is required';
    }
    if (!data.city?.trim()) {
      tempErrors.city = 'City is required';
    }
    if (!data.state?.trim()) {
      tempErrors.state = 'State is required';
    }
    if (!data.postalCode?.trim()) {
      tempErrors.postalCode = 'Postal Code is required';
    } else if (!/^\d{5,8}$/.test(data.postalCode.trim())) {
      tempErrors.postalCode = 'Postal Code must be between 5 and 8 digits';
    }

    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onNext();
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <h3 className="step-heading">Step 3: Choose Fulfillment Option AND enter you complete address</h3>
      <p className="step-subtitle">Select how you want your e-waste collected and specify your pickup location.</p>

      {/* Selectable Cards */}
      <div className="form-group">
        <label className="form-label" style={{ marginBottom: '1rem' }}>Fulfillment Option *</label>
        <div className="fulfillment-options-grid">
          <div 
            className={`fulfillment-card ${data.fulfillmentType === 'standard' ? 'selected' : ''}`}
            onClick={() => handleSelectFulfillment('standard')}
          >
            <div className="fulfillment-icon">
              <Calendar size={24} />
            </div>
            <div className="fulfillment-details">
              <div className="fulfillment-title">Standard Weekend Pickup</div>
              <div className="fulfillment-desc">Pickup will be scheduled on the weekend using our fleet.</div>
            </div>
            <div className="selection-indicator">
              {data.fulfillmentType === 'standard' && <Check size={12} strokeWidth={3} />}
            </div>
          </div>

          <div 
            className={`fulfillment-card ${data.fulfillmentType === 'priority' ? 'selected' : ''}`}
            onClick={() => handleSelectFulfillment('priority')}
          >
            <div className="fulfillment-icon">
              <Zap size={24} />
            </div>
            <div className="fulfillment-details">
              <div className="fulfillment-title">Priority Immediate Pickup</div>
              <div className="fulfillment-desc">Get immediate pickup at a higher cost.</div>
            </div>
            <div className="selection-indicator">
              {data.fulfillmentType === 'priority' && <Check size={12} strokeWidth={3} />}
            </div>
          </div>
        </div>
        {errors.fulfillmentType && <div className="form-error-msg">{errors.fulfillmentType}</div>}
      </div>

      {/* Address Form Fields */}
      <div className="address-section-divider" style={{ margin: '2rem 0 1rem 0', borderTop: '1px solid var(--dash-border)', paddingTop: '1.5rem' }}>
        <h4 className="form-label" style={{ fontSize: '1rem', fontWeight: 600 }}>Pickup Address details *</h4>
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="address">Street Address *</label>
        <textarea
          id="address"
          name="address"
          rows="3"
          placeholder="Enter your complete street address, building name, flat number, etc."
          className="form-textarea"
          value={data.address}
          onChange={handleInputChange}
          required
        />
        {errors.address && <div className="form-error-msg">{errors.address}</div>}
      </div>

      <div className="dimensions-row">
        <div className="form-group">
          <label className="form-label" htmlFor="city">City *</label>
          <input
            type="text"
            id="city"
            name="city"
            placeholder="e.g. Mumbai"
            className="form-input"
            value={data.city}
            onChange={handleInputChange}
            required
          />
          {errors.city && <div className="form-error-msg">{errors.city}</div>}
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="state">State *</label>
          <input
            type="text"
            id="state"
            name="state"
            placeholder="e.g. Maharashtra"
            className="form-input"
            value={data.state}
            onChange={handleInputChange}
            required
          />
          {errors.state && <div className="form-error-msg">{errors.state}</div>}
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="postalCode">Postal Code / Zip *</label>
          <input
            type="text"
            id="postalCode"
            name="postalCode"
            placeholder="e.g. 400001"
            className="form-input"
            value={data.postalCode}
            onChange={handleInputChange}
            required
          />
          {errors.postalCode && <div className="form-error-msg">{errors.postalCode}</div>}
        </div>
      </div>

      <div className="wizard-buttons">
        <button type="button" className="btn-secondary" onClick={onBack}>
          Back
        </button>
        <button type="submit" className="btn-primary">
          Next
        </button>
      </div>
    </form>
  );
};

export default FulfillmentStep;
