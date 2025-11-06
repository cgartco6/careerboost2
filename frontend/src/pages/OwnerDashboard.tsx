import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const OwnerDashboard: React.FC = () => {
  const [stats, setStats] = useState({
    totalUsers: 1247,
    activeJobs: 856,
    applications: 2893,
    revenue: 154320
  });

  const [aiStatus, setAiStatus] = useState({
    cvProcessor: 'online',
    jobScraper: 'online',
    contentGenerator: 'online',
    emailService: 'online'
  });

  const revenueData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    datasets: [
      {
        label: 'Revenue (ZAR)',
        data: [45000, 52000, 49000, 62000, 78000, 85000, 92000, 88000, 95000, 110000, 125000, 154320],
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        fill: true
      }
    ]
  };

  const userGrowthData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    datasets: [
      {
        label: 'New Users',
        data: [45, 52, 68, 74, 89, 95, 112, 134, 156, 178, 204, 247],
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
      }
    ]
  };

  const serviceDistributionData = {
    labels: ['CV Rewrite', 'Cover Letters', 'Job Matching', 'Full Package'],
    datasets: [
      {
        data: [45, 25, 20, 10],
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(168, 85, 247, 0.8)',
          'rgba(34, 197, 94, 0.8)',
          'rgba(245, 158, 11, 0.8)'
        ],
        borderWidth: 2,
        borderColor: '#fff'
      }
    ]
  };

  const toggleAI = (service: string) => {
    setAiStatus(prev => ({
      ...prev,
      [service]: prev[service as keyof typeof prev] === 'online' ? 'offline' : 'online'
    }));
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">CareerBoost Owner Dashboard</h1>
          <div className="text-sm text-gray-500">Last updated: {new Date().toLocaleString()}</div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow border">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-blue-600">{stats.totalUsers}</div>
                <div className="text-gray-600">Total Users</div>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
            </div>
            <div className="mt-2 text-sm text-green-600">+12% from last month</div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow border">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-green-600">{stats.activeJobs}</div>
                <div className="text-gray-600">Active Jobs</div>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <div className="mt-2 text-sm text-green-600">+8% from last month</div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow border">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-purple-600">{stats.applications}</div>
                <div className="text-gray-600">Applications</div>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
            <div className="mt-2 text-sm text-green-600">+15% from last month</div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow border">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-orange-600">R {stats.revenue.toLocaleString()}</div>
                <div className="text-gray-600">Total Revenue</div>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
            </div>
            <div className="mt-2 text-sm text-green-600">+22% from last month</div>
          </div>
        </div>

        {/* AI Status Panel */}
        <div className="bg-white p-6 rounded-xl shadow border mb-8">
          <h2 className="text-xl font-semibold mb-4">AI Services Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(aiStatus).map(([service, status]) => (
              <div key={service} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${
                    status === 'online' ? 'bg-green-500' : 'bg-red-500'
                  }`}></div>
                  <span className="capitalize font-medium">{service.replace(/([A-Z])/g, ' $1')}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    status === 'online' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {status}
                  </span>
                  <button
                    onClick={() => toggleAI(service)}
                    className={`px-3 py-1 rounded text-xs ${
                      status === 'online' ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-green-500 text-white hover:bg-green-600'
                    } transition-colors`}
                  >
                    {status === 'online' ? 'Stop' : 'Start'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white p-6 rounded-xl shadow border">
            <h3 className="text-lg font-semibold mb-4">Revenue Growth</h3>
            <Line data={revenueData} options={chartOptions} />
          </div>

          <div className="bg-white p-6 rounded-xl shadow border">
            <h3 className="text-lg font-semibold mb-4">User Growth</h3>
            <Bar data={userGrowthData} options={chartOptions} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-xl shadow border">
            <h3 className="text-lg font-semibold mb-4">Service Distribution</h3>
            <Doughnut data={serviceDistributionData} options={chartOptions} />
          </div>

          <div className="bg-white p-6 rounded-xl shadow border lg:col-span-2">
            <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
            <div className="space-y-4">
              {[
                { user: 'John Doe', action: 'CV Upload', time: '2 minutes ago', type: 'success' },
                { user: 'Sarah Smith', action: 'Job Application', time: '5 minutes ago', type: 'info' },
                { user: 'Mike Johnson', action: 'Payment Received', time: '10 minutes ago', type: 'success' },
                { user: 'AI System', action: 'Job Scraping Completed', time: '15 minutes ago', type: 'warning' },
                { user: 'Emma Wilson', action: 'Cover Letter Generated', time: '20 minutes ago', type: 'success' }
              ].map((activity, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-2 h-2 rounded-full ${
                      activity.type === 'success' ? 'bg-green-500' :
                      activity.type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
                    }`}></div>
                    <div>
                      <div className="font-medium">{activity.user}</div>
                      <div className="text-sm text-gray-600">{activity.action}</div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">{activity.time}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OwnerDashboard;
