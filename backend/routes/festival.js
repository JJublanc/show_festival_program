const express = require('express');
const router = express.Router();

const auth = require('../middleware/auth');

const festivalCtrl = require('../controllers/festival');
router.get('/', festivalCtrl.getAllFestivals);
router.post('/', auth, festivalCtrl.createOneFestival);
router.get('/:id', festivalCtrl.getOneFestival);
router.put('/:id', auth, festivalCtrl.modifyFestival);
router.delete('/:id', auth, festivalCtrl.deleteFestival);

module.exports = router;
