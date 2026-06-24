'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ride_routes', {
      route_id: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      ride_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        unique: true, // Enforce 1:1
        references: {
          model: 'rides',
          key: 'ride_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      polyline_data: {
        type: Sequelize.JSON,
        allowNull: false
      },
      total_distance_km: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('ride_routes');
  }
};