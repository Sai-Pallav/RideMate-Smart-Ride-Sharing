import { Model, DataTypes } from 'sequelize';

export default (sequelize) => {
  class Report extends Model {
    static associate(models) {
      Report.belongsTo(models.User, { foreignKey: 'reporter_id', as: 'Reporter' });
      Report.belongsTo(models.User, { foreignKey: 'reported_user_id', as: 'ReportedUser' });
      Report.belongsTo(models.User, { foreignKey: 'resolved_by_admin_id', as: 'ResolvedByAdmin' });
      Report.belongsTo(models.Ride, { foreignKey: 'ride_id', as: 'Ride' });
      Report.belongsTo(models.Booking, { foreignKey: 'booking_id', as: 'Booking' });
      Report.belongsTo(models.EmergencyAlert, { foreignKey: 'alert_id', as: 'EmergencyAlert' });
    }
  }

  Report.init({
    report_id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    reporter_id: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    reported_user_id: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    ride_id: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    booking_id: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    alert_id: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    category: {
      type: DataTypes.ENUM('unsafe_driving', 'misbehavior', 'fake_account', 'harassment', 'no_show', 'other'),
      allowNull: false
    },
    detail: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    urgency: {
      type: DataTypes.ENUM('standard', 'urgent'),
      allowNull: false,
      defaultValue: 'standard'
    },
    status: {
      type: DataTypes.ENUM('received', 'under_review', 'resolved'),
      allowNull: false,
      defaultValue: 'received'
    },
    resolved_by_admin_id: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    resolution_note: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    resolved_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Report',
    tableName: 'reports',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
  });

  return Report;
};