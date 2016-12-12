// dao.js - Functions for manipulating and accessing data in the database.
// All functions in the module return Promises from the knexJS library. 
// To use, code should be along the lines of:
//    dao = require('./dao.js');
//    dao.getCitadels().then(function(rows) {
//      console.log(rows);    
//    }).catch(function(error) {
//      console.error(error);
//    });
//
// Access functions report arrays of objects, where each object represents
// a selected row, in the function passed to then(). Modify functions report
// the number of modified rows.

const configLoader = require('../src/config-loader');
const CONFIG = configLoader.load();

var knex = require('knex')({
    client: 'sqlite3',
    debug: false,
    useNullAsDefault: true,
    connection: {
        filename: CONFIG.dbFileName
    }
});

exports.getCitadels = function() {
    return knex.select().from('citadel');
};

exports.getCitadelByName = function(name) {
    return knex.select().from('citadel').where('name', name);
};

exports.getMembers = function() {
    return knex.select().from('member');
};

exports.getMemberByName = function(name) {
    return knex.select().from('member').where('name', name);
};

exports.getMemberByID = function(id) {
    return knex.select().from('member').where('characterID', id);
};

exports.setMemberCitadel = function(id, citadel) {
    return knex.insert([{homeCitadel: citadel}])
        .into('member').where('characterID', id);
};

exports.setMemberMain = function(id, mainCharacterID) {
    return knex.insert([{mainID: mainCharacterID}])
        .into('member').where('characterID', id);
};
