/**
 * Mock Rides Database Utility
 * Manages simulated ride listings, active passenger bookings, driver publications,
 * join requests, notification logs, and completed ride histories in localStorage.
 */

const DEFAULT_MOCK_RIDES = [
  {
    ride_id: 101,
    driver_id: 201,
    driver_name: "Aditya Sharma",
    driver_rating: 4.9,
    driver_verified: true,
    driver_avatar: "",
    vehicle_type: "two_wheeler",
    vehicle_name: "Honda Activa 6G (Black)",
    source_label: "Academic Block A",
    destination_label: "Metro Station Terminal 2",
    ride_date: new Date().toISOString().split('T')[0], // today
    departure_time: "08:30",
    total_seats: 1,
    available_seats: 1,
    estimated_distance_km: 8.5,
    estimated_total_cost: 40.00,
    match_scenario: "exact",
    match_percentage: 100,
    cost_share: 20.00,
    preferences: {
      gender: "any",
      smoking: false,
      luggage: "small"
    }
  },
  {
    ride_id: 102,
    driver_id: 202,
    driver_name: "Priya Patel",
    driver_rating: 4.8,
    driver_verified: true,
    driver_avatar: "",
    vehicle_type: "two_wheeler",
    vehicle_name: "Suzuki Access 125 (Blue)",
    source_label: "Main Campus Gate 1",
    destination_label: "Tech Park Cluster B",
    ride_date: new Date().toISOString().split('T')[0], // today
    departure_time: "09:00",
    total_seats: 1,
    available_seats: 1,
    estimated_distance_km: 12.0,
    estimated_total_cost: 60.00,
    match_scenario: "exact",
    match_percentage: 100,
    cost_share: 30.00,
    preferences: {
      gender: "female_only",
      smoking: false,
      luggage: "none"
    }
  },
  {
    ride_id: 103,
    driver_id: 203,
    driver_name: "Karan Malhotra",
    driver_rating: 4.6,
    driver_verified: true,
    driver_avatar: "",
    vehicle_type: "car",
    vehicle_name: "Maruti Swift (Red)",
    source_label: "IT Park Gate 3",
    destination_label: "Downtown Residential Hub",
    ride_date: new Date().toISOString().split('T')[0], // today
    departure_time: "17:30",
    total_seats: 3,
    available_seats: 2,
    estimated_distance_km: 18.2,
    estimated_total_cost: 160.00,
    match_scenario: "partial_exit",
    match_percentage: 75,
    cost_share: 50.00,
    preferences: {
      gender: "any",
      smoking: false,
      luggage: "medium"
    }
  },
  {
    ride_id: 104,
    driver_id: 204,
    driver_name: "Vikram Singh",
    driver_rating: 4.2,
    driver_verified: false,
    driver_avatar: "",
    vehicle_type: "car",
    vehicle_name: "Honda City (White)",
    source_label: "South Suburban Complex",
    destination_label: "Academic Block A",
    ride_date: new Date(Date.now() + 86400000).toISOString().split('T')[0], // tomorrow
    departure_time: "08:00",
    total_seats: 4,
    available_seats: 0, // Mock fully booked scenario
    estimated_distance_km: 22.5,
    estimated_total_cost: 200.00,
    match_scenario: "partial_pickup",
    match_percentage: 60,
    cost_share: 45.00,
    preferences: {
      gender: "any",
      smoking: true,
      luggage: "large"
    }
  }
];

const DEFAULT_MOCK_REQUESTS = [
  {
    request_id: 301,
    ride_id: 101,
    ride_route: "Academic Block A ➔ Metro Station Terminal 2",
    ride_time: "08:30",
    passenger_name: "Rohan Verma",
    passenger_avatar: "",
    passenger_rating: 4.7,
    passenger_verified: true,
    pickup_point: "Boys Hostel Block C",
    drop_point: "Metro Station Terminal 2",
    status: "pending"
  },
  {
    request_id: 302,
    ride_id: 101,
    ride_route: "Academic Block A ➔ Metro Station Terminal 2",
    ride_time: "08:30",
    passenger_name: "Sneha Kapur",
    passenger_avatar: "",
    passenger_rating: 4.9,
    passenger_verified: true,
    pickup_point: "Academic Block A",
    drop_point: "Metro Gate 4",
    status: "pending"
  },
  {
    request_id: 303,
    ride_id: 103,
    ride_route: "IT Park Gate 3 ➔ Downtown Residential Hub",
    ride_time: "17:30",
    passenger_name: "Divya Shah",
    passenger_avatar: "",
    passenger_rating: 4.3,
    passenger_verified: false,
    pickup_point: "IT Park Gate 3",
    drop_point: "Downtown Residential Hub",
    status: "pending"
  }
];

