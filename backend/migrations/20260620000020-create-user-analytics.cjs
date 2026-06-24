'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('user_analytics', {
      analytics_id: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      user_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        unique: true,
        references: {
          model: 'users',
          key: 'user_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      total_rides: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      total_distance_shared_km: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0.00
      },
      total_fuel_saved_liters: {
        type: Sequelize.DECIMAL(12, 4),
        allowNull: false,
        defaultValue: 0.0000
      },
      total_co2_avoided_kg: {
        type: Sequelize.DECIMAL(12, 4),
        allowNull: false,
        defaultValue: 0.0000
      },
      total_cost_saved: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0.00
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('user_analytics');
  }
};
