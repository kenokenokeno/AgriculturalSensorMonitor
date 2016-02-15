// load javascript module
var nano = require('nano')('http://keno:monkeydesupass@localhost:5984');
var fs = require('fs');
var http = require('http');

// network configurations
const PORT=8080;
var edison_hostname = '192.168.1.145'

// weather data and time
var weather_time = 0
var weather_data;

// Include the html pages
var weatherPage     = fs.readFileSync('weather.html');
var cssPage         = fs.readFileSync('mystyle.css');
var projInfoPage    = fs.readFileSync('project-info.html');
var temperaturePage = fs.readFileSync('temperature.html');
var humdityPage     = fs.readFileSync('humidity.html');
var lightPage       = fs.readFileSync('light.html');
var pressurePage    = fs.readFileSync('pressure.html');
var soilMoisturePage= fs.readFileSync('soil-moisture.html');
var softwarePage    = fs.readFileSync('software-design.html');
var hardwarePage    = fs.readFileSync('hardware-design.html');
var myStyleCSS      = fs.readFileSync('mystyle.css');
var jquery          = fs.readFileSync('./flotGraphing/jquery.js');
var jqueryFlot      = fs.readFileSync('./flotGraphing/jquery.flot.js');
var jqueryFlotTime  = fs.readFileSync('./flotGraphing/jquery.flot.time.js');

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

//couch db list and view
couchdb_list_view_id = "_design/sensor_map",
couchdb_list_view = {
    "language": "javascript",
    "views": {
        "dev_id": {
            "map": "function(doc) { emit(doc._id, doc.dev_id) }"
        },
        "temp": {
            "map": "function(doc) { emit(doc._id, doc.temperature) }"
        },
        "pressure": {
            "map": "function(doc) { emit(doc._id, doc.pressure) }"
        },
        "humidity": {
            "map": "function(doc) { emit(doc._id, doc.humidity) }"
        },
        "light": {
            "map": "function(doc) { emit(doc._id, doc.light) }"
        },
        "moisture": {
            "map": "function(doc) { emit(doc._id, doc.moisture) }"
        }
    },
    "lists": {
        "index-values": "function(head, req) { send('[');if(row=getRow()){send('[');send(row.key);send(',');send(row.value);send(']');}while(row=getRow()){send(',[');send(row.key);send(',');send(row.value);send(']');}send(']');  }"
    }
}

// sensor data array
sensor_data_array = [] //stores all of the local sensor data
newest_data = [] // stores the newest sensor data

// at start get all json data from the database
getAllDatabases();

//We need a function which handles requests and send response
function handleRequest(request, response){    
    if(request.method === "GET"){
        //console.log(request.url)
        if(request.url.indexOf('data_sensor') != -1) {
            response.end(JSON.stringify(sensor_data_array));
        } else if(request.url.indexOf('data_new') != -1) {
            getNewData()
            response.end("OK");
        } else if(request.url.indexOf('data_weather') != -1) {
            getWeatherData(response)
        } else if (request.url.indexOf('weather') != -1) {
            response.end(weatherPage);
        } else if (request.url.indexOf('mystyle') != -1) {
            response.end(cssPage);
        } else if (request.url.indexOf('project-info') != -1) {
            response.end(projInfoPage);
        } else if (request.url.indexOf('temperature') != -1) {
            response.end(temperaturePage);
        } else if (request.url.indexOf('humidity') != -1) {
            response.end(humdityPage);
        } else if (request.url.indexOf('light') != -1) {
            response.end(lightPage);
        } else if (request.url.indexOf('pressure') != -1) {
            response.end(pressurePage);
        } else if (request.url.indexOf('soil-moisture') != -1) {
            response.end(soilMoisturePage);
        } else if (request.url.indexOf('software-design') != -1) {
            response.end(softwarePage);
        } else if (request.url.indexOf('hardware-design') != -1) {
            response.end(hardwarePage);
        } else if(request.url.indexOf('example.css') != -1) {
            response.end(myStyleCSS);
        } else if(request.url.indexOf('jquery.js') != -1) {
            response.end(jquery);
        } else if(request.url.indexOf('jquery.flot.js') != -1) {
            response.end(jqueryFlot);
        } else if(request.url.indexOf('jquery.flot.time.js') != -1) {
            response.end(jqueryFlotTime);
        }else {
            response.end(projInfoPage);
        }
    } else if(request.method === "POST"){
        console.log("\nRECEIVED POST: ")
        request.on('data', function(body) {
            var sensor_data = JSON.parse(body)
            // send the request okay msg to the client
            response.writeHead(200, {'Content-Type': 'text/html'});
            response.end('OK')
            // verify the json packet elements
            if (!('dev_id' in sensor_data && 'clock' in sensor_data && 
                  request.url == '/upload')){
                console.log("ERR: invalid or missing json packet elements, ignoring packet")
                return;
            }
            // verify the json packet data
            if(sensor_data.dev_id < 0 || sensor_data.dev_id > 999 || 
                    sensor_data.clock < 1451606400000 || sensor_data.clock > 1893456000000){
                console.log("ERR: invalid data values, ignoring packet")
                return;
            }
            // get the database name
            database_name = 'sensor_node_' + sensor_data.dev_id
            
            // check if the database exists
            nano.db.get(database_name, function(err, body) {
                if(!err){
                    // push the file to the database
                    var node_db = nano.use(database_name);
                    node_db.insert(sensor_data, 
                            sensor_data.clock.toString(), function(err, body, header) {
                        if (err) {
                            console.log('[' + database_name + ']: ', err.message);
                            return;
                        }
                        console.log(body);
                    });
                    // update the local data
                    processJSON(sensor_data)
                } 
                else if (err.message == 'no_db_file') {
                    //if the database does not exist, create it
                    nano.db.create(database_name, function(err){
                        if(!err){
                            var node_db = nano.use(database_name);
                            node_db.insert(couchdb_list_view, couchdb_list_view_id,
                                    function(err, body, header) {
                                if (err) {
                                    console.log('[' + database_name + ']: ', err.message);
                                    return;
                                }
                                console.log(body);
                            });
                        } else {
                            console.log("CREATE: " + err.message)
                        }
                    });
                } else if (err) {
                    console.log("ERROR: " + err.message)
                    return;
                }
                
            });
        });
    }
}

