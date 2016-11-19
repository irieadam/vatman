var express = require('express');
var bodyParser = require('body-parser');
var app = express();
var PORT = process.env.PORT || 3000
var soap = require('soap');
var requests = [];
var results = [];

// middleware
app.use(bodyParser.json());

// routes
app.get('/', function (req, res) {
    res.send('Velcome to ze Vatcave')
});

app.post('/process', function (req, res) {

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

//start
app.listen(PORT, function () {
    console.log('Express listening on port ' + PORT);
});