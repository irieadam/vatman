var bodyParser = require('body-parser');
var soap = require('soap');
var db = require('./db.js');
var bcrypt = require('bcrypt');
var _ = require('underscore');
var middleware = require('./middleware.js')(db);
var path = require('path');
var cookieParser = require('cookie-parser');
var excel = require('node-xlsx').default;
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var async = require('async');


var PORT = process.env.PORT || 3000
var requests = [];
var ioSocket;

// middleware
app.use(cookieParser());
app.use(bodyParser.json({ limit: '3mb' }));
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
    extended: true

}));

app.use('/', express.static(path.join(__dirname, 'public')));

//sockets 
io.on('connection', function (socket) {
    // console.log('client connected ' + socket.id);
    ioSocket = socket;
    // send the clients id to the client itself.
    // client.send(client.id);

    socket.on('disconnect', function () {
        console.log('client disconnected');
    });
});

// routes
app.get('/', function (req, res) {

    res.sendFile(__dirname + '/public/login.html');
});

app.post('/export', middleware.requireAuthentication, function (req, res) {
    var sessionId = getCookies(req).sessionId;
    var lastRequest = getCookies(req).lastRequest;
    var format = req.body.format; //1 = csv ,2 = excel 
    var fileName = '';
    var arrayOfDbResults = [];

    //get data
    /**    db.request.findAll({
           limit : 1,
           attributes: ['requesterVatNumber', 'requesterCountryCode'],
           where: { requestId: lastRequest }
       }).then(function (request) {
               requesterId = request.requesterCountryCode+request.requesterVatNumber+"_"+request.updatedAt.substring(0,10);
       }) */

    db.request.findAll({
        attributes: { exclude: ['id', 'sessionId', 'requestId', 'itemId', 'createdAt', 'status', 'requestDate', 'userId'] },
        where: { requestId: lastRequest }
    })
        .then(function (requests) {
            var jsonObject;
            var file;
            requests.forEach(function (request) {
                arrayOfDbResults.push(request);
            }
            );

            fileName = arrayOfDbResults[0].requesterCountryCode + arrayOfDbResults[0].requesterVatNumber + "_" + arrayOfDbResults[0].updatedAt.toISOString().slice(0, 10);;

            for (result in arrayOfDbResults) {
                delete result.requesterCountryCode;
                delete result.requesterVatNumber;
            }
            // send csv or excel
            switch (format) {
                case "1": //xlsx
                    var headers = ["Country Code",
                        "VAT Number",
                        "Name",
                        "Address",
                        "Confirmation",
                        "RequestDate",
                        "Valid",
                        "Retries"];
                    var data = [headers];

                    // for each db result row, get values into array and add array to data array
                    arrayOfDbResults.forEach(function (item) {
                        var dataValues = item.dataValues;
                        var resultValues = [];
                        resultValues.push(dataValues.countryCode);
                        resultValues.push(dataValues.vatNumber);
                        resultValues.push(dataValues.traderName);
                        resultValues.push(dataValues.traderAddress);
                        resultValues.push(dataValues.confirmationNumber);
                        resultValues.push(dataValues.updatedAt);
                        resultValues.push(dataValues.valid);
                        resultValues.push(dataValues.retries);
                        data.push(resultValues);
                    });

                    var file = excel.build([{ name: "results", data: data }]);

                    res.status(200).set({
                        'Content-Type': 'application/vnd.ms-excel',
                        'Content-Transfer-Encoding': 'binary',
                        'Content-Disposition': "attachment; filename=" + "VATValidation_" + fileName + '.xlsx'
                    }).send(file);
                    break;

                case "2": //csv
                    jsonObject = JSON.stringify(arrayOfDbResults);
                    file = convertToCSV(jsonObject);

                    res.status(200).set({
                        'Content-Type': 'text/csv',//'text/plain',//application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
                        'Content-Disposition': "attachment; filename=" + fileName + '.csv'
                    }).send(file);
                    break;
                default:

            }

        })

});

app.post('/process', middleware.requireAuthentication, function (req, res) {
    var requestId = req.body.requestId;
    var requesterNumber = req.body.requesterVatNumber;
    var requesterCountry = req.body.requesterCountryCode;
    var vatNumbers = req.body.vatNumbers;
    var sessionId = getCookies(req).sessionId;
    var ioId = getCookies(req).io;

    res.cookie('lastRequest', requestId);
    res.status(200).send();

    getSoapClient().then(function(client){

            async.eachLimit(vatNumbers, 28, function (vatRequest, cb) {

                db.request.findOne({
                    where: {
                    itemId: vatRequest.itemId
                    }
                     }).then(function (request) {
            
                        if (request === null) {
                          db.request.create({
                            id: sessionId + requestId + vatRequest.itemId,
                            sessionId: sessionId,
                            requestId: requestId,
                            itemId: vatRequest.itemId,
                            vatNumber: vatRequest.vatNumber,
                            countryCode: vatRequest.countryCode,
                            requesterVatNumber: requesterNumber,
                            requesterCountryCode: requesterCountry,
                            status: '0',
                            retries: 0
                         }).then(function (request) {
                            callVatService(client,request, ioId).then(
                                function () {
                                    cb();
                                },function (err) {
                                    cb(err);
                                } );
                        }).catch(function (e) {
                            console.log(e);
                        });
                    } else {
                        if (request.status === '3') {
                            request.update({
                                requestId: requestId,
                            }).then(function () {
                                cb();
                            });
                        } else {
                            console.log('status '+ request.status +' updating and calling .')
                            request.update({
                                
                                requestId: requestId,
                                requesterVatNumber: requesterNumber,
                                requesterCountryCode: requesterCountry,
                                vatNumber: vatRequest.vatNumber,
                                countryCode: vatRequest.countryCode,
                                retries: request.retries + 1
                                }).then(function (request) {
                                        callVatService(client,request, ioId).then(
                                            function (request) {  
                                                cb();          
                                            },function (err) {
                                                cb(err);
                                            });

                        }).catch(function (e) {
                            console.log(e);
                        });
                    }
                }
            
            });
        }, function (err) {
            if (err) {
                console.log('A file failed to process: ' +  err);
            } else {
                console.log('All files have been processed successfully');
            }
        }); //async
    },function(err){
        console.log("could not get soap client!!");
    });
});


