var express = require('express');
var bodyParser = require('body-parser');
var app = express();
var PORT = process.env.PORT || 3000
var soap = require('soap');
var requests = [];
    
// middleware
app.use(bodyParser.json());

// routes
app.get('/', function (req, res) {
    res.send('Velcome to ze Vatcave')
});

app.post('/process', function (req, res) {
    
    var requests = req.body;

    console.log(requests);

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
  res.status(418).send();     
});

app.listen(PORT, function () {
    console.log('Express listening on port ' + PORT);
})