// create a server
var server = http.createServer(handleRequest);
server.listen(PORT, function(){
    //Callback triggered when server is successfully listening. Hurray!
    console.log("Server listening on: http://localhost:%s", PORT);
});

// get all the values from the database
function getAllDatabases(){
    nano.db.list(function(err, body) {
        if(typeof body == 'undefined'){
            console.log("Unable to read from database: you forgot to turn couchdb on")
            return;
        }
        body.forEach(function(db_name) {
            if(db_name.toString().indexOf('sensor_node_') > -1){
                // init the database that will be used
                var sensor_db = nano.use(db_name);
                     
                // get the device id of the sensor node
                sensor_db.get('_design/sensor_map/_list/index-values/dev_id/', 
                            { revs_info: true }, function(err, body) {
                    if (!err){
                        var this_dev_id = body[0][1]
                    } else {
                        console.log("ERR: Invalid dev_id read from couchDB")
                        return;
                    }
                    // check if the sensor array index doesn't exist, create it.
                    while( typeof sensor_data_array[this_dev_id-1] == 'undefined'){
                        sensor_data_array.push(JSON.parse(JSON.stringify(sensor_data)));
                    }
                    //get all of the sensor values
                    sensor_db.get('_design/sensor_map/_list/index-values/temp/', 
                            { revs_info: true }, function(err, body) {
                        if (!err){
                            sensor_data_array[this_dev_id-1].temp.data = body
                        }
                    });
                    sensor_db.get('_design/sensor_map/_list/index-values/pressure/', 
                            { revs_info: true }, function(err, body) {
                        if (!err){
                            sensor_data_array[this_dev_id-1].pressure.data = body
                        }
                    });
                    sensor_db.get('_design/sensor_map/_list/index-values/humidity/', 
                            { revs_info: true }, function(err, body) {
                        if (!err){
                            sensor_data_array[this_dev_id-1].humidity.data = body
                        }
                    });
                    sensor_db.get('_design/sensor_map/_list/index-values/light/', 
                            { revs_info: true }, function(err, body) {
                        if (!err){
                            sensor_data_array[this_dev_id-1].light.data = body
                        }
                    });
                    sensor_db.get('_design/sensor_map/_list/index-values/moisture/', 
                            { revs_info: true }, function(err, body) {
                        if (!err){
                            sensor_data_array[this_dev_id-1].moisture.data = body
                        }
                    });
                              
                });
            }        
        });
    });
}

// process json data and update local json
function processJSON(json_data){
    // verify that the json data is valid
    if('dev_id' in json_data && 'clock' in json_data){
        // check if the sensor array index doesn't exist, create it.
        while( typeof sensor_data_array[json_data.dev_id-1] == 'undefined'){
            sensor_data_array.push(JSON.parse(JSON.stringify(sensor_data)));
        }
        // set the new newest time
        sensor_data_array[json_data.dev_id-1].newest_time = json_data.clock
        newest_data = json_data
        // add the data values from the packet to the sensor_data_array
        if('pressure' in json_data){
            sensor_data_array[json_data.dev_id-1].
                pressure.data.push([json_data.clock, json_data.pressure])
        }
        if('temperature' in json_data){
            sensor_data_array[json_data.dev_id-1].
                temp.data.push([json_data.clock, json_data.temperature])
        }
        if('humidity' in json_data){
            sensor_data_array[json_data.dev_id-1].
                humidity.data.push([json_data.clock, json_data.humidity])
        }
        if('light' in json_data){
            sensor_data_array[json_data.dev_id-1].
                light.data.push([json_data.clock, json_data.light])
        }
        if('moisture' in json_data){
            sensor_data_array[json_data.dev_id-1].
                moisture.data.push([json_data.clock, json_data.moisture])
        }
    }
}

// Gets new data from the Gateway
function getNewData(){
    http.get('http://'+edison_hostname+':8080/get_data', function(res) {
        /*console.log("statusCode: ", res.statusCode);
        console.log("headers: ", res.headers);
        res.on('data', function(data) {
            console.log(data)
        });*/
    }).on('error', function(e) {
        console.error(e);
    });
}

function getWeatherData(page_response){
    var d = new Date();
    var new_time = false
    if(d.getTime() - weather_time >= 600000){
        weather_time = d.getTime();
        new_time = true
        http.get("http://api.openweathermap.org/data/2.5/weather?id=5392171&appid=44db6a862fba0b067b1930da0d769e98", function(res) {
            //console.log("statusCode: ", res.statusCode);
            //console.log("headers: ", res.headers);
            res.on('data', function(data) {
                //console.log(JSON.parse(data))
                weather_data = data
                page_response.end(weather_data);
                return
            })            
        }).on('error', function(e) {
            console.error(e);
        });
    }
    if(new_time == false){
        page_response.end(weather_data);
    }
}
