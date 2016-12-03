var bodyParser = require('body-parser');
var soap = require('soap');
var db = require('./db.js');
var bcrypt = require('bcrypt');
var _ = require('underscore');
var middleware = require('./middleware.js')(db);
var path = require('path');
var cookieParser = require('cookie-parser');

var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var PORT = process.env.PORT || 3000
var requests = [];
var arrayOfDbResults = [];
var ioSocket;

// middleware
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
}));
app.use('/',express.static(path.join(__dirname, 'public')));

//sockets 
io.on('connection', function (socket) {
   // console.log('client connected ' + socket.id);
    ioSocket = socket;
  // send the clients id to the client itself.
 // client.send(client.id);

  socket.on('disconnect', function () {
    console.log('client disconnected');
  });
} );

// routes
app.get('/', function (req, res) {
    
       res.sendFile(__dirname + '/public/login.html');
});

app.get('/export', function (req, res) {
    //var sessionId = req.get('sessionId');
    var sessionId = get_cookies(req).sessionId;
    
    db.request.findAll({
        attributes: { exclude: ['id','sessionId','requestId','itemId','createdAt','status','requestDate','userId']},
        where: {sessionId: sessionId }
    })
     .then(function(requests) {
         var jsonObject;
         var file;
         requests.forEach(function (request) {
             arrayOfDbResults.push(request);
            }
         );
         jsonObject = JSON.stringify(arrayOfDbResults);
         file = ConvertToCSV(jsonObject);
         
         res.status(200).set({
            'Content-Type': 'text/csv',//'text/plain',
            'Content-Disposition': contentDisposition(sessionId+'.csv')
        }).send(file);

     })

});

app.post('/process', middleware.requireAuthentication, function(req, res) {  
    var requestid = req.body.requestId;
    var requesterNumber = req.body.requesterVatNumber;
    var requesterCountry = req.body.requesterCountryCode;
    var vatNumbers = req.body.vatNumbers;
    //var sessionId = req.get('sessionId');
    var sessionId = get_cookies(req).sessionId;
    var ioId =  get_cookies(req).io;
    // validations
    res.status(200).send();
    
    // process list
    vatNumbers.forEach(function (vatRequest) {

        //check for existing item. 
        db.request.findOne( {where: {
            itemId: vatRequest.itemId
        }}).then(function (request) {
            
            if (request===null) {
                db.request.create({
                            id : sessionId+requestid+vatRequest.itemId,
                            sessionId : sessionId,
                            requestId : requestid,
                            itemId : vatRequest.itemId,
                            vatNumber : vatRequest.vatNumber,
                            countryCode : vatRequest.countryCode,
                            requesterVatNumber : requesterNumber,
                            requesterCountryCode :  requesterCountry,
                            status : '0',
                            retries : 0
                        }).then(function (request) {

                            callVatService(request,ioId);
                            
                        } ).catch(function (e){
                            console.log(e);
                        });        
            } else {
                if (request.status==='3' || request.status==='5' ) {
                    request.update( {retries : request.retries+1});
                } else {
                    request.update( {
                        requesterVatNumber : requesterNumber,
                        requesterCountryCode :  requesterCountry
                    } );
                    callVatService(request,ioId);    
                    request.update( {retries : request.retries+1});
                }
            }
        });
    });      
});

app.post('/users', function(req, res){
    var body = _.pick(req.body,'email', 'password') ;
    
    db.user.create(body).then(function (user) {
        res.json(user.toPublicJSON());
    } ).catch(function (e){
        res.status(400).json(e);
    })

});

app.post('/users/login', function(req, res){
    var body = _.pick(req.body,'email', 'password') ;
    var userInstance;
    
    db.user.authenticate(body).then(function (user){
        var token = user.generateToken('authentication');
        userInstance = user;
        
        return db.token.create({
            token: token
        });
    }).then(function (tokenInstance) {
 
       // res.sendFile(__dirname + '/public/validation.html');
       // res.header('Auth',tokenInstance.token).json(userInstance.toPublicJSON());   
      res.cookie('Auth',tokenInstance.token);
      res.cookie('sessionId', guid());
      res.status(200).sendFile(__dirname + '/public/validation.html');       

    } ).catch(function(e){
        res.status(401).send();     
    });
    
});

