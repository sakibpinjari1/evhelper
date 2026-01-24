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

  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case 'low': return 'bg-green-500/20 border-green-500/50 text-green-300';
      case 'medium': return 'bg-amber-500/20 border-amber-500/50 text-amber-300';
      case 'high': return 'bg-red-500/20 border-red-500/50 text-red-300';
      default: return 'bg-gray-500/20 border-gray-500/50 text-gray-300';
    }
  };

  const getUrgencyIcon = (urgency) => {
    switch (urgency) {
      case 'low': return '🟢';
      case 'medium': return '🟡';
      case 'high': return '🔴';
      default: return '⚪';
    }
  };

  if (!state.isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Please log in to create a charging request</h2>
          <a href="/login" className="text-cyan-400 hover:text-cyan-300 underline">
            Sign In
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 relative z-10">
      <div className="ev-container">
        <div className="ev-card">
          <div className="p-6 lg:p-8">
            {/* Header */}
            <div className="ev-section ev-text-center">
              <div className="mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-linear-to-br from-cyan-400 to-blue-500 rounded-full ev-charging-pulse">
                  <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                  </svg>
                </div>
              </div>
              <h1 className="ev-heading-1 ev-neon-text mb-2">Create Charging Request</h1>
              <p className="ev-text-muted">Get emergency charging assistance from community</p>
            </div>

            {/* Error Display */}
            {errors.general && (
              <div className="ev-form-field p-4 bg-red-500/20 border border-red-500/50 text-red-300 rounded-lg backdrop-blur-sm">
                <div className="ev-text-body">{errors.general}</div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Location Field */}
              <div>
                <label htmlFor="location" className="block text-sm font-medium text-gray-300 mb-2">
                  Location *
                </label>
                <textarea
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  className={`ev-input w-full resize-none ${errors.location ? 'border-red-500' : ''}`}
                  rows={3}
                  placeholder="Enter your current location or address"
                />
                {errors.location && (
                  <p className="mt-1 text-sm text-red-400">{errors.location}</p>
                )}
              </div>

              {/* Urgency Field */}
              <div>
                <label htmlFor="urgency" className="block text-sm font-medium text-gray-300 mb-2">
                  Urgency Level *
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {['low', 'medium', 'high'].map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, urgency: level }))}
                      className={`p-3 rounded-lg border transition-all duration-300 ${
                        formData.urgency === level
                          ? getUrgencyColor(level)
                          : 'bg-gray-800/50 border-gray-600 text-gray-400 hover:border-gray-500'
                      }`}
                    >
                      <div className="text-center">
                        <div className="text-2xl mb-1">{getUrgencyIcon(level)}</div>
                        <div className="text-sm font-medium capitalize">{level}</div>
                      </div>
                    </button>
                  ))}
                </div>
                {errors.urgency && (
                  <p className="mt-1 text-sm text-red-400">{errors.urgency}</p>
                )}
              </div>

              {/* Message Field */}
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-300 mb-2">
                  Additional Details
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  className={`ev-input w-full resize-none ${errors.message ? 'border-red-500' : ''}`}
                  rows={3}
                  placeholder="Any additional information that might help (optional)"
                />
                {errors.message && (
                  <p className="mt-1 text-sm text-red-400">{errors.message}</p>
                )}
              </div>

              {/* Phone Number Field */}
              <div>
                <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-300 mb-2">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  id="phoneNumber"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  className={`ev-input w-full ${errors.phoneNumber ? 'border-red-500' : ''}`}
                  placeholder="Enter your phone number"
                />
                {errors.phoneNumber && (
                  <p className="mt-1 text-sm text-red-400">{errors.phoneNumber}</p>
                )}
              </div>

              {/* Estimated Time Field */}
              <div>
                <label htmlFor="estimatedTime" className="block text-sm font-medium text-gray-300 mb-2">
                  Estimated Time Needed (minutes)
                </label>
                <input
                  type="number"
                  id="estimatedTime"
                  name="estimatedTime"
                  value={formData.estimatedTime}
                  onChange={handleChange}
                  min="1"
                  className={`ev-input w-full ${errors.estimatedTime ? 'border-red-500' : ''}`}
                  placeholder="How long do you need to charge?"
                />
                {errors.estimatedTime && (
                  <p className="mt-1 text-sm text-red-400">{errors.estimatedTime}</p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="ev-neon-button w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center">
                    <div className="ev-loading mr-3"></div>
                    Creating Request...
                  </span>
                ) : (
                  'Create Charging Request'
                )}
              </button>
            </form>

            {/* Back Link */}
            <div className="text-center mt-6">
              <a href="/dashboard" className="text-cyan-400 hover:text-cyan-300 transition-colors">
                ← Back to Dashboard
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChargingRequestForm;
