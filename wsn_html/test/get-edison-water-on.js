var http = require("http");
//var hostname = '192.168.1.145'
var hostname = '192.168.43.225'

http.get('http://'+hostname+':8080/turn_on_water', function(res) {
    console.log("statusCode: ", res.statusCode);
    console.log("headers: ", res.headers);
    res.on('data', function(data) {
        console.log(data)
    });
          
}).on('error', function(e) {
    console.error(e);
});