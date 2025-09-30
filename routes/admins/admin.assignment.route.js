const { verifyToken } = require('../../middlewares/verifyToken');

const router = require('express').Router();

router
    .get('/:classId?/:section?', [verifyToken], )

module.exports = router