import { Model, DataTypes } from 'sequelize';

export default (sequelize) => {
  class Rating extends Model {
    static associate(models) {
      Rating.belongsTo(models.Booking, { foreignKey: 'booking_id', as: 'Booking' });
      Rating.belongsTo(models.User, { foreignKey: 'rater_id', as: 'Rater' });
      Rating.belongsTo(models.User, { foreignKey: 'rated_user_id', as: 'RatedUser' });
    }
  }

  Rating.init({
    rating_id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    booking_id: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    rater_id: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    rated_user_id: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    stars: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 5
      }
    }
  }, {
    sequelize,
    modelName: 'Rating',
    tableName: 'ratings',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
  });

  return Rating;
};