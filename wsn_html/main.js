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
var weather_json;

// Include the html pages
var weatherPage     = fs.readFileSync('weather.html');
var waterControlPage= fs.readFileSync('water-control.html');
var cssPage         = fs.readFileSync('mystyle.css');
var projInfoPage    = fs.readFileSync('project-info.html');
var temperaturePage = fs.readFileSync('temperature.html');
var humdityPage     = fs.readFileSync('humidity.html');
var lightPage       = fs.readFileSync('light.html');
var pressurePage    = fs.readFileSync('pressure.html');
var soilMoisturePage= fs.readFileSync('soil-moisture.html');
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
    },
    "water" : {
        "label" : "water",
        "data"  : []
    }
}

//couch db list and view
couchdb_list_view_id = "_design/sensor_map",
couchdb_list_view = {
    "language": "javascript",
    "views": {
        "dev_id": {
           "map": "function(doc) { if(doc.dev_id != null){ emit(doc._id, doc.dev_id) } }"
       },
       "temp": {
           "map": "function(doc) { if(doc.temperature != null){ emit(doc._id, doc.temperature) } }"
       },
       "pressure": {
           "map": "function(doc) { if(doc.pressure != null){ emit(doc._id, doc.pressure) } }"
       },
       "humidity": {
           "map": "function(doc) { if(doc.humidity != null){ emit(doc._id, doc.humidity)} }"
       },
       "light": {
           "map": "function(doc) { if(doc.light != null){ emit(doc._id, doc.light) } }"
       },
       "moisture": {
           "map": "function(doc) { if(doc.moisture != null){ emit(doc._id, doc.moisture) } }"
       },
       "water": {
           "map": "function(doc) { if(doc.water != null){ emit(doc._id, doc.water) } }"
       }
    },
    "lists": {
        "index-values": "function(head, req) { send('[');if(row=getRow()){send('[');send(row.key);send(',');send(row.value);send(']');}while(row=getRow()){send(',[');send(row.key);send(',');send(row.value);send(']');}send(']');  }"
    }
}

// sensor data array
var sensor_data_array = [] //stores all of the local sensor data
var newest_data = [] // stores the newest sensor data
var data_new_status = "." //status of the get new data command

// Get the weather data once on start, then update every 15mins
getWeatherData();
setInterval(getWeatherData, 900000);

// at start get all json data from the database
getAllDatabases();

