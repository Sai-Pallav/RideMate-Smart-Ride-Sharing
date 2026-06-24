import { Model, DataTypes } from 'sequelize';

export default (sequelize) => {
  class RideRoute extends Model {
    static associate(models) {
      RideRoute.belongsTo(models.Ride, { foreignKey: 'ride_id', as: 'Ride' });
    }
  }

  RideRoute.init({
    route_id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    ride_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      unique: true
    },
    polyline_data: {
      type: DataTypes.JSON,
      allowNull: false
    },
    total_distance_km: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'RideRoute',
    tableName: 'ride_routes',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
  });

  return RideRoute;
};