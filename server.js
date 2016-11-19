var express = require('express');
var bodyParser = require('body-parser');
var soap = require('soap');
var db = require('./db.js');
var bcrypt = require('bcrypt');
var _ = require('underscore');
var middleware = require('./middleware.js')(db);


var app = express();
var PORT = process.env.PORT || 3000
var requests = [];
var results = [];

// middleware
app.use(bodyParser.json());

// routes
app.get('/', function (req, res) {
    res.send('Velcome to ze Vatcave')
});

app.post('/process', middleware.requireAuthentication, function(req, res) {
    var vatServiceWSDLUrl = 'http://ec.europa.eu/taxation_customs/vies/checkVatService.wsdl';    
    var requestid = req.body.requestId;
    var vatNumbers = req.body.vatNumbers;
    var checkVatApprox = {};
    var counter = 0;

    // validations
    res.status(200).send();
    
    // process list
    vatNumbers.forEach(function (vatRequest) {

        var checkVatApprox = {
            countryCode : vatRequest.countryCode,
            vatNumber : vatRequest.vatNumber,
            requesterCountryCode : vatRequest.requesterCountryCode,
            requesterVatNumber : vatRequest.requesterVatNumber
            };
        
        soap.createClient(vatServiceWSDLUrl, function(err, client) {
            client.checkVatApprox(checkVatApprox, function(err, result) {
                if (result.valid) { 
                    vatRequest.status = '2';
                    } else if (!result.valid) {
                        vatRequest.status = '5'
                    } else {
                        varRequest.status = '4'
                    };
                vatRequest.confirmationNumber = result.requestIdentifier;
                results.push(vatRequest);
                counter=counter+1;

                if (counter === vatNumbers.length) {
                    console.log(results);
                   // res.status(200).send();
                }  
            });          
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
          res.header('Auth',tokenInstance.token).json(userInstance.toPublicJSON());   
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
    force : false}).then(function () {
            app.listen(PORT, function () {
                console.log('Express listening on port + ' + PORT);
            });   
});