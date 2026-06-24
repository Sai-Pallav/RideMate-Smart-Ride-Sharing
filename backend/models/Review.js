import { Model, DataTypes } from 'sequelize';

export default (sequelize) => {
  class Review extends Model {
    static associate(models) {
      Review.belongsTo(models.Booking, { foreignKey: 'booking_id', as: 'Booking' });
      Review.belongsTo(models.User, { foreignKey: 'reviewer_id', as: 'Reviewer' });
      Review.belongsTo(models.User, { foreignKey: 'reviewed_user_id', as: 'ReviewedUser' });
    }
  }

  Review.init({
    review_id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    booking_id: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    reviewer_id: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    reviewed_user_id: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    review_text: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    is_moderated: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    }
  }, {
    sequelize,
    modelName: 'Review',
    tableName: 'reviews',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
  });

  return Review;
};