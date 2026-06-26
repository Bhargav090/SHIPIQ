const allocationService = require('../../services/AllocationService');

/**
 * GET /results — return last optimization output
 */
function getResults(req, res, next) {
  try {
    const result = allocationService.getResults();
    res.status(200).json({
      message: 'Results retrieved',
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getResults };
