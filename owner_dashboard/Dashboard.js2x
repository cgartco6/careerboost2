import React, { useState, useEffect } from 'react';
import { Bar, Line, Doughnut } from 'react-chartjs-2';

const OwnerDashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeJobs: 0,
    applications: 0,
    revenue: 0
  });

  const [aiStatus, setAiStatus] = useState({
    cvProcessor: 'online',
    jobScraper: 'online',
    contentGenerator: 'online'
  });

  const revenueData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'Revenue (ZAR)',
        data: [12000, 19000, 15000, 25000, 22000, 30000],
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1
      }
    ]
  };

  const toggleAI = (service) => {
    setAiStatus(prev => ({
      ...prev,
      [service]: prev[service] === 'online' ? 'offline' : 'online'
    }));
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-8">CareerBoost Dashboard</h1>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold">Total Users</h3>
          <p className="text-2xl font-bold text-blue-600">{stats.totalUsers}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold">Active Jobs</h3>
          <p className="text-2xl font-bold text-green-600">{stats.activeJobs}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold">Applications</h3>
          <p className="text-2xl font-bold text-purple-600">{stats.applications}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold">Revenue</h3>
          <p className="text-2xl font-bold text-orange-600">R {stats.revenue}</p>
        </div>
      </div>

      {/* AI Status Panel */}
      <div className="bg-white p-6 rounded-lg shadow mb-8">
        <h2 className="text-xl font-semibold mb-4">AI Services Status</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(aiStatus).map(([service, status]) => (
            <div key={service} className="flex items-center justify-between p-4 border rounded">
              <span className="capitalize">{service}</span>
              <div className="flex items-center gap-4">
                <span className={`px-2 py-1 rounded text-sm ${
                  status === 'online' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {status}
                </span>
                <button
                  onClick={() => toggleAI(service)}
                  className={`px-3 py-1 rounded text-sm ${
                    status === 'online' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
                  }`}
                >
                  {status === 'online' ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Revenue Chart */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Revenue Growth</h2>
        <Line data={revenueData} />
      </div>
    </div>
  );
};
