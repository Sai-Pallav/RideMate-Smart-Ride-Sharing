'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('reports', 'alert_id', {
      type: Sequelize.BIGINT,
      allowNull: true,
      references: {
        model: 'emergency_alerts',
        key: 'alert_id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('reports', 'alert_id');
  }
};