app.get('/logout', middleware.requireAuthentication, function (req,res) {
    req.token.destroy().then(function() {
      
     
      res.status(200).sendFile(__dirname + '/public/login.html');
      //res.redirect('/users/login');
    //res.status(204).se/users/loginnd();    
}).catch(function () {
        res.status(500).send();
    });
    
})

db.sequelize.sync({
    force : true }).then(function () {
            http.listen(PORT, function () {
                
                //create admin
              var body = { email : 'admin@vatvision.com',
                             password : 'happyday1'} ;

                db.user.create(body).then(function (user) {
                    console.log('Express listening on port + ' + PORT);
                } ).catch(function (e){
                    console.log('Admin user creation failed ' + e);
                })  
                
            });    
             
});

function callVatService (request,ioId) {
        var vatServiceWSDLUrl = 'http://ec.europa.eu/taxation_customs/vies/checkVatService.wsdl';  
        var checkVatApprox = {
            countryCode : request.countryCode,
            vatNumber : request.vatNumber.replace(/\r/g, ""),
            requesterCountryCode : request.requesterCountryCode,
            requesterVatNumber : request.requesterVatNumber.replace(/\r/g, "")
        };

        request.status = '1';
        
      //  console.log(">>>>>>>>>>>> REQUEST " + JSON.stringify(checkVatApprox)+ "<<<<<<<<<<<<<<<<<<<<<<<<<<<<<");

        soap.createClient(vatServiceWSDLUrl, function(err, client) {
    
            client.checkVatApprox(checkVatApprox, function(err, result) {
            

                if (result.valid) { 

                    // address 
                    var address ="";
                    if (!result.traderAddress==='undefined') {
                        address = result.traderAddress.replace(/\n/g, " ")
                    }

                    request.update( {
                                    status: '3',
                                    traderName : result.traderName,
                                    traderAddress: address,
                                    confirmationNumber : result.requestIdentifier,
                                    valid : "Valid",
                                    requestDate : result.requestDate.toString()
                                    });
                    } else if (!err && !result.valid) {
                        request.update( {
                                    status: '5',
                                    confirmationNumber : result.requestIdentifier,
                                    valid : "Not Valid",
                                    });
                    } else  {
                        request.update(  {
                                    status: '4',
                                    valid : "Failed",
                                    });
                         console.log(JSON.stringify(result));
                    };
                //ioSocket.emit('message',request);
                io.to(ioId).emit('message',request);
        });          
    });
}

// JSON to CSV Converter
function ConvertToCSV(objArray) {
    var array = typeof objArray != 'object' ? JSON.parse(objArray) : objArray;
    var str = '';

    for (var i = 0; i < array.length; i++) {
        var line = '';
        for (var index in array[i]) {
            if (line != '') line += ','

            line += array[i][index];
        }

        str += line + '\r\n';
    }

    return str;
};

// extracted from Express, used by `res.download()`
function contentDisposition(filename) {
  var ret = 'attachment';
  if (filename) {
   // filename = basename(filename);
    // if filename contains non-ascii characters, add a utf-8 version ala RFC 5987
    ret = /[^\040-\176]/.test(filename)
      ? 'attachment; filename="' + encodeURI(filename) + '"; filename*=UTF-8\'\'' + encodeURI(filename)
      : 'attachment; filename="' + filename + '"';
  }
  console.log('>>>>>>>>>>>>>>>>>>' + ret);
  return ret;
}

function guid() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  }
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
    s4() + '-' + s4() + s4() + s4();
}

var get_cookies = function(request) {
  var cookies = {};
  request.headers && request.headers.cookie.split(';').forEach(function(cookie) {
    var parts = cookie.match(/(.*?)=(.*)$/)
    cookies[ parts[1].trim() ] = (parts[2] || '').trim();
  });
  return cookies;
};