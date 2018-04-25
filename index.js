const path = require('path');

const mongoose = require('mongoose');

global.generate = function(a,b){for(b=a='';a++<36;b+=a*51&52?(a^15?8^Math.random()*(a^20?16:4):4).toString(16):'-');return b} // Génère un UUID aléatoire
// Principe UUID: 1 chance sur 1 million de retrouver le même UUID aléatoirement

const express = require('express');

let app = express();
let bodyParser = require('body-parser');
let MongoStore = require('connect-mongo')(require('express-session'));

let http = require('http').Server(app);
let io = require('socket.io')(http);

let session = require('express-session')({
  saveUninitialized: false,
  resave: true,
  secret: generate(),
  store: new MongoStore({ mongooseConnection: mongoose.connection })
});

let sharedsession = require("express-socket.io-session");

app.use(session);

io.use(sharedsession(session, {
    autoSave:true
}));

/*
* Body Parser nous permet d'afficher nativement les objets qui nous sont envoyés
*/
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use('/assets', express.static(path.join(__dirname, 'server/assets')));

let Storage = require('samss').getStorage('FS', 'file.json');

async function load() {
  let Storage = await require('samss').getStorage('FS', 'file.json').load();
  await Storage.default().add('mongoose-address', 'mongodb://192.168.1.31/barcodes').end();

  await mongoose.connect(Storage.get('mongoose-address'));

  mongoose.model('User', require('./models/User')); // Modèle utilisateur
  mongoose.model('Product', require('./models/Product')); // Produit
  mongoose.model('ProductOutput', require('./models/ProductOutput')); // Sorties de produits

  /*
  * Si l'utilisateur à un identifiant d'utilisateur enregistré dans sa session, le serveur le redirige vers l'endpoint /dashboard du routeur /users (=/users/dashboard)
  * Sinon, il lui envoie la page de connexion
  */
  app.get('/', (req, res) => {
    if (req.session.userId) res.redirect('/dashboard');
    else res.sendFile(__dirname + '/server/login.html');
  }); // Redirige les gens sur la page de connexion

  app.use('/users', require('./controllers/routes/users'));
  app.use('/dashboard', require('./controllers/routes/dashboard'));

  // catch 404 and forward to error handler
  app.use(function (req, res, next) {
    var err = new Error('File Not Found');
    err.status = 404;
    next(err);
  });

  // error handler
  app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.send(err.message);
  });

  io.on('connection', function(socket) {
    require('./controllers/sockets/dashboard')(socket);
  });

  http.listen(process.argv[3] || 7800, process.argv[2] || '0.0.0.0');
}

load().then(() => console.log(`Started Barcodes server on: ${(process.argv[2] || '0.0.0.0') + ':' + (process.argv[3] || 7800)}. Reminder: Work in progress.`));
