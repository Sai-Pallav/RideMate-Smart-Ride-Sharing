'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('bookings', {
      booking_id: {
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
      passenger_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: {
          model: 'users',
          key: 'user_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      pickup_label: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      pickup_location: {
        type: Sequelize.GEOMETRY('POINT', 4326),
        allowNull: false
      },
      drop_label: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      drop_location: {
        type: Sequelize.GEOMETRY('POINT', 4326),
        allowNull: false
      },
      distance_traveled_km: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      calculated_cost_share: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      booking_status: {
        type: Sequelize.ENUM('pending', 'confirmed', 'declined', 'expired', 'cancelled', 'completed', 'no_show'),
        allowNull: false,
        defaultValue: 'pending'
      },
      match_scenario: {
        type: Sequelize.ENUM('exact', 'partial_exit', 'partial_pickup'),
        allowNull: false
      },
      requested_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      confirmed_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      completed_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      cancelled_at: {
        type: Sequelize.DATE,
        allowNull: true
      }
    });

    // Add indexes from Indexing Strategy
    await queryInterface.addIndex('bookings', ['passenger_id', 'booking_status'], {
      name: 'bookings_passenger_status_idx'
    });
    await queryInterface.addIndex('bookings', ['ride_id', 'booking_status'], {
      name: 'bookings_ride_status_idx'
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('bookings');
  }
};