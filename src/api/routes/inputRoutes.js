const allocationService = require('../../services/AllocationService');
const { validateInputPayload } = require('../../domain/types');

/**
 * POST /input — accept cargo and tank lists
 */
function postInput(req, res, next) {
  try {
    const { cargos, tanks } = validateInputPayload(req.body);
    const info = allocationService.saveInput(cargos, tanks);

    res.status(200).json({
      message: 'Input received successfully',
      data: {
        cargoCount: info.cargoCount,
        tankCount: info.tankCount,
        cargos,
        tanks,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /input/sample — quick way to load the assignment demo data
 */
function postSampleInput(req, res, next) {
  try {
    const info = allocationService.loadSampleData();
    const { cargos, tanks } = require('../../store/sessionStore').getInput();

    res.status(200).json({
      message: 'Sample assignment data loaded',
      data: { cargoCount: info.cargoCount, tankCount: info.tankCount, cargos, tanks },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { postInput, postSampleInput };
