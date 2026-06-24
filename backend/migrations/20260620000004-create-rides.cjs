'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('rides', {
      ride_id: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      driver_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: {
          model: 'users',
          key: 'user_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      vehicle_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: {
          model: 'vehicles',
          key: 'vehicle_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      source_label: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      source_location: {
        type: Sequelize.GEOMETRY('POINT', 4326),
        allowNull: false
      },
      destination_label: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      destination_location: {
        type: Sequelize.GEOMETRY('POINT', 4326),
        allowNull: false
      },
      ride_date: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      departure_time: {
        type: Sequelize.TIME,
        allowNull: false
      },
      total_seats: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      available_seats: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      estimated_distance_km: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      estimated_total_cost: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('scheduled', 'ongoing', 'completed', 'cancelled'),
        allowNull: false,
        defaultValue: 'scheduled'
      },
      recurring_template_id: {
        type: Sequelize.BIGINT,
        allowNull: true,
        references: {
          model: 'rides',
          key: 'ride_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      preferences: {
        type: Sequelize.JSON,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    // Add indexes
    await queryInterface.addIndex('rides', ['ride_date', 'status'], {
      name: 'rides_date_status_idx'
    });

    // MySQL Spatial Indexes (POINT type with SRID 4326)
    await queryInterface.addIndex('rides', ['source_location'], {
      type: 'SPATIAL',
      name: 'rides_source_location_spatial_idx'
    });
    await queryInterface.addIndex('rides', ['destination_location'], {
      type: 'SPATIAL',
      name: 'rides_destination_location_spatial_idx'
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('rides');
  }
};