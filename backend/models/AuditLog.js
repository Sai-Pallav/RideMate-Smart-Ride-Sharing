import { Model, DataTypes } from 'sequelize';

export default (sequelize) => {
  class AuditLog extends Model {
    static associate(models) {
      AuditLog.belongsTo(models.User, { foreignKey: 'actor_user_id', as: 'Actor' });
      AuditLog.belongsTo(models.User, { foreignKey: 'target_user_id', as: 'Target' });
    }
  }

  AuditLog.init({
    log_id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    actor_user_id: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    target_user_id: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    action_type: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    action_detail: {
      type: DataTypes.JSON,
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'AuditLog',
    tableName: 'audit_logs',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
  });

  return AuditLog;
};