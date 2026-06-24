import { Model, DataTypes } from 'sequelize';

export default (sequelize) => {
  class Payment extends Model {
    static associate(models) {
      Payment.belongsTo(models.Booking, { foreignKey: 'booking_id', as: 'Booking' });
    }
  }

  Payment.init({
    payment_id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    booking_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      unique: true
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    settlement_method: {
      type: DataTypes.ENUM('upi', 'cash', 'in_app'),
      allowNull: false
    },
    payment_status: {
      type: DataTypes.ENUM('pending', 'settled', 'disputed'),
      allowNull: false,
      defaultValue: 'pending'
    },
    settled_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Payment',
    tableName: 'payments',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
  });

  return Payment;
};