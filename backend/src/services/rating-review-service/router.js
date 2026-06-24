import express from 'express';
import { authenticateJWT } from '../../middleware/authMiddleware.js';
import db from '../../../models/index.js';
import eventBus from '../../utils/eventBus.js';
import { redactContactInfo, validateStars, checkLowRatingAndLog } from './ratingReviewHelper.js';

const ratingsRouter = express.Router();
const reviewsRouter = express.Router();
const usersRouter = express.Router();

// ==========================================
// 1. RATINGS ROUTER (Mounted at /api/ratings)
// ==========================================

// POST /api/ratings - Submit a star rating
ratingsRouter.post('/', authenticateJWT, async (req, res) => {
  const raterId = req.user.id;
  const { booking_id, rated_user_id, stars } = req.body;

  if (!booking_id || !rated_user_id) {
    return res.status(400).json({
      status: 'error',
      message: 'Missing required parameters: booking_id, rated_user_id'
    });
  }

  try {
    // Validate stars
    try {
      validateStars(stars);
    } catch (validationError) {
      return res.status(400).json({
        status: 'error',
        message: validationError.message
      });
    }

    // Fetch booking
    const booking = await db.Booking.findByPk(booking_id, {
      include: [{ model: db.Ride, as: 'Ride' }]
    });

    if (!booking) {
      return res.status(404).json({
        status: 'error',
        message: 'Booking not found'
      });
    }

    // Enforce booking status is completed
    if (booking.booking_status !== 'completed') {
      return res.status(400).json({
        status: 'error',
        message: `Ratings can only be submitted for completed bookings (current booking status: ${booking.booking_status})`
      });
    }

    // Enforce rater cannot rate themselves
    if (parseInt(raterId, 10) === parseInt(rated_user_id, 10)) {
      return res.status(400).json({
        status: 'error',
        message: 'You cannot submit a rating for yourself'
      });
    }

    // Validate relationship: passenger <-> driver
    const isPassengerRater = parseInt(booking.passenger_id, 10) === parseInt(raterId, 10);
    const isDriverRater = parseInt(booking.Ride.driver_id, 10) === parseInt(raterId, 10);

    if (!isPassengerRater && !isDriverRater) {
      return res.status(403).json({
        status: 'error',
        message: 'Unauthorized: You are not a participant in this booking'
      });
    }

    const expectedRatedUserId = isPassengerRater ? booking.Ride.driver_id : booking.passenger_id;
    if (parseInt(rated_user_id, 10) !== parseInt(expectedRatedUserId, 10)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid rated_user_id: You can only rate your co-traveler on this booking'
      });
    }

    // Enforce duplicate protection: ONE rating per direction per booking
    const existingRating = await db.Rating.findOne({
      where: {
        booking_id,
        rater_id: raterId,
        rated_user_id
      }
    });

    if (existingRating) {
      return res.status(409).json({
        status: 'error',
        message: 'You have already rated this co-traveler for this booking'
      });
    }

    // Save Rating
    const newRating = await db.Rating.create({
      booking_id,
      rater_id: raterId,
      rated_user_id,
      stars,
      created_at: new Date()
    });

    // Run low-rating check asynchronously (non-blocking)
    checkLowRatingAndLog(rated_user_id).catch(err => {
      console.error('[Rating Service] Error in checkLowRatingAndLog background job:', err);
    });

    // Emit ratingSubmitted so the notification dispatcher can clean up outstanding rating prompts
    eventBus.emit('ratingSubmitted', {
      bookingId: booking_id,
      raterId,
      ratedUserId: rated_user_id
    });

    res.status(201).json({
      status: 'success',
      message: 'Rating submitted successfully',
      data: {
        rating_id: newRating.rating_id,
        booking_id: newRating.booking_id,
        rater_id: newRating.rater_id,
        rated_user_id: newRating.rated_user_id,
        stars: newRating.stars
      }
    });

  } catch (error) {
    console.error('[Rating Service] Error submitting rating:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while submitting rating'
    });
  }
});

// ==========================================
// 2. REVIEWS ROUTER (Mounted at /api/reviews)
// ==========================================

