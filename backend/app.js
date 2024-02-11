const express = require('express');
const app = express();
const mongoose = require('mongoose');
const showRoutes = require('./routes/show');
const festivalRoutes = require('./routes/festival');
const userRoutes = require('./routes/user');
require('dotenv').config();
app.use(express.json());
const url = require('url');
const fixieUrl = url.parse(process.env.FIXIE_SOCKS_HOST);
const fixieAuth = fixieUrl.auth.split(':');

console.log(process.env.FIXIE_URL);
console.log(fixieUrl.hostname);
console.log(fixieUrl.port);
console.log(fixieAuth);
mongoose.connect(process.env.MONGODB_URI,
    {
        proxyHost: fixieUrl.hostname,
        proxyPort: fixieUrl.port,
        proxyUsername: 'fixie',
        proxyPassword: fixieAuth[0],
        useNewUrlParser: true,
        useUnifiedTopology: true
    })
    .then(() => console.log('Connexion à MongoDB réussie !'))
    .catch((reason)  => console.log('Connexion à MongoDB échouée !', reason));


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
