module.exports = function (sequelize, DataTypes) {
    var request =  sequelize.define('request', {
    id: {
        type: DataTypes.STRING,
        allowNull: false,
        primaryKey: true,
        validate: {
            len: [1, 250]
        }
    },
   requestId: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            len: [1, 125]
        }
    },
    itemId: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            len: [1, 125]
        }
    },
    vatNumber: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            len: [1, 20]
        }
    },
    countryCode: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            len: [2]
        }
    },
    requesterVatNumber: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            len: [1, 20]
        }
    }, 

    requesterCountryCode: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            len: [2]
        }
    },
    status: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            len: [1,2]
        }
    },
    confirmationNumber: {
        type: DataTypes.STRING,
        allowNull: true
    }
}, {

});
return request;
} ;