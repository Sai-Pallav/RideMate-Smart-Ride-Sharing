'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('verification_records', {
      verification_id: {
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
      verification_type: {
        type: Sequelize.ENUM('mobile', 'email', 'institutional', 'government_id'),
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('pending', 'verified', 'rejected', 'expired'),
        allowNull: false,
        defaultValue: 'pending'
      },
      reference_value: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      reviewed_by_admin_id: {
        type: Sequelize.BIGINT,
        allowNull: true,
        references: {
          model: 'users',
          key: 'user_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      submitted_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      verified_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: true
      }
    });

    // Add indexes from Indexing Strategy
    await queryInterface.addIndex('verification_records', ['user_id', 'verification_type', 'status'], {
      name: 'verification_records_lookup_idx'
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('verification_records');
  }
};