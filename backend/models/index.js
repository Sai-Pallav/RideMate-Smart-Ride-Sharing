import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import path from 'path';

// Import model factories
import createUserModel from './User.js';
import createProfileModel from './Profile.js';
import createVehicleModel from './Vehicle.js';
import createRideModel from './Ride.js';
import createRideRouteModel from './RideRoute.js';
import createRideStopModel from './RideStop.js';
import createBookingModel from './Booking.js';
import createPaymentModel from './Payment.js';
import createRatingModel from './Rating.js';
import createReviewModel from './Review.js';
import createReportModel from './Report.js';
import createNotificationModel from './Notification.js';
import createEmergencyAlertModel from './EmergencyAlert.js';
import createEmergencyContactModel from './EmergencyContact.js';
import createVerificationRecordModel from './VerificationRecord.js';
import createAuditLogModel from './AuditLog.js';
import createUserAnalyticsModel from './UserAnalytics.js';

// Resolve configuration path
const configPath = path.resolve(process.cwd(), '.env');
dotenv.config({ path: configPath });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

const sequelize = new Sequelize(
  process.env.DB_NAME || 'community_ridesharing',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD === 'null' ? null : (process.env.DB_PASSWORD || null),
  {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    dialect: 'mysql',
    logging: false
  }
);

const db = {};

// Initialize models
db.User = createUserModel(sequelize);
db.Profile = createProfileModel(sequelize);
db.Vehicle = createVehicleModel(sequelize);
db.Ride = createRideModel(sequelize);
db.RideRoute = createRideRouteModel(sequelize);
db.RideStop = createRideStopModel(sequelize);
db.Booking = createBookingModel(sequelize);
db.Payment = createPaymentModel(sequelize);
db.Rating = createRatingModel(sequelize);
db.Review = createReviewModel(sequelize);
db.Report = createReportModel(sequelize);
db.Notification = createNotificationModel(sequelize);
db.EmergencyAlert = createEmergencyAlertModel(sequelize);
db.EmergencyContact = createEmergencyContactModel(sequelize);
db.VerificationRecord = createVerificationRecordModel(sequelize);
db.AuditLog = createAuditLogModel(sequelize);
db.UserAnalytics = createUserAnalyticsModel(sequelize);

// Establish relationships
Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

export default db;