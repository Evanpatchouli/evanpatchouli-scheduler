const Resp = require('./resp');

let exhandler = (err, req, res, next)=> {
    console.error('Error:', err);
    res.status(500).json(Resp.Bad(err));
}

module.exports = exhandler;