import db from '../../../models/index.js';

// Helper: Redact email and phone patterns from text
export const redactContactInfo = (text) => {
  if (!text) return { redactedText: '', moderated: false };

  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  // Matches common phone number patterns (e.g. +1 555-555-5555, (555) 555-5555, 5555555555, 555-5555, +1-555-0199)
  // and generic 7 to 11 digit continuous numbers
  const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{4}|(?:\+?\d{1,3}[-.\s]?)?\b\d{3}[-.\s]?\d{4}\b|\b\d{7,11}\b/g;

  let moderated = false;
  let redactedText = text;

  if (emailRegex.test(text)) {
    moderated = true;
    redactedText = redactedText.replace(emailRegex, '[redacted]');
  }

  // Reset regex index before test/replace
  phoneRegex.lastIndex = 0;
  if (phoneRegex.test(text)) {
    moderated = true;
    redactedText = redactedText.replace(phoneRegex, '[redacted]');
  }

  return { redactedText, moderated };
};

// Helper: Validate star rating
export const validateStars = (stars) => {
  if (stars === undefined || stars === null) {
    throw new Error('Star rating is required');
  }
  if (typeof stars !== 'number' || !Number.isInteger(stars) || stars < 1 || stars > 5) {
    throw new Error('Stars must be an integer between 1 and 5');
  }
  return true;
};

// Helper: Check average rating and write audit log if it dips below 2.5
export const checkLowRatingAndLog = async (userId) => {
  try {
    const ratingData = await db.Rating.findOne({
      where: { rated_user_id: userId },
      attributes: [
        [db.sequelize.fn('AVG', db.sequelize.col('stars')), 'avgRating'],
        [db.sequelize.fn('COUNT', db.sequelize.col('stars')), 'totalRatings']
      ],
      raw: true
    });

    const avgRating = ratingData && ratingData.avgRating ? parseFloat(parseFloat(ratingData.avgRating).toFixed(2)) : null;
    const totalRatings = ratingData && ratingData.totalRatings ? parseInt(ratingData.totalRatings, 10) : 0;

    if (avgRating !== null && avgRating < 2.5) {
      console.warn(`⚠️ [Low Rating Alert] User ${userId} average rating is ${avgRating} (based on ${totalRatings} ratings). Logging alert.`);
      
      await db.AuditLog.create({
        actor_user_id: null, // System alert
        target_user_id: userId,
        action_type: 'LOW_RATING_ALERT',
        action_detail: {
          message: `User average rating has dipped to ${avgRating}, which is below the threshold of 2.5.`,
          average_rating: avgRating,
          total_ratings: totalRatings,
          threshold: 2.5,
          timestamp: new Date().toISOString()
        }
      });
    }

    return { avgRating, totalRatings };
  } catch (error) {
    console.error('[Rating/Review Service] Error checking low rating:', error);
    // Do not crash the caller if audit logging fails
    return { avgRating: null, totalRatings: 0 };
  }
};
