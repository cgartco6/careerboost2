import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';

interface ServiceForm {
  fullName: string;
  email: string;
  phone: string;
  industry: string;
  experience: string;
  cv: FileList;
}

const Services: React.FC = () => {
  const { register, handleSubmit, formState: { errors } } = useForm<ServiceForm>();
  const [isUploading, setIsUploading] = useState(false);

  const onSubmit = async (data: ServiceForm) => {
    setIsUploading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast.success('CV uploaded successfully! AI processing started.');
    } catch (error) {
      toast.error('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const services = [
    {
      id: 'cv-rewrite',
      name: 'CV Rewrite & Optimization',
      price: 499,
      features: [
        'AI-powered rewriting',
        'ATS optimization',
        'Industry-specific keywords',
        'Professional formatting'
      ]
    },
    {
      id: 'cover-letter',
      name: 'Professional Cover Letter',
      price: 199,
      features: [
        'Custom-written letter',
        'Company-specific tailoring',
        'Achievement highlighting',
        'Professional tone'
      ]
    },
    {
      id: 'job-matching',
      name: 'Smart Job Matching',
      price: 299,
      features: [
        'Real-time job scanning',
        'Personalized matching',
        'Application tracking',
        'Priority alerts'
      ]
    }
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8 text-gray-800">Our Services</h1>
        
        {/* Service Packages */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {services.map((service) => (
            <div key={service.id} className="bg-white rounded-xl shadow-lg border p-6 hover:shadow-xl transition-shadow">
              <h3 className="text-xl font-semibold mb-3 text-gray-800">{service.name}</h3>
              <div className="text-2xl font-bold text-blue-600 mb-4">R {service.price}</div>
              <ul className="space-y-2 mb-6">
                {service.features.map((feature, index) => (
                  <li key={index} className="flex items-center space-x-2 text-gray-600">
                    <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors">
                Add to Cart
              </button>
            </div>
          ))}
        </div>

        {/* CV Upload Form */}
        <div className="bg-white rounded-xl shadow-lg border p-8">
          <h2 className="text-2xl font-bold mb-6 text-gray-800">Start Your CareerBoost Journey</h2>
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  {...register('fullName', { required: 'Full name is required' })}
                  className="input-field"
                  placeholder="Enter your full name"
                />
                {errors.fullName && (
                  <p className="text-red-500 text-sm mt-1">{errors.fullName.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  {...register('email', { 
                    required: 'Email is required',
                    pattern: {
                      value: /^\S+@\S+$/i,
                      message: 'Invalid email address'
                    }
                  })}
                  className="input-field"
                  placeholder="Enter your email"
                />
                {errors.email && (
                  <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  {...register('phone')}
                  className="input-field"
                  placeholder="Enter your phone number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Industry *
                </label>
                <select
                  {...register('industry', { required: 'Industry is required' })}
                  className="input-field"
                >
                  <option value="">Select industry</option>
                  <option value="tech">Technology</option>
                  <option value="finance">Finance</option>
                  <option value="healthcare">Healthcare</option>
                  <option value="education">Education</option>
                  <option value="marketing">Marketing</option>
                  <option value="engineering">Engineering</option>
                </select>
                {errors.industry && (
                  <p className="text-red-500 text-sm mt-1">{errors.industry.message}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Years of Experience *
              </label>
              <select
                {...register('experience', { required: 'Experience is required' })}
                className="input-field"
              >
                <option value="">Select experience</option>
                <option value="0-2">0-2 years</option>
                <option value="3-5">3-5 years</option>
                <option value="6-10">6-10 years</option>
                <option value="10+">10+ years</option>
              </select>
              {errors.experience && (
                <p className="text-red-500 text-sm mt-1">{errors.experience.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload CV (PDF/DOC) *
              </label>
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                {...register('cv', { required: 'CV file is required' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {errors.cv && (
                <p className="text-red-500 text-sm mt-1">{errors.cv.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isUploading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
            >
              {isUploading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Processing...</span>
                </div>
              ) : (
                'Upload CV & Get Started'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Services;
