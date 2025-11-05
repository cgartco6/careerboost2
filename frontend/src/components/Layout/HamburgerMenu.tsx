import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const HamburgerMenu: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        className="p-2 rounded-md text-gray-700 hover:text-blue-600 hover:bg-gray-100"
        onClick={() => setIsOpen(!isOpen)}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
          <Link to="/" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Home</Link>
          <Link to="/services" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Services</Link>
          <Link to="/pricing" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Pricing</Link>
          <Link to="/dashboard" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Dashboard</Link>
        </div>
      )}
    </div>
  );
};
