'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('emergency_alerts', {
      alert_id: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      user_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: {
          model: 'users',
          key: 'user_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      ride_id: {
        type: Sequelize.BIGINT,
        allowNull: true,
        references: {
          model: 'rides',
          key: 'ride_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      trigger_location: {
        type: Sequelize.GEOMETRY('POINT', 4326),
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('active', 'resolved', 'false_alarm'),
        allowNull: false,
        defaultValue: 'active'
      },
      triggered_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      resolved_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      admin_notes: {
        type: Sequelize.TEXT,
        allowNull: true
      }
    });

    // Add indexes from Indexing Strategy
    await queryInterface.addIndex('emergency_alerts', ['status', 'triggered_at'], {
      name: 'emergency_alerts_active_idx'
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('emergency_alerts');
  }
};