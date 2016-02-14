// javascript module
var nano = require('nano')('http://koyadomari:monkey@localhost:5984');
var fs = require('fs');
var http = require('http');
const PORT=8080;

//html pages
var sensorHtml = fs.readFileSync('./flotSensors/flotSensorTest.html');
var flotPage = fs.readFileSync('./flotSensors/flotSensorTest.html');
var exampleCSS = fs.readFileSync('./flotSensors/example.css');
var jquery = fs.readFileSync('./flotSensors/jquery.js');
var jqueryFlot = fs.readFileSync('./flotSensors/jquery.flot.js');
var lightHtml = fs.readFileSync('./Sensor-Net-Project/wsn_html/light.html');

// base sensor array
sensor_data = {
    "newest_time" : 0,
    "pressure" : {
        "label" : "pressure",
        "data"  : []
    },
    "temp"     : {
        "label" : "temp",
        "data"  : []
    },
    "humidity" : {
        "label" : "humidity",
        "data"  : []
    },
    "light"    : {
        "label" : "light",
        "data"  : []
    },
    "moisture" : {
        "label" : "moisture",
        "data"  : []
    }
}
// sensor data array
sensor_data_array = []
sensor_data_array.push(sensor_data)
//sensor_data_array.push(sensor_data)
//sensor_data_array[0].pressure.push([1000000000, 100])
console.log(sensor_data_array)

f

// handle get requests and return the sorted array
function handleRequest(request, response){    
    if(request.method === "GET"){
        console.log("GET GET" + request.url)
        if(request.url.indexOf('sensor_data') != -1) {
            response.end(JSON.stringify(sensor_data_array));
        } else if(request.url.indexOf('example.css') != -1) {
            response.end(exampleCSS);
        } else if(request.url.indexOf('jquery.js') != -1) {
            response.end(jquery);
        } else if(request.url.indexOf('jquery.flot.js') != -1) {
            response.end(jqueryFlot);
        } else if(request.url.indexOf('lightHtml') != -1) {
            response.end(lightHtml);
        } else {
            response.end(flotPage);
        } 
    }
}

// handle new follow instances
//TODO : TODO
/*        // check if the clock time is valid
 console.log(json_data.clock)
 if(sensor_data_array[json_data.dev_id-1].newest_time >= 
 json_data.clock){
 //return if the json packet time in the past
 return;
 }*/

// create a server
var server = http.createServer(handleRequest);
server.listen(PORT, function(){
    //Callback triggered when server is successfully listening. Hurray!
    console.log("Server listening on: http://localhost:%s", PORT);
});

// get all the values from the database
function getAllDatabase(){
    var sensor_node_db = nano.use('sensor_node_1');
    sensor_node_db.list(function(err, body) {
        // return if no response from db
        if(typeof body == 'undefined')
            return;
        // perform functions for each row of the body
        body.rows.forEach(function(db_name) {
            sensor_node_db.get(db_name.id, {}, function(err, body) {
                if (!err){       
                    processJSON(body);
                } else {
                    console.log(err)
                }
            });
        });
    });
}

// process json data and update local json
function processJSON(json_data){
    // verify that the json data is valid
    if('dev_id' in json_data && 'clock' in json_data){
        // set the new newest time
        sensor_data_array[json_data.dev_id-1].newest_time = json_data.clock
        
        // check if the sensor array index doesn't exist, create it.
        while( typeof sensor_data_array[json_data.dev_id-1] == 'undefined'){
            sensor_data_array.push(sensor_data);
        }
        // add the data values from the packet to the sensor_data_array
        if('pressure' in json_data){
            sensor_data_array[json_data.dev_id-1].
                pressure.data.push([json_data.clock, json_data.pressure])
            sensor_data_array[json_data.dev_id-1].
                pressure.data.sort()
        }
        if('temp' in json_data){
            sensor_data_array[json_data.dev_id-1].
                temp.data.push([json_data.clock, json_data.temp])
            sensor_data_array[json_data.dev_id-1].
                temp.data.sort()
        }
        if('humidity' in json_data){
            sensor_data_array[json_data.dev_id-1].
                humidity.data.push([json_data.clock, json_data.humidity])
            sensor_data_array[json_data.dev_id-1].
                humidity.data.sort()
        }
        if('light' in json_data){
            sensor_data_array[json_data.dev_id-1].
                light.data.push([json_data.clock, json_data.light])
            sensor_data_array[json_data.dev_id-1].
                light.data.sort()
        }
        if('moisture' in json_data){
            sensor_data_array[json_data.dev_id-1].
                moisture.data.push([json_data.clock, json_data.moisture])
            sensor_data_array[json_data.dev_id-1].
                moisture.data.sort()
        }
    }
    //console.log(sensor_data_array[json_data.dev_id-1].pressure.data)
    //console.log(sensor_data_array[json_data.dev_id-1].temp.data)
    //console.log(sensor_data_array[json_data.dev_id-1].humidity.data)
    //console.log(sensor_data_array[json_data.dev_id-1].light.data)
    //console.log(sensor_data_array[json_data.dev_id-1].moisture.data)
}