app.post('/users', middleware.requireAuthentication, function (req, res) {
    var body = _.pick(req.body, 'email', 'password');

    db.user.create(body).then(function (user) {
        res.json(user.toPublicJSON());
    }).catch(function (e) {
        res.status(400).json(e);
    })

});

app.post('/users/login', function (req, res) {
    var body = _.pick(req.body, 'email', 'password');
    var userInstance;

    db.user.authenticate(body).then(function (user) {
        var token = user.generateToken('authentication');
        userInstance = user;

        return db.token.create({
            token: token
        });
    }).then(function (tokenInstance) {
        res.cookie('Auth', tokenInstance.token);
        res.cookie('sessionId', guid());
        res.status(200).sendFile(__dirname + '/public/validation.html');

    }).catch(function (e) {
        res.status(401).send();
    });

});

app.get('/logout', middleware.requireAuthentication, function (req, res) {

    var sessionId = getCookies(req).sessionId;
    db.request.destroy({ where: { sessionId: sessionId } })

    res.cookie("Auth", "", { expires: new Date() });
    res.cookie("io", "", { expires: new Date() });
    res.cookie("lastRequest", "", { expires: new Date() });
    res.cookie("sessionId", "", { expires: new Date() })

    req.token.destroy().then(function () {
        res.status(200).sendFile(__dirname + '/public/login.html');
        //res.redirect('/users/login');
        //res.status(204).se/users/loginnd();    
    }).catch(function () {
        res.status(500).send();
    });

})

db.sequelize.sync({
    force: true
 }).then(function () {
    http.listen(PORT, function () {

        //create admin
        var body = {
            email: 'admin@vatvision.com',
            password: 'happyday1'
        };

        db.user.create(body).then(function (user) {
            console.log('Express listening on port + ' + PORT);
        }).catch(function (e) {
            console.log('Admin user creation failed ' + e);
        })

    });

});

function convertToCSV(objArray) {
    var array = typeof objArray != 'object' ? JSON.parse(objArray) : objArray;
    var str = '';

    for (var i = 0; i < array.length; i++) {
        var line = '';
        for (var index in array[i]) {
            if (line != '') line += ';'

            line += array[i][index];
        }

        str += line + '\r\n';
    }

    return str;
};

function guid() {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1);
    }
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
        s4() + '-' + s4() + s4() + s4();
}

function getCookies (request) {
    var cookies = {};
    request.headers && request.headers.cookie.split(';').forEach(function (cookie) {
        var parts = cookie.match(/(.*?)=(.*)$/)
        cookies[parts[1].trim()] = (parts[2] || '').trim();
    });
    return cookies;
};

function callVatService(client, request, ioId) {
    return new Promise(function(resolve, reject){
        var checkVatApprox = {
            countryCode: request.countryCode,
            vatNumber: request.vatNumber.replace(/\r/g, ""),
            requesterCountryCode: request.requesterCountryCode,
            requesterVatNumber: request.requesterVatNumber.replace(/\r/g, "")
        };

        request.status = '1';

      //  console.log(">>>>>>>>>>>> REQUEST " + JSON.stringify(checkVatApprox)+ "<<<<<<<<<<<<<<<<<<<<<<<<<<<<<");

        client.checkVatApprox(checkVatApprox, function (err, result) {
            // console.log(JSON.stringify(result));
            if (typeof result != 'undefined' && result.valid) {

                // address 
                var address = "";
                if (typeof result.traderAddress != 'undefined') {
                    address = result.traderAddress.replace(/\n/g, " ")
                }

                request.update({
                    status: '3',
                    traderName: result.traderName,
                    traderAddress: address,
                    confirmationNumber: result.requestIdentifier,
                    valid: "Valid",
                    requestDate: result.requestDate.toString()
                });

            } else if (!err && !result.valid) {
                request.update({
                    status: '5',
                    confirmationNumber: result.requestIdentifier,
                    valid: "Not Valid",
                });
            } else {
                request.update({
                    status: '4',
                    valid: "Failed",
                });
                console.log(JSON.stringify(result));
            };
            io.to(ioId).emit('message', request);
            resolve(request);
        });
    });
}

function getSoapClient (){

    return new Promise(function(resolve, reject) {
         
         console.log("getting soap client");
         var vatServiceWSDLUrl = 'http://ec.europa.eu/taxation_customs/vies/checkVatService.wsdl';
         soap.createClient(vatServiceWSDLUrl, function (err, client) {
               console.log('create client call back in'); 
             if (typeof client === 'undefined') {
                console.log(err);
                reject(err);
              
             } else {
                 console.log("got client");
                 resolve(client);
             }
        });

    } );

}; 
