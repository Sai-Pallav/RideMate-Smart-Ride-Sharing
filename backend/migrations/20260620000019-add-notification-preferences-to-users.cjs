'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'notification_preferences', {
      type: Sequelize.JSON,
      allowNull: true,
      comment: 'JSON object containing user notification toggles'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('users', 'notification_preferences');
  }
};
