import { Model, DataTypes } from 'sequelize';

export default (sequelize) => {
  class Vehicle extends Model {
    static associate(models) {
      Vehicle.belongsTo(models.User, { foreignKey: 'user_id', as: 'User' });
      Vehicle.hasMany(models.Ride, { foreignKey: 'vehicle_id', as: 'Rides' });
    }
  }

  Vehicle.init({
    vehicle_id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    user_id: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    vehicle_type: {
      type: DataTypes.ENUM('two_wheeler', 'car'),
      allowNull: false
    },
    make: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    model: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    registration_number: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    color: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    sequelize,
    modelName: 'Vehicle',
    tableName: 'vehicles',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
  });

  return Vehicle;
};