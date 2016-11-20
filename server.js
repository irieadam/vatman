var express = require('express');
var bodyParser = require('body-parser');
var soap = require('soap');
var db = require('./db.js');
var bcrypt = require('bcrypt');
var _ = require('underscore');
var middleware = require('./middleware.js')(db);
var path = require('path');

var app = express();
var PORT = process.env.PORT || 3000
var requests = [];
var results = [];

// middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
}));
app.use('/',express.static(path.join(__dirname, 'public')));


// routes
app.get('/', function (req, res) {
   res.sendFile(__dirname + '/public/login.html');
});

app.post('/process', middleware.requireAuthentication, function(req, res) {
    var vatServiceWSDLUrl = 'http://ec.europa.eu/taxation_customs/vies/checkVatService.wsdl';    
    var requestid = req.body.requestId;
    var requesterNumber = req.body.requesterVatNumber;
    var requesterCountry = req.body.requesterCountryCode;
    var vatNumbers = req.body.vatNumbers;
    var checkVatApprox = {};
    var counter = 0;

    // validations
    res.status(200).send();

    
    // process list
    vatNumbers.forEach(function (vatRequest) {

        db.request.create({
            id : requestid+vatRequest.itemId,
            requestId : requestid,
            itemId : vatRequest.itemId,
            vatNumber : vatRequest.vatNumber,
            countryCode : vatRequest.countryCode,
            requesterVatNumber : requesterNumber,
            requesterCountryCode :  requesterCountry,
            status : '1'
        }).then(function (request) {

            var checkVatApprox = {
                countryCode : request.countryCode,
                vatNumber : request.vatNumber,
                requesterCountryCode : request.requesterCountryCode,
                requesterVatNumber : request.requesterVatNumber
            };
        
            soap.createClient(vatServiceWSDLUrl, function(err, client) {
                client.checkVatApprox(checkVatApprox, function(err, result) {
                    if (result.valid) { 
                        request.update( {
                                        status: '2',
                                        traderName : result.traderName,
                                        traderAddress: result.traderAddress,
                                        confirmationNumber : result.requestIdentifier
                                        });
                        } else if (!result.valid) {
                            request.update( {
                                        status: '5',
                                        confirmationNumber : result.requestIdentifier
                                        });
                        } else {
                            request.update(  {
                                        status: '4'
                                        });
                        };
            });          
        });
            
        } ).catch(function (e){
            console.log(e);
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
       console.log(req);
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
      res.header('Auth',tokenInstance.token).status(200).sendFile(__dirname + '/public/validation.html');       

    } ).catch(function(e){
        res.status(401).send();     
    });
    
});

app.delete('/users/login', middleware.requireAuthentication, function (req,res) {
    req.token.destroy().then(function() {
        res.status(204).send();
    }).catch(function () {
        res.status(500).send();
    });
    
})

db.sequelize.sync({
    force : true }).then(function () {
            app.listen(PORT, function () {
                
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