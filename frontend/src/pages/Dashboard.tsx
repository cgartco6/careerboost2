import React, { useState } from 'react';

const Dashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('jobs');

  const mockJobs = [
    {
      id: 1,
      title: 'Senior Software Engineer',
      company: 'Tech Solutions SA',
      location: 'Cape Town',
      status: 'Applied',
      date: '2024-01-15',
      match: 95
    },
    {
      id: 2,
      title: 'Full Stack Developer',
      company: 'Innovate Labs',
      location: 'Johannesburg',
      status: 'Pending',
      date: '2024-01-14',
      match: 87
    },
    {
      id: 3,
      title: 'DevOps Engineer',
      company: 'Cloud Systems',
      location: 'Remote',
      status: 'Interview',
      date: '2024-01-12',
      match: 92
    }
  ];

  const stats = {
    applications: 12,
    interviews: 3,
    offers: 1,
    avgMatch: 89
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-800">Job Seeker Dashboard</h1>
        
        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow border">
            <div className="text-2xl font-bold text-blue-600">{stats.applications}</div>
            <div className="text-gray-600">Applications</div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow border">
            <div className="text-2xl font-bold text-green-600">{stats.interviews}</div>
            <div className="text-gray-600">Interviews</div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow border">
            <div className="text-2xl font-bold text-purple-600">{stats.offers}</div>
            <div className="text-gray-600">Offers</div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow border">
            <div className="text-2xl font-bold text-orange-600">{stats.avgMatch}%</div>
            <div className="text-gray-600">Avg Match</div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-xl shadow border mb-6">
          <div className="border-b">
            <nav className="flex space-x-8 px-6">
              {['jobs', 'cv', 'settings'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm capitalize ${
                    activeTab === tab
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab === 'jobs' ? 'Job Applications' : 
                   tab === 'cv' ? 'CV & Documents' : 'Settings'}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'jobs' && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold mb-4">Recent Applications</h2>
                {mockJobs.map((job) => (
                  <div key={job.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold text-lg text-gray-800">{job.title}</h3>
                        <p className="text-gray-600">{job.company} • {job.location}</p>
                      </div>
                      <div className="text-right">
                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                          job.status === 'Applied' ? 'bg-blue-100 text-blue-800' :
                          job.status === 'Interview' ? 'bg-green-100 text-green-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {job.status}
                        </div>
                        <div className="text-sm text-gray-500 mt-1">{job.date}</div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full" 
                            style={{ width: `${job.match}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-600">{job.match}% match</span>
                      </div>
                      <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                        View Details
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'cv' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold mb-4">Your Documents</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="border rounded-lg p-6">
                    <h3 className="font-semibold text-lg mb-3">Enhanced CV</h3>
                    <p className="text-gray-600 mb-4">AI-optimized version of your CV</p>
                    <div className="flex space-x-3">
                      <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm">
                        Download
                      </button>
                      <button className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm">
                        Regenerate
                      </button>
                    </div>
                  </div>

                  <div className="border rounded-lg p-6">
                    <h3 className="font-semibold text-lg mb-3">Cover Letter Template</h3>
                    <p className="text-gray-600 mb-4">AI-generated cover letter</p>
                    <div className="flex space-x-3">
                      <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm">
                        Download
                      </button>
                      <button className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm">
                        Customize
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Account Settings</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Job Preferences
                    </label>
                    <select className="input-field">
                      <option>Technology</option>
                      <option>Finance</option>
                      <option>Healthcare</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Location Preference
                    </label>
                    <input type="text" className="input-field" placeholder="Preferred locations" />
                  </div>
                  <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                    Save Preferences
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
