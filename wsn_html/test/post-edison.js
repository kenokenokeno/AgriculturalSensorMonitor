
var http = require("http");
var sensorData = {
    "dev_id" : 2,
    "clock" : 1455089290000,
    "pressure" : 1000,
    "temp" : 28,
    "humidity" : 60,
    "light" : 30,
    "moisture" : 160
};

// configure the header options
var options = {
    hostname: '192.168.1.145',
    port: 8080,
    path: '/upload',
    method: 'POST',
    headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': JSON.stringify(sensorData).length
    }
};
    
//create the post request
var req = http.request(options, function(res) {
    console.log('STATUS: ' + res.statusCode);
    console.log('HEADERS: ' + JSON.stringify(res.headers));
    res.setEncoding('utf8');
    res.on('data', function (chunk) {
        console.log('BODY: ' + chunk);
    });
});
req.on('error', function(e) {
    console.log('problem with request: ' + e.message);
});
req.write(JSON.stringify(sensorData));






