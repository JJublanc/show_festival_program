const express = require('express');
const router = express.Router();

// const auth = require('../middleware/auth');

const showCtrl = require('../controllers/show');

router.get('/',  showCtrl.getAllShows);
router.post('/', showCtrl.createOneShow);
router.get('/:id', showCtrl.getOneShow);
router.put('/:id', showCtrl.modifyShow);
router.delete('/:id', showCtrl.deleteShow);
router.delete('/festival/:name', showCtrl.deleteAllShowsForFestival);

module.exports = router;