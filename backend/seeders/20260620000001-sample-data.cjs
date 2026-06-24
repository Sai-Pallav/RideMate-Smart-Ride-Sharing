'use strict';
const bcrypt = require('bcryptjs');

module.exports = {
  async up(queryInterface, Sequelize) {
    const hashPassword = (password) => bcrypt.hashSync(password, 10);

    // 1. Insert Users
    await queryInterface.bulkInsert('users', [
      {
        user_id: 1,
        phone_number: '+15550199',
        email: 'sai.pallav@institution.edu',
        password_hash: hashPassword('SecurePassword123!'),
        phone_verified: true,
        email_verified: true,
        account_status: 'active',
        role: 'user',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        user_id: 2,
        phone_number: '+15550200',
        email: 'john.doe@institution.edu',
        password_hash: hashPassword('SecurePassword123!'),
        phone_verified: true,
        email_verified: true,
        account_status: 'active',
        role: 'user',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        user_id: 3,
        phone_number: '+15550201',
        email: 'jane.smith@institution.edu',
        password_hash: hashPassword('SecurePassword123!'),
        phone_verified: true,
        email_verified: false,
        account_status: 'active',
        role: 'user',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        user_id: 4,
        phone_number: '+15550999',
        email: 'admin@institution.edu',
        password_hash: hashPassword('Admin@1234'),
        phone_verified: true,
        email_verified: true,
        account_status: 'active',
        role: 'admin',
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);

    // 2. Insert Profiles
    await queryInterface.bulkInsert('profiles', [
      {
        profile_id: 1,
        user_id: 1,
        full_name: 'Sai Pallav',
        photo_url: 'https://images.example.com/profiles/sai.jpg',
        gender: 'male',
        institution_name: 'Campus Tech University',
        institution_domain: 'institution.edu',
        bio: 'Daily commuter looking to split fuel and save environment.',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        profile_id: 2,
        user_id: 2,
        full_name: 'John Doe',
        photo_url: null,
        gender: 'male',
        institution_name: 'Campus Tech University',
        institution_domain: 'institution.edu',
        bio: 'Student in Computer Science. Usually travel on weekdays.',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        profile_id: 3,
        user_id: 3,
        full_name: 'Jane Smith',
        photo_url: null,
        gender: 'female',
        institution_name: 'Campus Tech University',
        institution_domain: 'institution.edu',
        bio: 'Research Assistant, often travel between campuses.',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        profile_id: 4,
        user_id: 4,
        full_name: 'System Admin',
        photo_url: null,
        gender: 'male',
        institution_name: 'Campus Tech University',
        institution_domain: 'institution.edu',
        bio: 'Pilot/Dev stage administrator.',
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);

    // 3. Insert Vehicles
    await queryInterface.bulkInsert('vehicles', [
      {
        vehicle_id: 1,
        user_id: 1,
        vehicle_type: 'car',
        make: 'Toyota',
        model: 'Prius',
        registration_number: 'ABC-123-XYZ',
        color: 'Silver',
        is_active: true,
        created_at: new Date()
      }
    ]);

    // 4. Insert Rides (with POINT columns for source_location & destination_location)
    await queryInterface.bulkInsert('rides', [
      {
        ride_id: 1,
        driver_id: 1,
        vehicle_id: 1,
        source_label: 'Campus Main Gate',
        source_location: Sequelize.fn('ST_GeomFromText', 'POINT(37.77490000 -122.41940000)', 4326),
        destination_label: 'Downtown Station',
        destination_location: Sequelize.fn('ST_GeomFromText', 'POINT(37.78910000 -122.40140000)', 4326),
        ride_date: '2026-06-25',
        departure_time: '08:30:00',
        total_seats: 3,
        available_seats: 2, // 1 booked
        estimated_distance_km: 5.20,
        estimated_total_cost: 12.00,
        status: 'scheduled',
        recurring_template_id: null,
        preferences: JSON.stringify({
          gender_preference: 'none',
          no_smoking: true,
          luggage_allowed: true
        }),
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);

    // 5. Insert RideRoutes
    await queryInterface.bulkInsert('ride_routes', [
      {
        route_id: 1,
        ride_id: 1,
        polyline_data: JSON.stringify({
          points: '_p~iF~ps|U_ulLnnqC_ga|F_kBxxpA'
        }),
        total_distance_km: 5.20,
        created_at: new Date()
      }
    ]);

    // 6. Insert RideStops (with POINT column for stop_location)
    await queryInterface.bulkInsert('ride_stops', [
      {
        stop_id: 1,
        ride_id: 1,
        sequence_order: 1,
        stop_label: 'Campus North Library',
        stop_location: Sequelize.fn('ST_GeomFromText', 'POINT(37.77900000 -122.41200000)', 4326),
        distance_from_source_km: 1.20,
        created_at: new Date()
      },
      {
        stop_id: 2,
        ride_id: 1,
        sequence_order: 2,
        stop_label: 'Science Complex',
        stop_location: Sequelize.fn('ST_GeomFromText', 'POINT(37.78300000 -122.40800000)', 4326),
        distance_from_source_km: 2.80,
        created_at: new Date()
      }
    ]);

    // 7. Insert Bookings (with POINT columns for pickup_location & drop_location)
    await queryInterface.bulkInsert('bookings', [
      {
        booking_id: 1,
        ride_id: 1,
        passenger_id: 2,
        pickup_label: 'Campus Main Gate',
        pickup_location: Sequelize.fn('ST_GeomFromText', 'POINT(37.77490000 -122.41940000)', 4326),
        drop_label: 'Science Complex',
        drop_location: Sequelize.fn('ST_GeomFromText', 'POINT(37.78300000 -122.40800000)', 4326),
        distance_traveled_km: 2.80,
        calculated_cost_share: 6.46,
        booking_status: 'pending',
        match_scenario: 'partial_exit',
        requested_at: new Date()
      }
    ]);

    // 8. Insert EmergencyContacts
    await queryInterface.bulkInsert('emergency_contacts', [
      {
        contact_id: 1,
        user_id: 2,
        contact_name: 'Emergency Contact Person',
        contact_phone: '+15559999',
        is_verified: true,
        created_at: new Date()
      }
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('emergency_contacts', null, {});
    await queryInterface.bulkDelete('bookings', null, {});
    await queryInterface.bulkDelete('ride_stops', null, {});
    await queryInterface.bulkDelete('ride_routes', null, {});
    await queryInterface.bulkDelete('rides', null, {});
    await queryInterface.bulkDelete('vehicles', null, {});
    await queryInterface.bulkDelete('profiles', null, {});
    await queryInterface.bulkDelete('users', null, {});
  }
};
