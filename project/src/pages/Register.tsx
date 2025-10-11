import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Zap, User, Mail, Lock, Phone, Car, Home, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { vehicleCategories, chargerTypes } from '../data/vehicles';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    userType: '' as 'driver' | 'host',
    hasEv: false,
    vehicleNumber: '',
    vehicleCategory: '',
    vehicleType: '',
    vehicleModel: '',
    chargerType: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.name || !formData.email || !formData.phone || !formData.userType) {
      setError('Please fill in all required fields');
      return;
    }
    
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate vehicle details for vehicle owners
    if (formData.hasEv) {
      if (!formData.vehicleNumber || !formData.vehicleCategory || !formData.vehicleType || !formData.vehicleModel) {
        setError('Please complete all vehicle details');
        return;
      }
      
      if (formData.vehicleType === 'electric' && !formData.chargerType) {
        setError('Charger type is required for electric vehicles');
        return;
      }
    }
    
    if (formData.hasEv && formData.vehicleType === 'electric' && !formData.chargerType) {
      setError('Charger type is required for EV owners');
      return;
    }
    
    setLoading(true);
    setError('');
    
    const result = await register({
      email: formData.email,
      password: formData.password,
      name: formData.name,
      phone: formData.phone,
      userType: formData.userType,
      hasEv: formData.hasEv,
      vehicleNumber: formData.vehicleNumber,
      vehicleCategory: formData.vehicleCategory,
      vehicleType: formData.vehicleType,
      vehicleModel: formData.vehicleModel,
      chargerType: formData.chargerType,
    });
    
    if (result.success) {
      // Navigate to appropriate dashboard based on user type
      if (formData.userType === 'host') {
        navigate('/host-dashboard');
      } else {
        navigate('/dashboard');
      }
    } else {
      setError(result.error || 'Registration failed');
    }
    
    setLoading(false);
  };

  const nextStep = () => {
    if (step === 1 && (!formData.name || !formData.email || !formData.phone || !formData.userType)) {
      setError('Please fill in all required fields');
      return;
    }
    
    // Skip vehicle details for hosts/drivers without vehicles
    if (step === 1 && (formData.userType === 'host' || formData.userType === 'driver') && !formData.hasEv) {
      setError('');
      setStep(3); // Go directly to security step
      return;
    }
    
    if (step === 2 && formData.userType === 'driver' && !formData.vehicleModel) {
      setError('Please select your vehicle');
      return;
    }
    setError('');
    setStep(step + 1);
  };

  const prevStep = () => {
    setError('');
    
    // Handle skip logic for hosts/drivers without vehicles
    if (step === 3 && (formData.userType === 'host' || formData.userType === 'driver') && !formData.hasEv) {
      setStep(1); // Go back to step 1, skipping vehicle details
      return;
    }
    
    setStep(step - 1);
  };

  const getVehicleOptions = () => {
    if (!formData.vehicleCategory || !formData.vehicleType) return [];
    return vehicleCategories[formData.vehicleCategory as keyof typeof vehicleCategories]?.[formData.vehicleType as 'electric' | 'petrol'] || [];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-green-500 rounded-full flex items-center justify-center">
              <Zap className="h-8 w-8 text-white" />
            </div>
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Join ChargeNet
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Create your account and start the EV revolution
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="flex justify-center">
          <div className="flex space-x-2">
            {[1, 2, 3].map((num) => (
              <div
                key={num}
                className={`w-3 h-3 rounded-full transition-colors ${
                  step >= num ? 'bg-blue-500' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <span className="text-red-700 text-sm">{error}</span>
          </div>
        )}

        <form className="mt-8 bg-white p-8 rounded-2xl shadow-xl" onSubmit={handleSubmit}>
          {step === 1 && (
            <div className="space-y-5">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account Type *
                </label>
                <div className="grid grid-cols-1 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, userType: 'driver' }))}
                    className={`p-4 border-2 rounded-xl transition-all text-left ${
                      formData.userType === 'driver'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Car className="h-6 w-6" />
                      <div>
                        <div className="font-medium">Driver</div>
                        <div className="text-sm text-gray-600">I want to charge my vehicle</div>
                      </div>
                    </div>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, userType: 'host' }))}
                    className={`p-4 border-2 rounded-xl transition-all text-left ${
                      formData.userType === 'host'
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Home className="h-6 w-6" />
                      <div>
                        <div className="font-medium">Host</div>
                        <div className="text-sm text-gray-600">I want to share my charger</div>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {formData.userType && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Do you own a vehicle?
                  </label>
                  <div className="flex space-x-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="hasVehicle"
                        value="true"
                        checked={formData.hasEv === true}
                        onChange={() => setFormData(prev => ({ ...prev, hasEv: true }))}
                        className="mr-2"
                      />
                      Yes
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="hasVehicle"
                        value="false"
                        checked={formData.hasEv === false}
                        onChange={() => setFormData(prev => ({ ...prev, hasEv: false }))}
                        className="mr-2"
                      />
                      No
                    </label>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleInputChange}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your full name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your email"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number *
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="tel"
                    name="phone"
                    required
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your phone number"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={nextStep}
                className="w-full bg-gradient-to-r from-blue-500 to-green-500 text-white py-3 px-4 rounded-xl font-medium hover:from-blue-600 hover:to-green-600 transition-all disabled:opacity-50"
                disabled={!formData.name || !formData.email || !formData.phone || !formData.userType}
              >
                Continue
              </button>
            </div>
          )}

          {step === 2 && formData.hasEv && (
            <div className="space-y-5">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Vehicle Information</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Vehicle Number *
                </label>
                <input
                  type="text"
                  name="vehicleNumber"
                  value={formData.vehicleNumber}
                  onChange={handleInputChange}
                  placeholder="e.g., MH01AB1234"
                  className="w-full px-3 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Vehicle Category *
                </label>
                <select
                  name="vehicleCategory"
                  value={formData.vehicleCategory}
                  onChange={handleInputChange}
                  className="w-full px-3 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select vehicle category</option>
                  <option value="2-wheeler">2-Wheeler</option>
                  <option value="3-wheeler">3-Wheeler</option>
                  <option value="4-wheeler">4-Wheeler</option>
                </select>
              </div>

              {formData.vehicleCategory && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vehicle Type *
                  </label>
                  <select
                    name="vehicleType"
                    value={formData.vehicleType}
                    onChange={handleInputChange}
                    className="w-full px-3 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select vehicle type</option>
                    <option value="electric">Electric</option>
                    <option value="petrol">Petrol/Diesel</option>
                  </select>
                </div>
              )}

              {formData.vehicleCategory && formData.vehicleType && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vehicle Model *
                  </label>
                  <select
                    name="vehicleModel"
                    value={formData.vehicleModel}
                    onChange={handleInputChange}
                    className="w-full px-3 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select your vehicle</option>
                    {getVehicleOptions().map((vehicle) => (
                      <option key={vehicle} value={vehicle}>{vehicle}</option>
                    ))}
                  </select>
                </div>
              )}

              {formData.hasEv && formData.vehicleType === 'electric' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Charger Type *
                  </label>
                  <select
                    name="chargerType"
                    value={formData.chargerType}
                    onChange={handleInputChange}
                    className="w-full px-3 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select charger type</option>
                    {chargerTypes.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={prevStep}
                  className="flex-1 bg-gray-200 text-gray-800 py-3 px-4 rounded-xl font-medium hover:bg-gray-300 transition-colors"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={nextStep}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-green-500 text-white py-3 px-4 rounded-xl font-medium hover:from-blue-600 hover:to-green-600 transition-all disabled:opacity-50"
                  disabled={!formData.vehicleNumber || !formData.vehicleCategory || !formData.vehicleType || !formData.vehicleModel}
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {step === 2 && !formData.hasEv && (
            <div className="space-y-5">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Information</h3>
              <p className="text-gray-600 text-center">
                You can still use ChargeNet services without owning a vehicle.
              </p>
              
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={prevStep}
                  className="flex-1 bg-gray-200 text-gray-800 py-3 px-4 rounded-xl font-medium hover:bg-gray-300 transition-colors"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={nextStep}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-green-500 text-white py-3 px-4 rounded-xl font-medium hover:from-blue-600 hover:to-green-600 transition-all"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Security</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="password"
                    name="password"
                    required
                    value={formData.password}
                    onChange={handleInputChange}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Create a strong password"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="password"
                    name="confirmPassword"
                    required
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Confirm your password"
                  />
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={prevStep}
                  className="flex-1 bg-gray-200 text-gray-800 py-3 px-4 rounded-xl font-medium hover:bg-gray-300 transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-green-500 text-white py-3 px-4 rounded-xl font-medium hover:from-blue-600 hover:to-green-600 transition-all disabled:opacity-50"
                >
                  {loading ? 'Creating Account...' : 'Create Account'}
                </button>
              </div>
            </div>
          )}
        </form>

        <div className="text-center">
          <span className="text-sm text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500 transition-colors">
              Sign in
            </Link>
          </span>
        </div>
      </div>
    </div>
  );
};

export default Register;