var querystring = require("querystring");
var http = require("http");
var sensorData = "Gateway Error: no response from sensor network"

    
// configure the header options
var options = {
    //hostname: '192.168.1.145',
    hostname: 'localhost',
    port: 8080,
    path: '/upload',
    method: 'POST',
    headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': JSON.stringify(sensorData).length
    }
};
    
//create the post request
var req = http.request(options,function(res) {
    console.log('STATUS: ' + res.statusCode);
    console.log('HEADERS: ' + JSON.stringify(res.headers));
    res.setEncoding('utf8');
    res.on('data', function (chunk) {
        console.log('BODY: ' + chunk);
    });
    res.on('end', function() {
        console.log('No more data in response.')
    })
});
req.on('error', function(e) {
    console.log('problem with request: ' + e.message);
});
req.write(sensorData);