var Sequelize = require('sequelize');
var env = process.env.NODE_ENV || 'development';
var sequelize; 

if (env === 'production') {
    sequelize = new Sequelize(process.env.DATABASE_URL, {
        dialect : 'postgres'
    });
} else {

    sequelize = new Sequelize(undefined, undefined, undefined, {
        'dialect': 'sqlite',
        'storage': __dirname + '/data/vatman.sqlite'
    });
}
var db = {}; 

db.requests = sequelize.import(__dirname + '/models/requests.js');
db.user = sequelize.import(__dirname + '/models/user.js');
db.token = sequelize.import(__dirname + '/models/token.js');
db.sequelize = sequelize;
db.Sequelize = Sequelize;

db.requests.belongsTo(db.user);
db.user.hasMany(db.requests);
module.exports = db;