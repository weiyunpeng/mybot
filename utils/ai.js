var mongoose = require('mongoose');
var options = {
    useMongoClient: true,
    autoIndex: false,
    reconnectTries: Number.MAX_VALUE,
    reconnectInterval: 500,
    user: 'root',
    pass: '123123'
};
mongoose.connect('mongodb://ds017256.mlab.com:17256/mongoyun', options);
var Schema = mongoose.Schema;

var QASchema = new Schema({
    q: String,
    a: String
});

var QA = mongoose.model('QA', QASchema);

exports.addQA = function(q, a, callback) {
    var qa = new QA({ q: q, a: a });
    qa.save(function(err) {
        callback();
    });
};

exports.answer = function(q) {
    return QA.find({ q: {$regex:q} }).exec();
};