//We need a function which handles requests and send response
function handleRequest(request, response){    
    if(request.method === "GET"){
        //console.log(request.url)
        if(request.url.indexOf('data_sensor') != -1) {
            response.end(JSON.stringify(sensor_data_array));
        } else if(request.url.indexOf('data_new') != -1) {
            getNewData();
            data_new_status = "waiting for response . . . please be patient"
            response.end("OK");
        } else if(request.url.indexOf('get_data_status') != -1) {
            response.end(data_new_status);
        } else if(request.url.indexOf('data_weather') != -1) {
            response.end(getWeatherData());
        } else if (request.url.indexOf('weather') != -1) {
            response.end(weatherPage);
        } else if (request.url.indexOf('water-control') != -1) {
            response.end(waterControlPage);
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
            // send the request okay msg to the client
            response.writeHead(200, {'Content-Type': 'text/html'});
            response.end('OK')
            
            // check if its a status packet
            if (body.indexOf('Gateway') > -1) {
                 data_new_status = body;
                 console.log("RX: received a status packet: " + data_new_status)
                 return
            }

            // parse the json data
            var sensor_data_json = JSON.parse(body)
            
            // check if the data is connected
            /*if(typeof sensor_data_array[sensor_data.dev_id-1] == 'undefined'){
                console.log("ERR: the database isn't configured, do not process the packet")
                return;
            }*/
            
            
            // verify the json packet elements
            if (!('dev_id' in sensor_data_json && 'clock' in sensor_data_json && 
                  request.url == '/upload')){
                console.log("ERR: invalid or missing json packet elements, ignoring packet")
                return;
            }
            // verify the json packet data
            if(sensor_data_json.dev_id < 0 || sensor_data_json.dev_id > 999 || 
                    sensor_data_json.clock < 1451606400000 || sensor_data_json.clock > 1893456000000){
                console.log("ERR: invalid data values, ignoring packet")
                return;
            }
            // update the get new data status
            data_new_status = "new data received from the network"
            
            // check if the sensor array index doesn't exist, create it.
            while( typeof sensor_data_array[sensor_data_json.dev_id-1] == 'undefined'){
                sensor_data_array.push(JSON.parse(JSON.stringify(sensor_data)));
            }
            
            // verify the clock time is correct
            if(sensor_data.clock <= sensor_data_array[sensor_data_json.dev_id-1].newest_time){
                console.log("ERR: received packet from the past, perform manual Gateway clock sync")
                return;
            }
            sensor_data_array[sensor_data_json.dev_id-1].newest_time = sensor_data_json.clock
            newest_data = sensor_data_json
            
            // get the database name
            database_name = 'sensor_node_' + sensor_data_json.dev_id
            
            // check if the database exists
            nano.db.get(database_name, function(err, body) {
                if(!err){
                    // push the file to the database
                    var node_db = nano.use(database_name);
                    node_db.insert(sensor_data_json, 
                            sensor_data_json.clock.toString(), function(err, body, header) {
                        if (err) {
                            console.log('[' + database_name + ']: ', err.message);
                            return;
                        }
                        console.log(body);
                    });
                    // update the local data
                    processJSON(sensor_data_json)
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
                            //get the latest received packet time
                            //packets with recv time before the clock time of the last index 
                            //will be dropped
                            last_index = body.length
                            last_index_time = body[last_index-1][0]
                            sensor_data_array[this_dev_id-1].newest_time = last_index_time
                        }
                    });
                    sensor_db.get('_design/sensor_map/_list/index-values/water/', 
                            { revs_info: true }, function(err, body) {
                        if (!err){
                            sensor_data_array[this_dev_id-1].water.data = body
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
                checkWaterControl()
        }
        if('water' in json_data){
            sensor_data_array[json_data.dev_id-1].
                water.data.push([json_data.clock, json_data.water])
        }
    }
}

// Gets new data from the Gateway
function getNewData(){
    var request = http.get('http://'+edison_hostname+':8080/get_data', function(res) {
        /*console.log("statusCode: ", res.statusCode);
        console.log("headers: ", res.headers);
        res.on('data', function(data) {
            console.log(data)
        });*/
    }).on('error', function(e) {
        console.error(e);
    });
    request.setTimeout( 10000, function( ) {
        console.error("getNewData Timeout Error: no response for sensor network gateway");
        data_new_status = "TimeoutError: no response for Sensor Network Gateway"
    });
}

// Turn on water control
function turnOnWater(){
    console.log("Turn water ON")
    var request = http.get('http://'+edison_hostname+':8080/turn_on_water', function(res) {
    }).on('error', function(e) {
        console.error(e);
    });
    request.setTimeout( 10000, function( ) {
        console.error("turnOnWater Timeout Error: no response for sensor network gateway");
        data_new_status = "Error: turnOnWater Failed. no response for Sensor Network Gateway"
    });
}

// Turn off water control
function turnOffWater(){
    console.log("Turn water OFF")
    var request = http.get('http://'+edison_hostname+':8080/turn_off_water', function(res) {
    }).on('error', function(e) {
        console.error(e);
    });
    request.setTimeout( 10000, function( ) {
        console.error("turnOffWater Timeout Error: no response for sensor network gateway");
        data_new_status = "Error: turnOffWater Failed. no response for Sensor Network Gateway"
    });
}

// Water Control Smart Algorithm Modes:
//  - [1] Dumb: turn on periodically
//  - [2] Reactive mode: Threshold do something. 
//  - [3] Proactive mode: do things when you think they are going to be needed. 
var ctrl_mode_dumb      = 1;
var ctrl_mode_reactive  = 2;
var ctrl_mode_proactive = 3;
// set the water control mode
var water_ctrl_mode = ctrl_mode_proactive    //<<========= Sets the water control mode
// variables for dumb timing control
var dumb_water_on_time = 120000
var dumb_water_off_time = 120000
var last_measured_time = 0
var water_status_on = false
// reactive mode soil moisture threshold
var soil_mois_threshold = 750;
// handle the water control for the system
function checkWaterControl(){
    var d = new Date();
    // swtich between water control systems
    switch(water_ctrl_mode) {
        case ctrl_mode_dumb:
            console.log("Water Control Mode: Dumb")
            if(water_status_on == false){
                if(d.getTime()-last_measured_time >= dumb_water_off_time){
                    turnOnWater();
                    water_status_on = true;
                    last_measured_time = d.getTime();
                    
                }
            }  else {
                if(d.getTime()-last_measured_time >= dumb_water_on_time){
                    turnOffWater();
                    water_status_on = false;
                    last_measured_time = d.getTime();
                }
            } 
            break;
        case ctrl_mode_reactive:
            console.log("Water Control Mode: Reactive")
            if(newest_data && (newest_data.moisture <= soil_mois_threshold)){
                turnOnWater()
            } else {
                turnOffWater()
            }
            break;
        case ctrl_mode_proactive:
            console.log("Water Control Mode: Proactive")
            calc_threshold = calcSoilMoisThreshold()
            if(newest_data && (newest_data.moisture <= calc_threshold)){
                turnOnWater()
            } else {
                turnOffWater()
            }
            break;
    }
}

function calcSoilMoisThreshold(){
    // check if the weather description includes rainny weather
    if(typeof weather_json != 'undefined' && typeof weather_json.weather != 'undefined'){
        if((weather_json.weather[0].description.indexOf("thunderstorm") > -1) || 
                (weather_json.weather[0].description.indexOf("drizzle") > -1) ||
                (weather_json.weather[0].description.indexOf("rain") > -1) || 
                (weather_json.weather[0].description.indexOf("snow") > -1) || 
                (weather_json.weather[0].description.indexOf("mist") > -1) || 
                (weather_json.weather[0].description.indexOf("storm") > -1) || 
                (weather_json.weather[0].description.indexOf("hurricane") > -1)){
            console.log("Looks like rainy weather, do not turn water on, setting to threshold to -1")
            return -1;   
        }
    } else {
        console.log("ERR: no weather data avaliable, check the connection to openweathermap.org")
    }
    // initially set the calc threshold to the soil moisture threshold
    calc_threshold = soil_mois_threshold;
    //console.log("threshold; " + calc_threshold);
    // update the threshold for temperature
    if(newest_data.temp < 20){
        calc_threshold -= 10;
    } else if (newest_data.temp > 35){
        calc_threshold += 10;
    }
    //console.log("threshold; " + calc_threshold);
    // update the threshold for humidiy
    if(newest_data.humidiy < 20){
        calc_threshold += 10;
    } else if (newest_data.humidiy > 60){
        calc_threshold -= 5;
    } else if (newest_data.humidiy > 85){
        calc_threshold -= 10;
    }
    //console.log("threshold; " + calc_threshold);
    // update the threshold for light
    if(newest_data.light < 200){
        calc_threshold -= 5;
    } else if (newest_data.light > 600){
        calc_threshold += 5;
    }
    //console.log("threshold; " + calc_threshold);
    return calc_threshold;
}


// Get weather data from the internet
function getWeatherData(){
    var d = new Date();
    var new_time = false
    console.log("Updating weather data from server")
    if(d.getTime() - weather_time >= 600000){
        weather_time = d.getTime();
        new_time = true
        http.get("http://api.openweathermap.org/data/2.5/weather?id=5392171&appid=b8ec00ce19f295a8d2a07573fbc89eaa", function(res) {
            //console.log("statusCode: ", res.statusCode);
            //console.log("headers: ", res.headers);
            res.on('data', function(data) {
                //console.log(JSON.parse(data))
                weather_data = data
                weather_json = JSON.parse(data)
                return weather_data;
            })            
        }).on('error', function(e) {
            console.error(e);
        });
    }
    if(new_time == false){
        return weather_data;
    }
}
