const { postInput, postSampleInput } = require('./inputRoutes');
const { postOptimize } = require('./optimizeRoutes');
const { getResults } = require('./resultsRoutes');
const { postReset } = require('./resetRoutes');

const router = require('express').Router();

router.post('/input', postInput);
router.post('/input/sample', postSampleInput);
router.post('/optimize', postOptimize);
router.get('/results', getResults);
router.post('/reset', postReset);

module.exports = router;
