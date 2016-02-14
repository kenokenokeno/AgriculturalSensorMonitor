var querystring = require("querystring");
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


// write data to request body
function writeData(){
    //update the sensor data
    sensorData.clock    = sensorData.clock+300000
    sensorData.pressure = Math.round((Math.random()*50 + 1000)*100)/100
    sensorData.temp     = Math.round((Math.random()*5 + 25)*100)/100
    sensorData.humidity = Math.round((Math.random()*10 + 50)*100)/100
    sensorData.light    = Math.round(Math.random()*1000)
    sensorData.moisture = Math.round(Math.random()*80 + 400)
    
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
    req.write(JSON.stringify(sensorData));
}

setInterval(writeData, 1000);



