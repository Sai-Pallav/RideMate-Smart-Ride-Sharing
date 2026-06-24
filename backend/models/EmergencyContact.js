import { Model, DataTypes } from 'sequelize';

export default (sequelize) => {
  class EmergencyContact extends Model {
    static associate(models) {
      EmergencyContact.belongsTo(models.User, { foreignKey: 'user_id', as: 'User' });
    }
  }

  EmergencyContact.init({
    contact_id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    user_id: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    contact_name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    contact_phone: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    is_verified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    }
  }, {
    sequelize,
    modelName: 'EmergencyContact',
    tableName: 'emergency_contacts',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
  });

  return EmergencyContact;
};