const DEFAULT_MOCK_NOTIFICATIONS = [
  {
    notification_id: 401,
    title: "Booking Confirmed",
    message: "Aditya Sharma accepted your request to join ride #101 today at 08:30.",
    type: "booking",
    timestamp: "Today, 10:15 AM",
    is_read: false
  },
  {
    notification_id: 402,
    title: "🚨 SOS Alert Dispatched",
    message: "Your emergency contacts were notified of an SOS event during ride #102. If you are safe, please confirm your status.",
    type: "safety",
    timestamp: "Yesterday, 6:45 PM",
    is_read: false
  },
  {
    notification_id: 403,
    title: "Rate Your Co-Traveler",
    message: "How was your ride with Vikram Singh? Please leave a star rating and feedback.",
    type: "rating",
    timestamp: "2 days ago, 5:10 PM",
    is_read: true
  },
  {
    notification_id: 404,
    title: "Commute Starting Soon",
    message: "Reminder: Your ride with Priya Patel departs from Main Campus Gate 1 in 30 minutes.",
    type: "booking",
    timestamp: "3 days ago, 8:30 AM",
    is_read: true
  },
  {
    notification_id: 405,
    title: "System Update",
    message: "Welcome to Community Ride! Complete your profile to start sharing your commutes.",
    type: "system",
    timestamp: "1 week ago",
    is_read: true
  }
];

const DEFAULT_MOCK_HISTORY = [
  {
    history_id: 501,
    source_label: "Academic Block A",
    destination_label: "Metro Station Terminal 2",
    ride_date: "Yesterday",
    departure_time: "08:30",
    role: "passenger",
    co_traveler_name: "Aditya Sharma",
    co_traveler_avatar: "",
    co_traveler_rating: 4.9,
    cost: 20.00,
    rating_given: 5,
    distance_km: 8.5
  },
  {
    history_id: 502,
    source_label: "IT Park Gate 3",
    destination_label: "Downtown Residential Hub",
    ride_date: "3 days ago",
    departure_time: "17:30",
    role: "passenger",
    co_traveler_name: "Karan Malhotra",
    co_traveler_avatar: "",
    co_traveler_rating: 4.6,
    cost: 50.00,
    rating_given: 4,
    distance_km: 18.2
  },
  {
    history_id: 503,
    source_label: "Main Campus Gate 1",
    destination_label: "Tech Park Cluster B",
    ride_date: "5 days ago",
    departure_time: "09:00",
    role: "driver",
    co_traveler_name: "Sneha Reddy & Priya",
    co_traveler_avatar: "",
    co_traveler_rating: 4.8,
    cost: 60.00, // fuel cost split recovered
    rating_given: 5,
    distance_km: 12.0
  },
  {
    history_id: 504,
    source_label: "Central Library",
    destination_label: "IT Park Gate 3",
    ride_date: "1 week ago",
    departure_time: "14:15",
    role: "passenger",
    co_traveler_name: "Vikram Singh",
    co_traveler_avatar: "",
    co_traveler_rating: 4.2,
    cost: 30.00,
    rating_given: null, // unrated example
    distance_km: 12.0
  },
  {
    history_id: 505,
    source_label: "South Suburban Complex",
    destination_label: "Academic Block A",
    ride_date: "2 weeks ago",
    departure_time: "08:00",
    role: "driver",
    co_traveler_name: "Amit & Rahul",
    co_traveler_avatar: "",
    co_traveler_rating: 4.5,
    cost: 100.00, // fuel cost split recovered
    rating_given: 5,
    distance_km: 18.2
  }
];

