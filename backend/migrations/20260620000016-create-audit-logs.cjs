'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    // Note: AuditLogs are immutable at the application logic layer per the Data Retention & Safety-Critical Table Policy.
    await queryInterface.createTable('audit_logs', {
      log_id: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      actor_user_id: {
        type: Sequelize.BIGINT,
        allowNull: true,
        references: {
          model: 'users',
          key: 'user_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      target_user_id: {
        type: Sequelize.BIGINT,
        allowNull: true,
        references: {
          model: 'users',
          key: 'user_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      action_type: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      action_detail: {
        type: Sequelize.JSON,
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
    await queryInterface.dropTable('audit_logs');
  }
};