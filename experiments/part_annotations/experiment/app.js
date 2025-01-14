// ----- SWITCH THESE FLAGS depending on which 'game' we are running -----
// options: 'animals', 'small_objects', 'big_objects', or 'vehicles' (or 'generateIntro')
const whichGame = 'animals'

// IMPORTANT NOTE! If you change the above, you need to restart app.js in terminal
// ALSO! Make sure that whichGame matches in setup.js so that the catchTrial matches

if (whichGame == 'animals') {
  var db_name = 'devphotodraw_animals'
  var col_name = 'devphotodraw_animals'
} else if (whichGame == 'small_objects') {
  var db_name = 'devphotodraw_small_objects'
  var col_name = 'devphotodraw_small_objects'
} else if (whichGame == 'big_objects') {
  var db_name = 'devphotodraw_big_objects'
  var col_name = 'devphotodraw_big_objects'
} else if (whichGame == 'vehicles') {
  var db_name = 'devphotodraw_vehicles'
  var col_name = 'devphotodraw_vehicles'
};
// -----

global.__base = __dirname + '/';

var
    use_https     = true,
    argv          = require('minimist')(process.argv.slice(2)),
    https         = require('https'),
    fs            = require('fs'),
    app           = require('express')(),
    _             = require('lodash'),
    parser        = require('xmldom').DOMParser,
    XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest,
    sendPostRequest = require('request').post,
    cors          = require('cors');

////////// EXPERIMENT GLOBAL PARAMS //////////

var gameport;
var researchers = ['A4SSYO0HDVD4E', 'A9AHPCS83TFFE'];
var blockResearcher = false;

if(argv.gameport) {
  gameport = argv.gameport;
  console.log('using port ' + gameport);
} else {
  gameport = 8875;
  console.log('no gameport specified: using 8886\nUse the --gameport flag to change');
}

try {
  var privateKey  = fs.readFileSync('/etc/letsencrypt/live/cogtoolslab.org/privkey.pem'),
      certificate = fs.readFileSync('/etc/letsencrypt/live/cogtoolslab.org/cert.pem'),
      intermed    = fs.readFileSync('/etc/letsencrypt/live/cogtoolslab.org/chain.pem'),
      options     = {key: privateKey, cert: certificate, ca: intermed},
      server      = require('https').createServer(options,app).listen(gameport),
      io          = require('socket.io')(server);
} catch (err) {
  console.log("cannot find SSL certificates; falling back to http");
  var server      = app.listen(gameport),
      io          = require('socket.io')(server);
}

// serve stuff that the client requests
app.get('/*', (req, res) => {
  serveFile(req, res);
});

io.on('connection', function (socket) {

  // Recover query string information and set condition
  var hs = socket.request;
  var query = require('url').parse(hs.headers.referer, true).query;
  var id = query.workerId;

  var isResearcher = _.includes(researchers, id);

  if (!id || isResearcher && !blockResearcher){
    initializeWithTrials(socket)
  } else if (!valid_id(id)) {
    console.log('invalid id, blocked');
  } else {
    checkPreviousParticipant(id, (exists) => {
      return exists ? handleDuplicate(socket) : initializeWithTrials(socket);
    });
  }

  // write data to db upon getting current data
  socket.on('currentData', function(data) {
    console.log('currentData received: ' + JSON.stringify(data));
    // Increment games list in mongo here
    writeDataToMongo(data);
  });

});

var serveFile = function(req, res) {
  var fileName = req.params[0];
  console.log('\t :: Express :: file requested: ' + fileName);
  return res.sendFile(fileName, {root: __dirname});
};

var handleDuplicate = function (socket) {
  console.log("duplicate id: blocking request");
  socket.emit('redirect', '/duplicate.html');
};

var valid_id = function (id) {
  return (id.length <= 15 && id.length >= 12) || id.length == 41;
};

var handleInvalidID = function (socket) {
  console.log("invalid id: blocking request");
  socket.emit('redirect', '/invalid.html');
};

function checkPreviousParticipant(workerId, callback) {
  var p = { 'workerId': workerId };
  var postData = {
    dbname: db_name, 
    query: p,
    projection: { '_id': 1 }
  };
  sendPostRequest(
    'http://localhost:8010/db/exists',
    { json: postData },
    (error, res, body) => {
      try {
        if (!error && res.statusCode === 200) {
          console.log("success! Received data " + JSON.stringify(body));
          callback(body);
        } else {
          throw `${error}`;
        }
      }
      catch (err) {
        console.log(err);
        console.log('no database; allowing participant to continue');
        return callback(false);
      }
    }
  );
};


function initializeWithTrials(socket) {
  var gameid = UUID();
  var colname = col_name; 
  sendPostRequest('http://localhost:8010/db/getbatchstims', {
    json: {
      dbname: 'stimuli',
      colname: colname,
      //numTrials: 1,
      gameid: gameid
    }
  }, (error, res, body) => {
    if (!error && res.statusCode === 200) {
      // send trial list (and id) to client
      var packet = {
        gameid: gameid,
        meta: body.meta,
        version: body.experimentVersion
      };
      socket.emit('onConnected', packet);
    } else {
      console.log(`error getting stims: ${error} ${body}`);
    }
  });
}

var UUID = function() {
  var baseName = (Math.floor(Math.random() * 10) + '' +
        Math.floor(Math.random() * 10) + '' +
        Math.floor(Math.random() * 10) + '' +
        Math.floor(Math.random() * 10));
  var template = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx';
  var id = baseName + '-' + template.replace(/[xy]/g, function(c) {
    var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
    return v.toString(16);
  });
  return id;
};


var writeDataToMongo = function(data) {
  sendPostRequest(
    'http://localhost:8010/db/insert',
    { json: data },
    (error, res, body) => {
      if (!error && res.statusCode === 200) {
        console.log(`sent data to store`);
      } else {
	      console.log(`error sending data to store: ${error} ${body}`);
      }
    }
  );
};
