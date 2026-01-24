import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api, { authAPI } from '../utils/auth.js';

const ChargingRequestForm = () => {
  const { state } = useAuth();
  const [formData, setFormData] = useState({
    location: '',
    urgency: 'medium',
    message: '',
    phoneNumber: '',
    estimatedTime: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.location.trim()) {
      newErrors.location = 'Location is required';
    }

    if (!formData.urgency) {
      newErrors.urgency = 'Urgency is required';
    }

    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = 'Phone number is required';
    }

    // Phone number validation
    const phoneRegex = /^[\+]?[(]?[0-9]{1,3}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,4}[-\s\.]?[0-9]{1,9}$/;
    if (formData.phoneNumber && !phoneRegex.test(formData.phoneNumber.trim())) {
      newErrors.phoneNumber = 'Please enter a valid phone number';
    }

    if (formData.estimatedTime && (isNaN(formData.estimatedTime) || formData.estimatedTime < 1)) {
      newErrors.estimatedTime = 'Estimated time must be a positive number (minutes)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    setErrors({});

    try {
      const requestData = {
        location: formData.location.trim(),
        urgency: formData.urgency.toLowerCase(),
        message: formData.message.trim(),
        phoneNumber: formData.phoneNumber.trim(),
        estimatedTime: formData.estimatedTime ? parseInt(formData.estimatedTime) : null
      };

      const response = await api.post('/charging/requests', requestData);
      
      if (response.data.success) {
        setFormData({
          location: '',
          urgency: 'medium',
          message: '',
          phoneNumber: '',
          estimatedTime: ''
        });
        
        alert('Charging request created successfully!');
        window.location.href = '/dashboard';
      } else {
        setErrors({ general: response.data.message || 'Failed to create charging request' });
      }
    } catch (error) {
      setErrors({ general: error.response?.data?.message || error.message || 'Failed to create charging request' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  if (!state.isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Please log in to create a charging request</h2>
          <a href="/login" className="text-blue-600 hover:text-blue-500 underline">Sign In</a>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-4 bg-white rounded-lg shadow">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Create Charging Request</h2>
      
      {errors.general && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{errors.general}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Location *</label>
          <textarea
            name="location"
            value={formData.location}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
              errors.location ? 'border-red-500' : 'border-gray-300'
            }`}
            rows={3}
            placeholder="Enter your location"
          />
          {errors.location && <p className="mt-1 text-sm text-red-600">{errors.location}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Urgency *</label>
          <select
            name="urgency"
            value={formData.urgency}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
              errors.urgency ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="">Select urgency</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
          {errors.urgency && <p className="mt-1 text-sm text-red-600">{errors.urgency}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
          <textarea
            name="message"
            value={formData.message}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
              errors.message ? 'border-red-500' : 'border-gray-300'
            }`}
            rows={3}
            placeholder="Additional details (optional)"
          />
          {errors.message && <p className="mt-1 text-sm text-red-600">{errors.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
          <input
            type="tel"
            name="phoneNumber"
            value={formData.phoneNumber}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
              errors.phoneNumber ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Enter your phone number"
          />
          {errors.phoneNumber && <p className="mt-1 text-sm text-red-600">{errors.phoneNumber}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Time (minutes)</label>
          <input
            type="number"
            name="estimatedTime"
            value={formData.estimatedTime}
            onChange={handleChange}
            min="1"
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
              errors.estimatedTime ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Estimated time needed"
          />
          {errors.estimatedTime && <p className="mt-1 text-sm text-red-600">{errors.estimatedTime}</p>}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {isSubmitting ? 'Creating...' : 'Create Request'}
        </button>
      </form>
    </div>
  );
};

export default ChargingRequestForm;
