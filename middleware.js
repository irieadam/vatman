var cryptojs = require('crypto-js');

module.exports = function (db) {

    return {
        requireAuthentication: function (req, res, next) {
           // var token = req.get('Auth') || '';
               var token = get_cookies(req).Auth || '';

            db.token.findOne({
                where: {
                    tokenHash: cryptojs.MD5(token).toString()
                }
            }).then(function (tokenInstance) {
                    if (!tokenInstance) {
                        throw new Error();
                    }
                    req.token = tokenInstance;
                    return db.user.findByToken(token);
                }).then(function (user) {
                    req.user = user;
                    next();
                }).catch(function () {
                    res.status(401).send();
                });


            /*             db.user.findByToken(token).then(
                             function (user) {
                                 req.user = user;
                                 next();
                             },
                             function (e){
                                 res.status(401).send();
                     }); */
        }
    };
}
var get_cookies = function(request) {
  var cookies = {};
  request.headers && request.headers.cookie.split(';').forEach(function(cookie) {
    var parts = cookie.match(/(.*?)=(.*)$/)
    cookies[ parts[1].trim() ] = (parts[2] || '').trim();
  });
  return cookies;
};