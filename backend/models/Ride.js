import { Model, DataTypes } from 'sequelize';

export default (sequelize) => {
  class Ride extends Model {
    static associate(models) {
      Ride.belongsTo(models.User, { foreignKey: 'driver_id', as: 'Driver' });
      Ride.belongsTo(models.Vehicle, { foreignKey: 'vehicle_id', as: 'Vehicle' });
      Ride.hasOne(models.RideRoute, { foreignKey: 'ride_id', as: 'Route' });
      Ride.hasMany(models.RideStop, { foreignKey: 'ride_id', as: 'Stops' });
      Ride.hasMany(models.Booking, { foreignKey: 'ride_id', as: 'Bookings' });
      Ride.hasMany(models.EmergencyAlert, { foreignKey: 'ride_id', as: 'EmergencyAlerts' });
      Ride.hasMany(models.Report, { foreignKey: 'ride_id', as: 'Reports' });
      Ride.belongsTo(models.Ride, { foreignKey: 'recurring_template_id', as: 'RecurringTemplate' });
    }
  }

  Ride.init({
    ride_id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    driver_id: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    vehicle_id: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    source_label: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    source_location: {
      type: DataTypes.GEOMETRY('POINT', 4326),
      allowNull: false
    },
    destination_label: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    destination_location: {
      type: DataTypes.GEOMETRY('POINT', 4326),
      allowNull: false
    },
    ride_date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    departure_time: {
      type: DataTypes.TIME,
      allowNull: false
    },
    total_seats: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    available_seats: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    estimated_distance_km: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    estimated_total_cost: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('scheduled', 'ongoing', 'completed', 'cancelled'),
      allowNull: false,
      defaultValue: 'scheduled'
    },
    recurring_template_id: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    preferences: {
      type: DataTypes.JSON,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Ride',
    tableName: 'rides',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return Ride;
};