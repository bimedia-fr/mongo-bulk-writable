/*jslint node: true, nomen: true, plusplus: true, vars: true, eqeq: true*/
'use strict';

var MongoClient = require('mongodb').MongoClient;
var es = require('event-stream');
var bulkWritable = require('../lib/index');

// Connection URL
var url = 'mongodb://localhost:27017/myproject';

var db, col;

module.exports = {
    setUp: function (done) {

        MongoClient.connect(url, function (err, mongo) {
            if (err) {
                console.log(err);
            }
            db = mongo;
            col = db.collection('test' + (Date.now() % 10));
            done();
        });
    },
    testSimpleCase: function (test) {
        var arr = require('./sample.js');
        var reader = es.readArray(arr), bulk = col.initializeOrderedBulkOp();
        var writable = bulkWritable(bulk, function write(chunk, next) {
            this.bulk.insert(chunk);
            next();
        });
        writable.on('finish', function () {
            col.find({}).toArray(function (err, res) {
                test.equal(res.length, 21);
                test.done();
            });
        });
        writable.on('error', function (err) {
            console.log(err);
            test.done(err);
        });
        reader.pipe(writable);
    },
    testWrite: function (test) {
        var arr = require('./sample.js');
        var reader = es.readArray(arr), bulk = col.initializeOrderedBulkOp();
        var writable = bulkWritable(bulk, function write(chunk, next) {
            this.bulk.insert(chunk);
            next();
        });

        writable.on('error', function (err) {
            console.log(err);
            test.done(err);
        });

        //reader.pipe(writable);
        arr.forEach(function (el) {
            writable.write(el);
        });

        writable.end(function () {
            col.find({}).toArray(function (err, res) {
                test.equal(res.length, 21);
                test.done();
            });
        });
    },
    testEmptyBulk: function (test) {
        var reader = es.readArray([]), bulk = col.initializeOrderedBulkOp();
        var writable = bulkWritable(bulk, function write(chunk, next) {
            this.bulk.insert(chunk);
            next();
        });
        writable.on('finish', function () {
            test.done();
        });
        writable.on('error', function (err) {
            console.log(err);
            test.done(err);
        });
        reader.pipe(writable);
    },
    tearDown: function (done) {
        if (db) {
            col.drop();
            db.close();
        }
        done();
    }
};
