const express = require('express');
const router = express.Router();

// const auth = require('../middleware/auth');

const festivalCtrl = require('../controllers/festival');
router.get('/', festivalCtrl.getAllFestivals);
router.post('/', festivalCtrl.createOneFestival);
router.get('/:id', festivalCtrl.getOneFestival);
router.put('/:id', festivalCtrl.modifyFestival);
router.delete('/:id', festivalCtrl.deleteFestival);

module.exports = router;
