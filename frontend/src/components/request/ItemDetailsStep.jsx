import React, { useState } from 'react';

const ItemDetailsStep = ({ data, updateData, onNext }) => {
  const [errors, setErrors] = useState({});

  const applianceOptions = [
    'Refrigerator',
    'Washing Machine',
    'Air Conditioner',
    'Television',
    'Laptop',
    'Desktop Computer',
    'Mobile Phone',
    'Microwave',
    'Printer',
    'Other'
  ];

  const conditionOptions = [
    'Excellent',
    'Good',
    'Fair',
    'Damaged',
    'Not Working'
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('dimensions.')) {
      const field = name.split('.')[1];
      updateData({
        dimensions: {
          ...data.dimensions,
          [field]: value
        }
      });
    } else {
      updateData({ [name]: value });
    }
    // Clear field error
    if (errors[name]) {
      setErrors({ ...errors, [name]: null });
    }
  };

  const validate = () => {
    const tempErrors = {};
    if (!data.applianceType) tempErrors.applianceType = 'Appliance Type is required';
    if (!data.dimensions.width) tempErrors['dimensions.width'] = 'Width is required';
    else if (isNaN(data.dimensions.width) || Number(data.dimensions.width) <= 0) {
      tempErrors['dimensions.width'] = 'Invalid width';
    }
    if (!data.dimensions.length) tempErrors['dimensions.length'] = 'Length is required';
    else if (isNaN(data.dimensions.length) || Number(data.dimensions.length) <= 0) {
      tempErrors['dimensions.length'] = 'Invalid length';
    }
    if (!data.dimensions.height) tempErrors['dimensions.height'] = 'Height is required';
    else if (isNaN(data.dimensions.height) || Number(data.dimensions.height) <= 0) {
      tempErrors['dimensions.height'] = 'Invalid height';
    }
    if (!data.estimatedWeight) tempErrors.estimatedWeight = 'Estimated Weight is required';
    else if (isNaN(data.estimatedWeight) || Number(data.estimatedWeight) <= 0) {
      tempErrors.estimatedWeight = 'Weight must be greater than 0';
    }
    if (!data.condition) tempErrors.condition = 'Condition is required';

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
      <h3 className="step-heading">Step 1: Item Details</h3>
      <p className="step-subtitle">Tell us about the electronic item you want to recycle.</p>

      <div className="form-group">
        <label className="form-label" htmlFor="applianceType">Appliance Type *</label>
        <select
          id="applianceType"
          name="applianceType"
          className="form-select"
          value={data.applianceType}
          onChange={handleChange}
          required
        >
          <option value="">Select appliance type</option>
          {applianceOptions.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
        {errors.applianceType && <div className="form-error-msg">{errors.applianceType}</div>}
      </div>

      <div className="form-group">
        <label className="form-label">Dimensions (cm) *</label>
        <div className="dimensions-row">
          <div>
            <input
              type="number"
              name="dimensions.width"
              placeholder="Width (cm)"
              className="form-input"
              value={data.dimensions.width}
              onChange={handleChange}
              aria-label="Width"
              required
            />
            {errors['dimensions.width'] && <div className="form-error-msg">{errors['dimensions.width']}</div>}
          </div>
          <div>
            <input
              type="number"
              name="dimensions.length"
              placeholder="Length (cm)"
              className="form-input"
              value={data.dimensions.length}
              onChange={handleChange}
              aria-label="Length"
              required
            />
            {errors['dimensions.length'] && <div className="form-error-msg">{errors['dimensions.length']}</div>}
          </div>
          <div>
            <input
              type="number"
              name="dimensions.height"
              placeholder="Height (cm)"
              className="form-input"
              value={data.dimensions.height}
              onChange={handleChange}
              aria-label="Height"
              required
            />
            {errors['dimensions.height'] && <div className="form-error-msg">{errors['dimensions.height']}</div>}
          </div>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="estimatedWeight">Estimated Weight (kg) *</label>
        <input
          type="number"
          id="estimatedWeight"
          name="estimatedWeight"
          placeholder="e.g. 5"
          className="form-input"
          value={data.estimatedWeight}
          onChange={handleChange}
          required
        />
        {errors.estimatedWeight && <div className="form-error-msg">{errors.estimatedWeight}</div>}
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="condition">Condition *</label>
        <select
          id="condition"
          name="condition"
          className="form-select"
          value={data.condition}
          onChange={handleChange}
          required
        >
          <option value="">Select condition</option>
          {conditionOptions.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
        {errors.condition && <div className="form-error-msg">{errors.condition}</div>}
      </div>

      <div className="wizard-buttons">
        <button type="submit" className="btn-primary">
          Next
        </button>
      </div>
    </form>
  );
};

export default ItemDetailsStep;
