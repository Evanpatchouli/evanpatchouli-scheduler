const express = require('express');
const exhandler = require('./exhandler');
const init = require('./init');
const JsTextChart = require('js-text-chart')

let app = express();

app.all("*", function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    res.header("Access-Control-Allow-Methods", "*");
    res.header("Content-Type", "application/json;charset=utf-8");
    next();
});

app.get('/', function (req, res) {
    res.send('Hello World!');
});


app.use(exhandler); //全局异常捕获

const server = app.listen(8001, '127.0.0.1', async () => {
    let host = server.address().address;
    host = (host=="::")? "localhost":host;
    let port = server.address().port;

    await init();
    console.log(JsTextChart.convert("hello"));
    console.log("Server is ready on http://%s:%s", host, port);
})