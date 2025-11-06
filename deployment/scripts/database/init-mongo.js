// MongoDB initialization script
db = db.getSiblingDB('careerboost');

// Create collections
db.createCollection('users');
db.createCollection('jobs');
db.createCollection('payments');
db.createCollection('content');
db.createCollection('auditlogs');

// Create indexes for better performance
db.users.createIndex({ "email": 1 }, { unique: true });
db.users.createIndex({ "createdAt": 1 });
db.users.createIndex({ "profile.preferredIndustry": 1 });
db.users.createIndex({ "lastLogin": 1 }, { expireAfterSeconds: 63072000 }); // 2 years

db.jobs.createIndex({ "title": "text", "description": "text", "company": "text" });
db.jobs.createIndex({ "isActive": 1, "location": 1 });
db.jobs.createIndex({ "isActive": 1, "jobType": 1 });
db.jobs.createIndex({ "expiresAt": 1 }, { expireAfterSeconds: 0 }); // TTL index

db.payments.createIndex({ "userId": 1, "createdAt": -1 });
db.payments.createIndex({ "status": 1, "createdAt": -1 });
db.payments.createIndex({ "reference": 1 }, { unique: true });

db.content.createIndex({ "type": 1, "status": 1 });
db.content.createIndex({ "schedule.publishAt": 1 });
db.content.createIndex({ "tags": 1 });

db.auditlogs.createIndex({ "timestamp": -1 });
db.auditlogs.createIndex({ "userId": 1, "timestamp": -1 });
db.auditlogs.createIndex({ "action": 1, "timestamp": -1 });

// Create admin user for database
db.createUser({
  user: "careerboost_admin",
  pwd: "change_this_in_production",
  roles: [
    {
      role: "readWrite",
      db: "careerboost"
    }
  ]
});

print("CareerBoost database initialized successfully");
