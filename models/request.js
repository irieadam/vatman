module.exports = function (sequelize, DataTypes) {
    var request =  sequelize.define('request', {
    id: {
        type: DataTypes.STRING,
        allowNull: false,
        primaryKey: true,
        validate: {
            len: [1, 130]
        }
    },
    sessionId: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            len: [1, 36]
        }
    },
   requestId: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            len: [1, 36]
        }
    },
    itemId: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            len: [1, 36]
        }
    },
    vatNumber: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
            len: [0, 30]
        }
    },
    countryCode: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
            len: [0,5]
        }
    },
    traderName: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
            len: [0,100]
        }
    },
    traderAddress: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
            len: [0,250]
        }
    },
    requesterVatNumber: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
            len: [1, 40]
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
    requestDate: {
        type: DataTypes.DATE,
        allowNull: true
    },
    confirmationNumber: {
        type: DataTypes.STRING,
        allowNull: true
    },
    valid: {
        type: DataTypes.STRING,
        allowNull: true
    },
    retries: {
        type: DataTypes.INTEGER,
        allowNull: true
    }
}, {

});
return request;
} ;