var http = require("http");
var hostname = '192.168.1.145'

http.get('http://'+hostname+':8080/get_data', function(res) {
    console.log("statusCode: ", res.statusCode);
    console.log("headers: ", res.headers);
    res.on('data', function(data) {
        console.log(data)
    });
          
}).on('error', function(e) {
    console.error(e);
});