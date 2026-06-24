import db from '../models/index.js';

async function seedRide() {
  console.log('🌱 Seeding driver and ride details...');

  try {
    // 1. Create Driver User
    const driver = await db.User.create({
      phone_number: '+919999999991',
      email: 'driver.test@institution.edu',
      password_hash: 'mock_hash',
      phone_verified: true,
      email_verified: true,
      account_status: 'active'
    });
    console.log('✔ Driver user created:', driver.user_id);

    // 2. Create Driver Profile
    await db.Profile.create({
      user_id: driver.user_id,
      full_name: 'Aditya Sharma (Driver)'
    });
    console.log('✔ Driver profile created');

    // 3. Create Driver Active Vehicle
    const vehicle = await db.Vehicle.create({
      user_id: driver.user_id,
      vehicle_type: 'car',
      make: 'Honda',
      model: 'City',
      registration_number: 'TS09EF1234',
      color: 'White',
      is_active: true
    });
    console.log('✔ Vehicle created:', vehicle.vehicle_id);

    // 4. Create Ride (Academic Block A ➔ Metro Station Terminal 2)
    const todayStr = new Date().toISOString().split('T')[0];
    const ride = await db.Ride.create({
      driver_id: driver.user_id,
      vehicle_id: vehicle.vehicle_id,
      source_label: 'Academic Block A',
      source_location: db.sequelize.fn('ST_GeomFromText', 'POINT(37.775 -122.418)', 4326),
      destination_label: 'Metro Station Terminal 2',
      destination_location: db.sequelize.fn('ST_GeomFromText', 'POINT(37.789 -122.401)', 4326),
      ride_date: todayStr,
      departure_time: '08:30:00',
      total_seats: 3,
      available_seats: 3,
      estimated_distance_km: 8.5,
      estimated_total_cost: 120.00,
      status: 'scheduled',
      preferences: JSON.stringify({
        gender: 'any',
        smoking: false,
        luggage: 'medium'
      })
    });
    console.log('✔ Ride created successfully:', ride.ride_id);

    // 5. Create Ride Route
    await db.RideRoute.create({
      ride_id: ride.ride_id,
      polyline_data: JSON.stringify({ points: [[37.775, -122.418], [37.789, -122.401]] }),
      total_distance_km: 8.5
    });
    console.log('✔ Ride route polyline created');

    console.log('🎉 Seeding completed successfully!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seedRide();
