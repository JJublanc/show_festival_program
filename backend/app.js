const express = require('express');
const app = express();
const mongoose = require('mongoose');
const showRoutes = require('./routes/show');
const festivalRoutes = require('./routes/festival');
const userRoutes = require('./routes/user');
require('dotenv').config();
app.use(express.json());
const url = require('url');
const useProxy = process.env.USE_PROXY !== 'False';
let fixieUrl, fixieAuth;

if (useProxy && process.env.FIXIE_SOCKS_HOST) {
    fixieUrl = url.parse(process.env.FIXIE_SOCKS_HOST);
    fixieAuth = fixieUrl.auth ? fixieUrl.auth.split(':') : [];
}
const options = {
    useNewUrlParser: true,
    useUnifiedTopology: true
};

if (useProxy && fixieUrl) {
    console.log('Utilisation d\'un proxy pour se connecter à MongoDB.');
    options.proxyHost = fixieUrl.hostname;
    options.proxyPort = fixieUrl.port;
    options.proxyUsername = 'fixie';
    options.proxyPassword = fixieAuth && fixieAuth[0] ? fixieAuth[0] : '';

    console.log('Utilisation d\'un proxy pour se connecter à MongoDB.');
}

// Tentative de connexion
mongoose.connect(process.env.MONGODB_URI, options)
    .then(() => console.log('Connexion à MongoDB réussie !'))
    .catch((reason) => console.log('Connexion à MongoDB échouée !', reason));


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
