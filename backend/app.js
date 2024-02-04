const express = require('express');
const app = express();
const mongoose = require('mongoose');
const showRoutes = require('./routes/show');
const festivalRoutes = require('./routes/festival');
const userRoutes = require('./routes/user');
require('dotenv').config();
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI,
  { useNewUrlParser: true,
    useUnifiedTopology: true })
  .then(() => console.log('Connexion à MongoDB réussie !'))
  .catch(() => console.log('Connexion à MongoDB échouée !'));


app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content, Accept, Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  next();
});


//app.use('/api/auth', userRoutes);
app.use('/api/shows', showRoutes);
app.use('/api/festivals', festivalRoutes);
app.use('/api/login', userRoutes);

module.exports = app;
