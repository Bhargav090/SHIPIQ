const allocationService = require('../../services/AllocationService');

/**
 * POST /reset — clear stored input and results
 */
function postReset(req, res, next) {
  try {
    allocationService.reset();
    res.status(200).json({
      message: 'Session cleared',
      data: { cleared: true },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { postReset };
