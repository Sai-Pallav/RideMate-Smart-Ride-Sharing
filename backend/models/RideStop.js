import { Model, DataTypes } from 'sequelize';

export default (sequelize) => {
  class RideStop extends Model {
    static associate(models) {
      RideStop.belongsTo(models.Ride, { foreignKey: 'ride_id', as: 'Ride' });
    }
  }

  RideStop.init({
    stop_id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    ride_id: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    sequence_order: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    stop_label: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    stop_location: {
      type: DataTypes.GEOMETRY('POINT', 4326),
      allowNull: false
    },
    distance_from_source_km: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'RideStop',
    tableName: 'ride_stops',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
  });

  return RideStop;
};