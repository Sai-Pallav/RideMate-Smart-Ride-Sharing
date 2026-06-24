import { Model, DataTypes } from 'sequelize';

export default (sequelize) => {
  class UserAnalytics extends Model {
    static associate(models) {
      UserAnalytics.belongsTo(models.User, { foreignKey: 'user_id', as: 'User' });
    }
  }

  UserAnalytics.init({
    analytics_id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    user_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      unique: true
    },
    total_rides: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    total_distance_shared_km: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    total_fuel_saved_liters: {
      type: DataTypes.DECIMAL(12, 4),
      allowNull: false,
      defaultValue: 0.0000
    },
    total_co2_avoided_kg: {
      type: DataTypes.DECIMAL(12, 4),
      allowNull: false,
      defaultValue: 0.0000
    },
    total_cost_saved: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00
    }
  }, {
    sequelize,
    modelName: 'UserAnalytics',
    tableName: 'user_analytics',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return UserAnalytics;
};
