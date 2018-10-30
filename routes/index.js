'use strict';
const router = require('express').Router();

router.use('/campaign', require('../controller/campaign'));

module.exports = router;