// POST /api/reviews - Submit a text review
reviewsRouter.post('/', authenticateJWT, async (req, res) => {
  const reviewerId = req.user.id;
  const { booking_id, reviewed_user_id, review_text } = req.body;

  if (!booking_id || !reviewed_user_id || !review_text) {
    return res.status(400).json({
      status: 'error',
      message: 'Missing required parameters: booking_id, reviewed_user_id, review_text'
    });
  }

  // Cap character limit at 500
  if (review_text.length > 500) {
    return res.status(400).json({
      status: 'error',
      message: 'Review text exceeds maximum character limit of 500'
    });
  }

  try {
    // Fetch booking
    const booking = await db.Booking.findByPk(booking_id, {
      include: [{ model: db.Ride, as: 'Ride' }]
    });

    if (!booking) {
      return res.status(404).json({
        status: 'error',
        message: 'Booking not found'
      });
    }

    // Enforce booking status is completed
    if (booking.booking_status !== 'completed') {
      return res.status(400).json({
        status: 'error',
        message: `Reviews can only be submitted for completed bookings (current booking status: ${booking.booking_status})`
      });
    }

    // Enforce reviewer cannot review themselves
    if (parseInt(reviewerId, 10) === parseInt(reviewed_user_id, 10)) {
      return res.status(400).json({
        status: 'error',
        message: 'You cannot submit a review for yourself'
      });
    }

    // Validate relationship: passenger <-> driver
    const isPassengerReviewer = parseInt(booking.passenger_id, 10) === parseInt(reviewerId, 10);
    const isDriverReviewer = parseInt(booking.Ride.driver_id, 10) === parseInt(reviewerId, 10);

    if (!isPassengerReviewer && !isDriverReviewer) {
      return res.status(403).json({
        status: 'error',
        message: 'Unauthorized: You are not a participant in this booking'
      });
    }

    const expectedReviewedUserId = isPassengerReviewer ? booking.Ride.driver_id : booking.passenger_id;
    if (parseInt(reviewed_user_id, 10) !== parseInt(expectedReviewedUserId, 10)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid reviewed_user_id: You can only review your co-traveler on this booking'
      });
    }

    // Enforce duplicate protection: ONE review per direction per booking
    const existingReview = await db.Review.findOne({
      where: {
        booking_id,
        reviewer_id: reviewerId,
        reviewed_user_id
      }
    });

    if (existingReview) {
      return res.status(409).json({
        status: 'error',
        message: 'You have already reviewed this co-traveler for this booking'
      });
    }

    // Content moderation regex redaction (email/phone number pattern check)
    const { redactedText, moderated } = redactContactInfo(review_text);

    // Save Review
    const newReview = await db.Review.create({
      booking_id,
      reviewer_id: reviewerId,
      reviewed_user_id,
      review_text: redactedText,
      is_moderated: moderated,
      created_at: new Date()
    });

    res.status(201).json({
      status: 'success',
      message: 'Review submitted successfully',
      data: {
        review_id: newReview.review_id,
        booking_id: newReview.booking_id,
        reviewer_id: newReview.reviewer_id,
        reviewed_user_id: newReview.reviewed_user_id,
        review_text: newReview.review_text,
        is_moderated: newReview.is_moderated
      }
    });

  } catch (error) {
    console.error('[Review Service] Error submitting review:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while submitting review'
    });
  }
});

// ==========================================
// 3. USERS ROUTER (Mounted at /api/users)
// ==========================================

// GET /api/users/:userId/rating-summary - Retrieve profile summary
usersRouter.get('/:userId/rating-summary', async (req, res) => {
  const userId = parseInt(req.params.userId, 10);

  try {
    // Check if user exists
    const user = await db.User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Aggregate rating
    const ratingData = await db.Rating.findOne({
      where: { rated_user_id: userId },
      attributes: [
        [db.sequelize.fn('AVG', db.sequelize.col('stars')), 'avgRating'],
        [db.sequelize.fn('COUNT', db.sequelize.col('stars')), 'totalRatings']
      ],
      raw: true
    });

    const avgRating = ratingData && ratingData.avgRating ? parseFloat(parseFloat(ratingData.avgRating).toFixed(2)) : 0;
    const totalRatings = ratingData && ratingData.totalRatings ? parseInt(ratingData.totalRatings, 10) : 0;

    // Completed rides count (passenger bookings + driver rides)
    const completedBookingsCount = await db.Booking.count({
      where: { passenger_id: userId, booking_status: 'completed' }
    });
    const completedRidesCount = await db.Ride.count({
      where: { driver_id: userId, status: 'completed' }
    });
    const completedRidesTotal = completedBookingsCount + completedRidesCount;

    // Trigger low rating check (non-blocking)
    checkLowRatingAndLog(userId).catch(err => {
      console.error('[Rating Service] Error in checkLowRatingAndLog background job:', err);
    });

    res.status(200).json({
      status: 'success',
      data: {
        user_id: userId,
        average_rating: avgRating,
        total_ratings: totalRatings,
        completed_rides_count: completedRidesTotal
      }
    });

  } catch (error) {
    console.error('[Rating/Review Service] Error fetching rating summary:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while fetching rating summary'
    });
  }
});

// GET /api/users/:userId/reviews - Retrieve reviews for a user
usersRouter.get('/:userId/reviews', async (req, res) => {
  const userId = parseInt(req.params.userId, 10);

  try {
    // Check if user exists
    const user = await db.User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Fetch reviews (chronological, most recent first, join reviewer full name)
    const reviews = await db.Review.findAll({
      where: { reviewed_user_id: userId },
      order: [['created_at', 'DESC']],
      include: [
        {
          model: db.User,
          as: 'Reviewer',
          attributes: ['user_id'],
          include: [
            {
              model: db.Profile,
              as: 'Profile',
              attributes: ['full_name', 'photo_url']
            }
          ]
        }
      ]
    });

    const formattedReviews = reviews.map(r => ({
      review_id: parseInt(r.review_id, 10),
      booking_id: parseInt(r.booking_id, 10),
      review_text: r.review_text,
      is_moderated: r.is_moderated,
      created_at: r.created_at,
      reviewer: {
        user_id: r.Reviewer?.user_id ? parseInt(r.Reviewer.user_id, 10) : null,
        full_name: r.Reviewer?.Profile?.full_name || 'Anonymous User',
        photo_url: r.Reviewer?.Profile?.photo_url || null
      }
    }));

    res.status(200).json({
      status: 'success',
      data: formattedReviews
    });

  } catch (error) {
    console.error('[Rating/Review Service] Error fetching user reviews:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error while fetching reviews'
    });
  }
});

// GET /ratings/health (stub compatibility)
ratingsRouter.get('/health', (req, res) => {
  res.json({ service: 'Rating and Review Service', status: 'OK' });
});

export { ratingsRouter as default, reviewsRouter, usersRouter };
