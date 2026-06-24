import { Model, DataTypes } from 'sequelize';

export default (sequelize) => {
  class EmergencyAlert extends Model {
    static associate(models) {
      EmergencyAlert.belongsTo(models.User, { foreignKey: 'user_id', as: 'User' });
      EmergencyAlert.belongsTo(models.Ride, { foreignKey: 'ride_id', as: 'Ride' });
    }
  }

  EmergencyAlert.init({
    alert_id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    user_id: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    ride_id: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    trigger_location: {
      type: DataTypes.GEOMETRY('POINT', 4326),
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('active', 'resolved', 'false_alarm'),
      allowNull: false,
      defaultValue: 'active'
    },
    triggered_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    resolved_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    admin_notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'EmergencyAlert',
    tableName: 'emergency_alerts',
    underscored: true,
    timestamps: false
  });

  return EmergencyAlert;
};