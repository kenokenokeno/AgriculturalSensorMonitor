var http = require('http');

http.get('http://localhost:8080', function(res) {
    console.log("statusCode: ", res.statusCode);
    console.log("headers: ", res.headers);
          
    res.on('data', function(d) {
        process.stdout.write(d);
    });
          
}).on('error', function(e) {
    console.error(e);
});