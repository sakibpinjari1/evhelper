import React, { useState, useContext } from 'react';
import { useAuth } from '../context/AuthContext';
import socketService from '../utils/socket.js';

const ChargingRequestForm = () => {
  const { state } = useAuth();
  const [formData, setFormData] = useState({
    location: '',
    urgency: 'medium',
    message: '',
    contactInfo: '',
    estimatedTime: '',
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

    if (formData.estimatedTime && (isNaN(formData.estimatedTime) || formData.estimatedTime < 1)) {
      newErrors.estimatedTime = 'Estimated time must be a positive number (minutes)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const requestData = {
        location: formData.location.trim(),
        urgency: formData.urgency.toLowerCase(),
        message: formData.message.trim(),
        contactInfo: formData.contactInfo.trim(),
        estimatedTime: formData.estimatedTime ? parseInt(formData.estimatedTime) : null,
      };

      const success = await socketService.sendChargingRequest(requestData);
      
      if (success) {
        // Clear form
        setFormData({
          location: '',
          urgency: 'medium',
          message: '',
          contactInfo: '',
          estimatedTime: '',
        });
        
        alert('Charging request sent successfully!');
      } else {
        setErrors({ general: 'Failed to send charging request' });
      }
    } catch (error) {
      setErrors({ general: error.message || 'Failed to send charging request' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear errors when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  return (
    <div className="bg-white shadow-lg rounded-lg p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Create Charging Request</h2>
        <p className="text-gray-600 mb-6">
          Fill in the details below to request emergency charging assistance from helpers in your area.
        </p>
      </div>

      {/* Error Display */}
      {errors.general && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-md">
          <div className="text-sm">{errors.general}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Location Field */}
        <div>
          <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
            Location
          </label>
          <textarea
            id="location"
            name="location"
            value={formData.location}
            onChange={handleChange}
            rows={3}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
              errors.location ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Enter your location (e.g., Downtown San Francisco, Near gas station)"
          />
          {errors.location && (
            <p className="mt-1 text-sm text-red-600">{errors.location}</p>
          )}
        </div>

        {/* Urgency Field */}
        <div>
          <label htmlFor="urgency" className="block text-sm font-medium text-gray-700 mb-2">
            Urgency Level
          </label>
          <select
            id="urgency"
            name="urgency"
            value={formData.urgency}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
              errors.urgency ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="">Select urgency level</option>
            <option value="low">Low - Need help soon</option>
            <option value="medium">Medium - Need help within an hour</option>
            <option value="high">High - Need immediate assistance</option>
          </select>
          {errors.urgency && (
            <p className="mt-1 text-sm text-red-600">{errors.urgency}</p>
          )}
        </div>

        {/* Message Field */}
        <div>
          <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
            Additional Message (Optional)
          </label>
          <textarea
            id="message"
            name="message"
            value={formData.message}
            onChange={handleChange}
            rows={4}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
              errors.message ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Provide any additional details about your situation..."
          />
          {errors.message && (
            <p className="mt-1 text-sm text-red-600">{errors.message}</p>
          )}
        </div>

        {/* Contact Info Field */}
        <div>
          <label htmlFor="contactInfo" className="block text-sm font-medium text-gray-700 mb-2">
            Contact Information (Optional)
          </label>
          <input
            type="text"
            id="contactInfo"
            name="contactInfo"
            value={formData.contactInfo}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
              errors.contactInfo ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Phone number or preferred contact method"
          />
          {errors.contactInfo && (
            <p className="mt-1 text-sm text-red-600">{errors.contactInfo}</p>
          )}
        </div>

        {/* Estimated Time Field */}
        <div>
          <label htmlFor="estimatedTime" className="block text-sm font-medium text-gray-700 mb-2">
            Estimated Time Needed (minutes)
          </label>
          <input
            type="number"
            id="estimatedTime"
            name="estimatedTime"
            value={formData.estimatedTime}
            onChange={handleChange}
            min="1"
            max="240"
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
              errors.estimatedTime ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="How many minutes do you estimate you'll need help?"
          />
          {errors.estimatedTime && (
            <p className="mt-1 text-sm text-red-600">{errors.estimatedTime}</p>
          )}
        </div>

        {/* Submit Button */}
        <div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <span className="absolute inset-y-0 inset-x-0 flex items-center justify-center">
                <svg className="animate-spin -ml-2 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 8-8 8 8 0 0-4.583-4.583 0-10 10 0 10 10 0 4.583 4.583Z"></path>
                </svg>
                Sending Request...
              </span>
            ) : (
              'Send Charging Request'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChargingRequestForm;
