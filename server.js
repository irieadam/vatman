var express = require('express');
var app = express();
var PORT = process.env.PORT || 3000

app.get('/', function (req, res) {
    res.send('Velcome to ze Vatcave')
});

app.listen(PORT, function () {
    console.log('Express listening on port ' + PORT);
})