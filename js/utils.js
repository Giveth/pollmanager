var _ = require('lodash');
var rlp = require('rlp');

module.exports.singleChoiceDef = (question, options) => {
    var d = [
        new Buffer(question),
        _.map(options, function(o) {
            return new Buffer(o);
        })
    ];

    var b= rlp.encode(d);
    var rlpDefinition =  '0x' + b.toString('hex');

    return rlpDefinition;
}
