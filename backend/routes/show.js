const express = require('express');
const router = express.Router();

const auth = require('../middleware/auth');

const showCtrl = require('../controllers/show');

router.get('/',  showCtrl.getAllShows);
router.post('/', auth, showCtrl.createOneShow);
router.get('/:id', showCtrl.getOneShow);
router.put('/:id', auth, showCtrl.modifyShow);
router.delete('/:id', auth, showCtrl.deleteShow);
router.delete('/festival/:name', auth, showCtrl.deleteAllShowsForFestival);

module.exports = router;