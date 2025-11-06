import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Header from './components/Layout/Header';
import Home from './pages/Home';
import Services from './pages/Services';
import Dashboard from './pages/Dashboard';
import OwnerDashboard from './pages/OwnerDashboard';
import Payment from './pages/Payment';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <Header />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/services" element={<Services />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/owner" element={<OwnerDashboard />} />
          <Route path="/payment" element={<Payment />} />
        </Routes>
        <Toaster position="top-right" />
      </div>
    </Router>
  );
}

export default App;
