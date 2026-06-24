'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    // Note: Reports are immutable at the application logic layer per the Data Retention & Safety-Critical Table Policy.
    await queryInterface.createTable('reports', {
      report_id: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      reporter_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: {
          model: 'users',
          key: 'user_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      reported_user_id: {
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
      booking_id: {
        type: Sequelize.BIGINT,
        allowNull: true,
        references: {
          model: 'bookings',
          key: 'booking_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      category: {
        type: Sequelize.ENUM('unsafe_driving', 'misbehavior', 'fake_account', 'harassment', 'no_show', 'other'),
        allowNull: false
      },
      detail: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      urgency: {
        type: Sequelize.ENUM('standard', 'urgent'),
        allowNull: false,
        defaultValue: 'standard'
      },
      status: {
        type: Sequelize.ENUM('received', 'under_review', 'resolved'),
        allowNull: false,
        defaultValue: 'received'
      },
      resolved_by_admin_id: {
        type: Sequelize.BIGINT,
        allowNull: true,
        references: {
          model: 'users',
          key: 'user_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      resolution_note: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      resolved_at: {
        type: Sequelize.DATE,
        allowNull: true
      }
    });

    // Add indexes from Indexing Strategy
    await queryInterface.addIndex('reports', ['status', 'urgency'], {
      name: 'reports_status_urgency_idx'
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('reports');
  }
};