import db from '../../../models/index.js';
import ratingsRouter, { reviewsRouter, usersRouter } from './router.js';
import { redactContactInfo, validateStars, checkLowRatingAndLog } from './ratingReviewHelper.js';

// Simple assertion helper
const assert = (condition, message) => {
  if (condition) {
    console.log(`✅ PASS: ${message}`);
  } else {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  }
};

// Mock response builder
const mockResponse = () => {
  const res = {};
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data) => {
    res.jsonData = data;
    return res;
  };
  return res;
};

// Retrieve handler helper from router stack
const getHandler = (router, path, method) => {
  const layer = router.stack.find(l => l.route && l.route.path === path && l.route.methods[method]);
  if (!layer) throw new Error(`Handler not found for ${method.toUpperCase()} ${path}`);
  // The last element in the route's stack is our actual controller function (others are middlewares like authenticateJWT)
  return layer.route.stack[layer.route.stack.length - 1].handle;
};

const runTests = async () => {
  console.log(`==================================================`);
  console.log(`🧪 RUNNING RATINGS & REVIEWS MODULE UNIT TESTS`);
  console.log(`==================================================\n`);

  // ==========================================
  // 1. TEST HELPER FUNCTIONS
  // ==========================================
  console.log('--- 1. Testing Helper Functions ---');

  // Stars Validation
  try {
    validateStars(5);
    validateStars(1);
    console.log('✅ PASS: Star ratings (1 and 5) validated successfully');
  } catch (err) {
    assert(false, 'Valid star ratings should pass validation');
  }

  try {
    validateStars(4.5);
    assert(false, 'Decimal star rating should be rejected');
  } catch (err) {
    assert(err.message.includes('must be an integer'), 'Rejects decimal star ratings');
  }

  try {
    validateStars(0);
    assert(false, 'Star rating less than 1 should be rejected');
  } catch (err) {
    assert(err.message.includes('between 1 and 5'), 'Rejects star rating < 1');
  }

  try {
    validateStars(6);
    assert(false, 'Star rating greater than 5 should be rejected');
  } catch (err) {
    assert(err.message.includes('between 1 and 5'), 'Rejects star rating > 5');
  }

  // Contact Info Redaction
  const textNoContacts = 'Great ride! Driver was very polite and driving was smooth.';
  const resNoContacts = redactContactInfo(textNoContacts);
  assert(resNoContacts.moderated === false, 'Text without contact info is not moderated');
  assert(resNoContacts.redactedText === textNoContacts, 'Text without contact info is left unchanged');

  const textWithEmail = 'Please contact me at john.doe@campus.edu for key sharing.';
  const resWithEmail = redactContactInfo(textWithEmail);
  assert(resWithEmail.moderated === true, 'Email pattern triggers moderation flag');
  assert(resWithEmail.redactedText.includes('[redacted]'), 'Email pattern is redacted');
  assert(!resWithEmail.redactedText.includes('john.doe@campus.edu'), 'Actual email is removed');

  const textWithPhone = 'My phone number is +1-555-0199 or call 5550200.';
  const resWithPhone = redactContactInfo(textWithPhone);
  assert(resWithPhone.moderated === true, 'Phone number pattern triggers moderation flag');
  assert(resWithPhone.redactedText.includes('[redacted]'), 'Phone number patterns are redacted');
  assert(!resWithPhone.redactedText.includes('555-0199') && !resWithPhone.redactedText.includes('5550200'), 'Actual phone numbers are removed');

  console.log('✅ PASS: Helper functions tested successfully\n');

  // ==========================================
  // 2. TEST POST /api/ratings ENDPOINT
  // ==========================================
  console.log('--- 2. Testing POST /api/ratings ---');

  const ratingsPostHandler = getHandler(ratingsRouter, '/', 'post');

  // Mock DB for Rating Tests
  const mockBookingCompleted = {
    booking_id: 10,
    passenger_id: 1,
    booking_status: 'completed',
    Ride: {
      driver_id: 2
    }
  };

  const mockBookingPending = {
    booking_id: 11,
    passenger_id: 1,
    booking_status: 'pending',
    Ride: {
      driver_id: 2
    }
  };

  // Case A: Booking not found
  db.Booking.findByPk = async (id) => (id === 10 || id === 11) ? null : null; // simulated missing booking
  const reqNotFound = { user: { id: 1 }, body: { booking_id: 99, rated_user_id: 2, stars: 5 } };
  const resNotFound = mockResponse();
  await ratingsPostHandler(reqNotFound, resNotFound);
  assert(resNotFound.statusCode === 404, 'POST /ratings returns 404 if booking not found');

  // Reset Mock to return completed and pending bookings
  db.Booking.findByPk = async (id) => {
    if (id === 10) return mockBookingCompleted;
    if (id === 11) return mockBookingPending;
    return null;
  };

  // Case B: Booking status is not completed
  const reqNotCompleted = { user: { id: 1 }, body: { booking_id: 11, rated_user_id: 2, stars: 5 } };
  const resNotCompleted = mockResponse();
  await ratingsPostHandler(reqNotCompleted, resNotCompleted);
  assert(resNotCompleted.statusCode === 400, 'POST /ratings returns 400 if booking is not completed');
  assert(resNotCompleted.jsonData.message.includes('only be submitted for completed bookings'), 'Returns clear message regarding completion status gate');

  // Case C: Rater is not passenger or driver
  const reqNotParticipant = { user: { id: 9 }, body: { booking_id: 10, rated_user_id: 2, stars: 5 } };
  const resNotParticipant = mockResponse();
  await ratingsPostHandler(reqNotParticipant, resNotParticipant);
  assert(resNotParticipant.statusCode === 403, 'POST /ratings returns 403 if rater is not a participant');

  // Case D: Rated user is not driver/passenger co-traveler
  const reqInvalidRated = { user: { id: 1 }, body: { booking_id: 10, rated_user_id: 3, stars: 5 } };
  const resInvalidRated = mockResponse();
  await ratingsPostHandler(reqInvalidRated, resInvalidRated);
  assert(resInvalidRated.statusCode === 400, 'POST /ratings returns 400 if rated_user_id is not the co-traveler');

  // Case E: Duplicate rating check
  db.Rating.findOne = async () => ({ rating_id: 100 }); // simulated already existing rating
  const reqDuplicate = { user: { id: 1 }, body: { booking_id: 10, rated_user_id: 2, stars: 5 } };
  const resDuplicate = mockResponse();
  await ratingsPostHandler(reqDuplicate, resDuplicate);
  assert(resDuplicate.statusCode === 409, 'POST /ratings returns 409 if rating already exists in this direction');

  // Case F: Valid rating submission
  db.Rating.findOne = async () => null; // no existing rating
  let ratingCreated = false;
  db.Rating.create = async (data) => {
    ratingCreated = true;
    return { rating_id: 101, ...data };
  };
  
  // Mock checkLowRatingAndLog logic during rating submission
  let lowRatingLogged = false;
  db.Rating.findOne = async (options) => {
    if (options && options.where && options.where.rated_user_id === 2 && options.attributes) {
      // AVG mock
      return { avgRating: 2.0, totalRatings: 2 };
    }
    return null;
  };
  db.AuditLog.create = async () => {
    lowRatingLogged = true;
  };

  const reqValid = { user: { id: 1 }, body: { booking_id: 10, rated_user_id: 2, stars: 5 } };
  const resValid = mockResponse();
  await ratingsPostHandler(reqValid, resValid);
  assert(resValid.statusCode === 201, 'POST /ratings returns 201 Created for a valid rating submission');
  assert(ratingCreated === true, 'Rating record is successfully created in the database');
  
  // Wait briefly for checkLowRatingAndLog async execution to finish
  await new Promise(resolve => setTimeout(resolve, 50));
  assert(lowRatingLogged === true, 'Audit log alert is successfully triggered when rating average dips below 2.5');

  console.log('✅ PASS: POST /api/ratings endpoint tested successfully\n');

  // ==========================================
  // 3. TEST POST /api/reviews ENDPOINT
  // ==========================================
  console.log('--- 3. Testing POST /api/reviews ---');

  const reviewsPostHandler = getHandler(reviewsRouter, '/', 'post');

  // Case A: Review exceeds 500 characters
  const superLongText = 'a'.repeat(501);
  const reqTooLong = { user: { id: 1 }, body: { booking_id: 10, reviewed_user_id: 2, review_text: superLongText } };
  const resTooLong = mockResponse();
  await reviewsPostHandler(reqTooLong, resTooLong);
  assert(resTooLong.statusCode === 400, 'POST /reviews returns 400 if text exceeds 500 character limit');
  assert(resTooLong.jsonData.message.includes('exceeds maximum character limit'), 'Returns clear character limit error');

  // Case B: Valid review with email/phone -> triggers redaction and saves
  db.Review.findOne = async () => null; // no existing review
  let reviewCreated = false;
  let reviewTextSaved = '';
  let reviewModeratedFlag = false;
  db.Review.create = async (data) => {
    reviewCreated = true;
    reviewTextSaved = data.review_text;
    reviewModeratedFlag = data.is_moderated;
    return { review_id: 201, ...data };
  };

  const reqWithContact = { 
    user: { id: 1 }, 
    body: { 
      booking_id: 10, 
      reviewed_user_id: 2, 
      review_text: 'Nice ride! Call me at 555-0100 or email at travel@campus.edu.' 
    } 
  };
  const resWithContact = mockResponse();
  await reviewsPostHandler(reqWithContact, resWithContact);
  assert(resWithContact.statusCode === 201, 'POST /reviews returns 201 Created for a valid review');
  assert(reviewCreated === true, 'Review record is successfully created in the database');
  assert(reviewModeratedFlag === true, 'Review is flagged as moderated (is_moderated: true)');
  assert(!reviewTextSaved.includes('555-0100') && !reviewTextSaved.includes('travel@campus.edu'), 'Review text contact info was successfully redacted');
  assert(reviewTextSaved.includes('[redacted]'), 'Phone and email are replaced with [redacted]');

  console.log('✅ PASS: POST /api/reviews endpoint tested successfully\n');

  // ==========================================
  // 4. TEST GET /api/users/:userId/rating-summary ENDPOINT
  // ==========================================
  console.log('--- 4. Testing GET /api/users/:userId/rating-summary ---');

  const ratingSummaryHandler = getHandler(usersRouter, '/:userId/rating-summary', 'get');

  // Setup DB Mocks
  db.User.findByPk = async (id) => (id === 5) ? { user_id: 5 } : null;
  db.Rating.findOne = async () => ({ avgRating: 4.25, totalRatings: 4 });
  db.Booking.count = async () => 3; // passenger completed bookings
  db.Ride.count = async () => 2; // driver completed rides

  const reqSummary = { params: { userId: 5 } };
  const resSummary = mockResponse();
  await ratingSummaryHandler(reqSummary, resSummary);

  assert(resSummary.statusCode === 200, 'GET /rating-summary returns 200 OK');
  assert(resSummary.jsonData.data.average_rating === 4.25, 'Returns correct average rating');
  assert(resSummary.jsonData.data.completed_rides_count === 5, 'Returns correct completed rides count (3 passenger bookings + 2 driver rides = 5 total)');

  console.log('✅ PASS: GET /api/users/:userId/rating-summary endpoint tested successfully\n');

  // ==========================================
  // 5. TEST GET /api/users/:userId/reviews ENDPOINT
  // ==========================================
  console.log('--- 5. Testing GET /api/users/:userId/reviews ---');

  const userReviewsHandler = getHandler(usersRouter, '/:userId/reviews', 'get');

  const mockDbReviews = [
    {
      review_id: 201,
      booking_id: 10,
      review_text: 'Nice ride!',
      is_moderated: false,
      created_at: new Date('2026-06-20T10:00:00Z'),
      Reviewer: {
        user_id: 1,
        Profile: {
          full_name: 'Jane Reviewer',
          photo_url: 'http://example.com/photo.jpg'
        }
      }
    }
  ];

  db.User.findByPk = async (id) => (id === 5) ? { user_id: 5 } : null;
  db.Review.findAll = async () => mockDbReviews;

  const reqReviews = { params: { userId: 5 } };
  const resReviews = mockResponse();
  await userReviewsHandler(reqReviews, resReviews);

  assert(resReviews.statusCode === 200, 'GET /reviews returns 200 OK');
  assert(resReviews.jsonData.data.length === 1, 'Returns list of reviews');
  assert(resReviews.jsonData.data[0].review_text === 'Nice ride!', 'Returns correct review text');
  assert(resReviews.jsonData.data[0].reviewer.full_name === 'Jane Reviewer', 'Includes non-anonymous reviewer name');

  console.log('✅ PASS: GET /api/users/:userId/reviews endpoint tested successfully\n');

  console.log(`==================================================`);
  console.log(`📊 TEST RESULTS SUMMARY:`);
  console.log(`   ALL TESTS PASSED!`);
  console.log(`==================================================`);
};

runTests().catch(err => {
  console.error('Test run encountered an error:', err);
  process.exit(1);
});