export const mockRides = {
  // Initialize mock DB in localStorage
  init: () => {
    if (!localStorage.getItem('mockRides')) {
      localStorage.setItem('mockRides', JSON.stringify(DEFAULT_MOCK_RIDES));
    }
    if (!localStorage.getItem('mockRequests')) {
      localStorage.setItem('mockRequests', JSON.stringify(DEFAULT_MOCK_REQUESTS));
    }
    if (!localStorage.getItem('mockNotifications')) {
      localStorage.setItem('mockNotifications', JSON.stringify(DEFAULT_MOCK_NOTIFICATIONS));
    }
    if (!localStorage.getItem('mockHistory')) {
      localStorage.setItem('mockHistory', JSON.stringify(DEFAULT_MOCK_HISTORY));
    }
  },

  // RIDES OPERATIONS
  getAll: () => {
    mockRides.init();
    return JSON.parse(localStorage.getItem('mockRides'));
  },

  getById: (id) => {
    const list = mockRides.getAll();
    return list.find(r => r.ride_id === parseInt(id, 10)) || null;
  },

  search: (pickup, drop, date) => {
    const list = mockRides.getAll();
    const pQuery = (pickup || '').toLowerCase().trim();
    const dQuery = (drop || '').toLowerCase().trim();

    return list.filter(r => {
      if (!pQuery && !dQuery) return true;
      const matchesSource = r.source_label.toLowerCase().includes(pQuery) || pQuery.includes(r.source_label.toLowerCase());
      const matchesDest = r.destination_label.toLowerCase().includes(dQuery) || dQuery.includes(r.destination_label.toLowerCase());
      return matchesSource || matchesDest;
    });
  },

  create: (rideData) => {
    const list = mockRides.getAll();
    const newId = list.reduce((max, r) => r.ride_id > max ? r.ride_id : max, 100) + 1;
    
    const newRide = {
      ride_id: newId,
      driver_id: 999, // Current user
      driver_name: rideData.driverName || "You (Driver)",
      driver_rating: 5.0,
      driver_verified: true,
      driver_avatar: "",
      vehicle_type: rideData.vehicleType || "two_wheeler",
      vehicle_name: rideData.vehicleName || (rideData.vehicleType === 'car' ? "Your Car" : "Your Two-Wheeler"),
      source_label: rideData.sourceLabel,
      destination_label: rideData.destinationLabel,
      ride_date: rideData.rideDate,
      departure_time: rideData.departureTime,
      total_seats: parseInt(rideData.totalSeats, 10),
      available_seats: parseInt(rideData.totalSeats, 10),
      estimated_distance_km: parseFloat(rideData.distanceKm || 10.0),
      estimated_total_cost: parseFloat(rideData.estimatedCost || 80.00),
      match_scenario: "exact",
      match_percentage: 100,
      cost_share: parseFloat(rideData.costShare || 40.00),
      preferences: rideData.preferences || { gender: "any", smoking: false, luggage: "none" }
    };

    list.push(newRide);
    localStorage.setItem('mockRides', JSON.stringify(list));
    return newRide;
  },

  // ACTIVE BOOKING SESSION STORAGE
  getActiveBooking: () => {
    const bookingStr = localStorage.getItem('mockActiveBooking');
    return bookingStr ? JSON.parse(bookingStr) : null;
  },

  setActiveBooking: (ride) => {
    localStorage.setItem('mockActiveBooking', JSON.stringify(ride));
  },

  clearActiveBooking: () => {
    localStorage.removeItem('mockActiveBooking');
  },

  // RIDE JOIN REQUESTS OPERATIONS
  getPendingRequests: () => {
    mockRides.init();
    return JSON.parse(localStorage.getItem('mockRequests'));
  },

  updateRequestStatus: (requestId, status) => {
    const list = mockRides.getPendingRequests();
    const updated = list.map(req => {
      if (req.request_id === parseInt(requestId, 10)) {
        return { ...req, status };
      }
      return req;
    });
    localStorage.setItem('mockRequests', JSON.stringify(updated));
    return updated.find(r => r.request_id === parseInt(requestId, 10));
  },

  resetRequests: () => {
    localStorage.setItem('mockRequests', JSON.stringify(DEFAULT_MOCK_REQUESTS));
  },

  clearAllRequests: () => {
    localStorage.setItem('mockRequests', JSON.stringify([]));
  },

  // NOTIFICATION TIMELINE OPERATIONS
  getNotifications: () => {
    mockRides.init();
    return JSON.parse(localStorage.getItem('mockNotifications'));
  },

  toggleNotificationRead: (notificationId) => {
    const list = mockRides.getNotifications();
    const updated = list.map(n => {
      if (n.notification_id === parseInt(notificationId, 10)) {
        return { ...n, is_read: true };
      }
      return n;
    });
    localStorage.setItem('mockNotifications', JSON.stringify(updated));
    return updated;
  },

  markAllNotificationsAsRead: () => {
    const list = mockRides.getNotifications();
    const updated = list.map(n => ({ ...n, is_read: true }));
    localStorage.setItem('mockNotifications', JSON.stringify(updated));
    return updated;
  },

  resetNotifications: () => {
    localStorage.setItem('mockNotifications', JSON.stringify(DEFAULT_MOCK_NOTIFICATIONS));
  },

  clearAllNotifications: () => {
    localStorage.setItem('mockNotifications', JSON.stringify([]));
  },

  // RIDE HISTORY LOG OPERATIONS
  getHistory: () => {
    mockRides.init();
    return JSON.parse(localStorage.getItem('mockHistory'));
  },

  rateHistoryEntry: (historyId, rating) => {
    const list = mockRides.getHistory();
    const updated = list.map(item => {
      if (item.history_id === parseInt(historyId, 10)) {
        return { ...item, rating_given: rating };
      }
      return item;
    });
    localStorage.setItem('mockHistory', JSON.stringify(updated));
    return updated;
  },

  resetHistory: () => {
    localStorage.setItem('mockHistory', JSON.stringify(DEFAULT_MOCK_HISTORY));
  },

  clearAllHistory: () => {
    localStorage.setItem('mockHistory', JSON.stringify([]));
  },

  addHistoryEntry: (entry) => {
    const list = mockRides.getHistory();
    const newEntry = {
      history_id: Date.now(),
      co_traveler_avatar: "",
      rating_given: null,
      ...entry
    };
    list.unshift(newEntry);
    localStorage.setItem('mockHistory', JSON.stringify(list));
    return newEntry;
  },

  addNotification: (notification) => {
    const list = mockRides.getNotifications();
    const newNotification = {
      notification_id: Date.now(),
      is_read: false,
      timestamp: "Today, " + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      ...notification
    };
    list.unshift(newNotification);
    localStorage.setItem('mockNotifications', JSON.stringify(list));
    return newNotification;
  }
};
