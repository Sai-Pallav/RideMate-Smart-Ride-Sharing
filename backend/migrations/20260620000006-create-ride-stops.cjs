'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ride_stops', {
      stop_id: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      ride_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: {
          model: 'rides',
          key: 'ride_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      sequence_order: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      stop_label: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      stop_location: {
        type: Sequelize.GEOMETRY('POINT', 4326),
        allowNull: false
      },
      distance_from_source_km: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Add unique composite constraint on (ride_id, sequence_order)
    await queryInterface.addIndex('ride_stops', ['ride_id', 'sequence_order'], {
      unique: true,
      name: 'ride_stops_ride_sequence_unique'
    });

    // MySQL Spatial Indexes (POINT type with SRID 4326)
    await queryInterface.addIndex('ride_stops', ['stop_location'], {
      type: 'SPATIAL',
      name: 'ride_stops_stop_location_spatial_idx'
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('ride_stops');
  }
};