var express = require('express');
var app = express();
var PORT = process.env.PORT || 3000
var soap = require('soap');
var requests = [{
        requestId : '12456789',
        itemId : '111222333',
        countryCode : 'NL',
        vatNumber : '819381548B01',
        requesterCountryCode : 'NL',
        requesterVatNumber : '855356650B01'
    },
    {
        requestId : '12456789',
        itemId : '111222444',
        countryCode : 'NL',
        vatNumber : '819381548B99',
        requesterCountryCode : 'NL',
        requesterVatNumber : '855356650B01'

    }];
    

app.get('/', function (req, res) {
    res.send('Velcome to ze Vatcave')
});

app.get('/process', function (req, res) {
    res.send('processing');
    var vatServiceWSDLUrl = 'http://ec.europa.eu/taxation_customs/vies/checkVatService.wsdl';
    var args = {
            countryCode : 'NL',
            vatNumber : '819381548B01',
            requesterCountryCode : 'NL',
            requesterVatNumber : '855356650B01'};
      soap.createClient(vatServiceWSDLUrl, function(err, client) {
      client.checkVatApprox(args, function(err, result) {
          console.log(result);
          console.log(result.requestIdentifier);
      });          
    });       
});

app.listen(PORT, function () {
    console.log('Express listening on port ' + PORT);
})