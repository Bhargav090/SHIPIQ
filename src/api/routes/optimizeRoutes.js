const allocationService = require('../../services/AllocationService');

/**
 * POST /optimize — run allocation on stored input
 */
function postOptimize(req, res, next) {
  try {
    const result = allocationService.runOptimization();
    res.status(200).json({
      message: 'Optimization completed',
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { postOptimize };
