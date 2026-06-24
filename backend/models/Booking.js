import { Model, DataTypes } from 'sequelize';

export default (sequelize) => {
  class Booking extends Model {
    static associate(models) {
      Booking.belongsTo(models.Ride, { foreignKey: 'ride_id', as: 'Ride' });
      Booking.belongsTo(models.User, { foreignKey: 'passenger_id', as: 'Passenger' });
      Booking.hasOne(models.Payment, { foreignKey: 'booking_id', as: 'Payment' });
      Booking.hasMany(models.Rating, { foreignKey: 'booking_id', as: 'Ratings' });
      Booking.hasMany(models.Review, { foreignKey: 'booking_id', as: 'Reviews' });
      Booking.hasMany(models.Report, { foreignKey: 'booking_id', as: 'Reports' });
    }
  }

  Booking.init({
    booking_id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    ride_id: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    passenger_id: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    pickup_label: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    pickup_location: {
      type: DataTypes.GEOMETRY('POINT', 4326),
      allowNull: false
    },
    drop_label: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    drop_location: {
      type: DataTypes.GEOMETRY('POINT', 4326),
      allowNull: false
    },
    distance_traveled_km: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    calculated_cost_share: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    booking_status: {
      type: DataTypes.ENUM('pending', 'confirmed', 'declined', 'expired', 'cancelled', 'completed', 'no_show'),
      allowNull: false,
      defaultValue: 'pending'
    },
    match_scenario: {
      type: DataTypes.ENUM('exact', 'partial_exit', 'partial_pickup'),
      allowNull: false
    },
    requested_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    confirmed_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    completed_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    cancelled_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Booking',
    tableName: 'bookings',
    underscored: true,
    timestamps: false
  });

  return Booking;
};