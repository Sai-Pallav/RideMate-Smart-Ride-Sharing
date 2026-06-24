import { Model, DataTypes } from 'sequelize';

export default (sequelize) => {
  class VerificationRecord extends Model {
    static associate(models) {
      VerificationRecord.belongsTo(models.User, { foreignKey: 'user_id', as: 'User' });
      VerificationRecord.belongsTo(models.User, { foreignKey: 'reviewed_by_admin_id', as: 'ReviewedByAdmin' });
    }
  }

  VerificationRecord.init({
    verification_id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    user_id: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    verification_type: {
      type: DataTypes.ENUM('mobile', 'email', 'institutional', 'government_id'),
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('pending', 'verified', 'rejected', 'expired'),
      allowNull: false,
      defaultValue: 'pending'
    },
    reference_value: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    reviewed_by_admin_id: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    submitted_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    verified_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'VerificationRecord',
    tableName: 'verification_records',
    underscored: true,
    timestamps: false
  });

  return VerificationRecord;
};