import { Model, DataTypes } from 'sequelize';

export default (sequelize) => {
  class User extends Model {
    static associate(models) {
      User.hasOne(models.Profile, { foreignKey: 'user_id', as: 'Profile' });
      User.hasMany(models.Vehicle, { foreignKey: 'user_id', as: 'Vehicles' });
      User.hasMany(models.Ride, { foreignKey: 'driver_id', as: 'Rides' });
      User.hasMany(models.Booking, { foreignKey: 'passenger_id', as: 'Bookings' });
      User.hasMany(models.Rating, { foreignKey: 'rater_id', as: 'GivenRatings' });
      User.hasMany(models.Rating, { foreignKey: 'rated_user_id', as: 'ReceivedRatings' });
      User.hasMany(models.Review, { foreignKey: 'reviewer_id', as: 'WrittenReviews' });
      User.hasMany(models.Review, { foreignKey: 'reviewed_user_id', as: 'ReceivedReviews' });
      User.hasMany(models.Report, { foreignKey: 'reporter_id', as: 'FiledReports' });
      User.hasMany(models.Report, { foreignKey: 'reported_user_id', as: 'ReceivedReports' });
      User.hasMany(models.Notification, { foreignKey: 'user_id', as: 'Notifications' });
      User.hasMany(models.EmergencyAlert, { foreignKey: 'user_id', as: 'EmergencyAlerts' });
      User.hasMany(models.EmergencyContact, { foreignKey: 'user_id', as: 'EmergencyContacts' });
      User.hasMany(models.VerificationRecord, { foreignKey: 'user_id', as: 'VerificationRecords' });
      User.hasMany(models.AuditLog, { foreignKey: 'actor_user_id', as: 'ActorLogs' });
      User.hasMany(models.AuditLog, { foreignKey: 'target_user_id', as: 'TargetLogs' });
      User.hasOne(models.UserAnalytics, { foreignKey: 'user_id', as: 'Analytics' });
    }
  }

  User.init({
    user_id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    phone_number: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true
    },
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    phone_verified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    email_verified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    account_status: {
      type: DataTypes.ENUM('active', 'suspended', 'banned', 'deactivated'),
      allowNull: false,
      defaultValue: 'active'
    },
    role: {
      type: DataTypes.ENUM('user', 'admin'),
      allowNull: false,
      defaultValue: 'user'
    },
    notification_preferences: {
      type: DataTypes.JSON,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return User;
};