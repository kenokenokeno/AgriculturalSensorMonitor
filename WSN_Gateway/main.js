// Configure the mraa variables
var mraa = require('mraa');
console.log('MRAA Version: ' + mraa.getVersion());

// Wireless sensor module data 
var wsm_data;

// Gateway post interval
// Possible values(millisecInterval, 0=OnNewValue)
var post_interval = 0

// Json file save
var json_save_path = "/home/root/data/node_packets";
var get_data = "/get_data";
var turn_on_water = "/turn_on_water";
var turn_off_water = "/turn_off_water";
var node_packets = [];
var MAX_QUEUE_SIZE = 5;

// Configure Network variables
var querystring = require("querystring");
var express = require('express');
var app = express();
var path = require('path');
var http = require('http');
var fs = require('fs');
var io = require('socket.io')(http);
var connectedUsersArray = [];
var userId;

// Set up the serial port configuration
my_uart = new mraa.Uart(0);  // Default: UART1, TTL-level port
var serialPath = my_uart.getDevicePath(); // Default port "/dev/ttyMFD1"
var SerialPort = require("serialport").SerialPort;
var serialPort = new SerialPort(serialPath, {
    baudrate: 9600
});

// Open the serial port and start the serial listener
var data_received;
serialPort.on("open",function() {
    console.log("SerialPort connected to " + serialPath);
    // Read available data from serial port
    serialPort.on("data", function(xbee_packet) { 
        data_received = xbee_packet.toString()
        parseToJson(xbee_packet);
    });
});

// Read in the json packet queue (only at boot)
fs.readFile(json_save_path, 'utf8', function(err, data) {
    if(err) {
        return console.log(err);
    } else if (data.length <= 1){
        return console.log("Cannot read file: File is empty");
    }
    //console.log(data)
    //console.log(data.length)
    json_data = JSON.parse(data)
    node_packets = json_data;
    //console.log(json_data)
    console.log("Archive File was correctly read !");
});

var i = 0
function loop(){
    //TEST DATA (Comment this Section out)
    /*if(i < 5){
        parseToJson(i + ",KENO:@2,C12345678,P1014.7,T23.7,T22.5,H74.4,L512,M32*");
    } else if(i >= 5 &&  i < 8){
        parseToJson(i + ",KENO:@1,C12345678,P1014.7,T23.7,T22.5,H74.4,L512,M32*");
    } else {
        parseToJson(i + ",KENO:@6,C12345678,P1014.7,T23.7,T22.5,H74.4,L512,M32*");
    }
    i++;//*/
    //SEND REAL DATA (Uncomment this Section)
    sendJsonHttp(wsm_data)
}
// Only set the post interval if not equal to 0
if(post_interval != 0){
    setInterval(loop, post_interval);
}

/* Parse the xbee packet and save data in JSON format
 * 
 *  Sensor Module Data Packet Structure
 *  The data within the packet is separated using commas each 
 *  data value consists of an identifier as described below and 
 *  a float value with one decimal point accuracy. The packet 
 *  always starts with the sync string "KENO:". This is used to 
 *  identify the start of the packet. Once this string is detected 
 *  the identifier is used to id the data type and the float 
 *  number read until either ',' which identifies the end of the 
 *  data value, or '*' which identifies the end of the packet.
 *  
 *  Data Type Identifiers: 
 *  C: Clock Time (ms)
 *  P: Pressure (millibar)
 *  T: Temperature (celcius)
 *  H: Humidity: (percent)
 *  L: Light (intensity magnitude)
 *  M: Soil Moisture (conductivity magnitude)
 * Example Packet Data: KENO:C12345678,P1014.7,T23.7,T22.5,H74.4,L512,M32*
 */
function parseToJson(xbee_data) {
    console.log("\nXBEE RX: " + xbee_data);
    packet_crc = xbee_data[xbee_data.length-1]
    console.log("PackCRC: " + packet_crc)
    console.log("CalcCRC: " + calcCheckSum(xbee_data))
    xbee_string = String(xbee_data)
    //validate the packet check for start sync and end char
    if(xbee_string.indexOf("KENO") != -1 && (packet_crc == calcCheckSum(xbee_data))){
        // get the device id
        var dev_id = getDataValue(xbee_string, "@")
        // get the clock time
        var clock_value = (new Date).getTime()
        // get the pressure value
        var pressure_value = getDataValue(xbee_string, "P")
        // get the temp value
        var temp_value = getDataValue(xbee_string, "T")
        // get the humidiy value
        var humidity_value = getDataValue(xbee_string, "H")
        // get the light value
        var light_value = getDataValue(xbee_string, "L")
        // get the soil moisture value
        var soil_value = getDataValue(xbee_string, "M")
        // water controller state 
        var water_value = getDataValue(xbee_string, "W")
        
        //put the data in a json format
        wsm_data =
            {"dev_id": dev_id, "clock":clock_value, "pressure":pressure_value, 
            "temperature":temp_value, "humidity":humidity_value, 
            "light":light_value, "moisture":soil_value, "water":water_value}
        // print the packet data to the console
        console.log("device id: " + wsm_data.dev_id)
        console.log("clock:    " + wsm_data.clock)
        console.log("pressure: " + wsm_data.pressure)
        console.log("temp:     " + wsm_data.temperature)
        console.log("humidity: " + wsm_data.humidity)
        console.log("light:    " + wsm_data.light)
        console.log("moisture: " + wsm_data.moisture)
        console.log("water: " + wsm_data.water)
        // save the new sensor data to a file
        saveToFile(wsm_data)
        // the new data to the http server
        if(post_interval == 0){
            sendJsonHttp(wsm_data)
        }
    }
}

// Get the data value of type from the packet and return the 
// value if it exists. 
function getDataValue(packet, type) {
    // check to see if the data type identifier exists in the packet
    start_index = packet.indexOf(type)
    if(start_index != -1){
        // get the end index, denoted with ','
        end_index = packet.indexOf(",", start_index)
        if(end_index == -1){
            //end index ',' not found, could be end of packet, look for "*'
            end_index = packet.indexOf("*", start_index)
            if(end_index == -1){
                // if end index still not found, soemthings wrong, error
                return -1;
            }
        }
        // get the float value from the packet and return
        return parseFloat(packet.substring(start_index+1, end_index));
    } else {
        return -1
    }
}

// send HTTP Post packet 
function sendHttp(data){
    // check if data is valid
    if(!data || data.length <= 0){
        return;
    }    
    // set up the http packet options
    var options = {
        //this address should be the address the webserver is running on
        //hostname: '192.168.1.167', //home network
        hostname: '192.168.43.110', //galaxy network
        port: 8080,
        path: '/upload',
        method: 'POST',
        headers: {
            'Content-Length': data.length
        }
    };
    // create the http request using options
    var req = http.request(options);
    req.on('error', function(e) {
        console.log('problem with request: ' + e.message);
    });
    // send the post request
    req.write(data);
    req.end();
}

// send HTTP Post packet 
function sendJsonHttp(data){
    // check if data is valid
    if(!data || data.length <= 0){
        return;
    }    
    // stringify and format the Json data
    json_data = JSON.stringify(data);
    // send the json data using http
    sendHttp(json_data);
}

// start the local edison server: 
// the server listens for post and get requests from the Webserver
var server = http.createServer(handleRequest);
server.listen(8080, function(){
    console.log("\nWebServer listening on: http://localhost:%s", 8080);
});
// function that handles requests and sends responses
function handleRequest(request, response){
    var start_timeout = (new Date).getTime();
    var repeat_timeout = 0
    var headers = request.headers;
    var method = request.method;
    var url = request.url;
    var body = [];
    request.on('error', function(err) {
        console.error(err);
    }).on('data', function(chunk) {
        body.push(chunk);
    }).on('end', function() {
        body = Buffer.concat(body).toString();
    });
    // print things for a test
    if(method === "POST"){
        console.log("\nGOT POST: this is unexpected, do nothing")
        console.log("  HEADERS: " + JSON.stringify(headers));
        console.log("  URL: " + url);
        response.writeHead(200, {'Content-Type': 'text/html'});
        response.end('OK')
    } else if(method == "GET"){
        console.log("\nGOT GET: check if its a command");
        console.log("  HEADERS: " + JSON.stringify(headers));
        console.log("  URL: " + url);
        response.end("OK");
        data_received = "empty";
        if(url == get_data){
            console.log("  Command Received: forwarding to network")
            // this writes the command to all sensor nodes
            repeatSerialWrite("GetNewData");
        } else if(url == turn_on_water){
            console.log("  TurnOnWater Command Received, forwarding to network")
            // this writes the command to all sensor nodes
            repeatSerialWrite("TurnOnWater");
        } else if(url == turn_off_water){
            console.log("  TurnOffWater Command Received, forwarding to network")
            // this writes the command to all sensor nodes
            repeatSerialWrite("TurnOffWater");
        }
    }
    //variables for get data
    var got_data_1 = false;
    var got_data_2 = false;
    function repeatSerialWrite(write_string){
        // return if the correct response was received
        if(data_received && (data_received.indexOf(write_string) > -1)){
            return;   
        } else if(data_received && (data_received.indexOf("KENO,@1") > -1)){
            got_data_1 = true;        
        } else if(data_received && (data_received.indexOf("KENO,@2") > -1)){
            got_data_2 = true;        
        }
        if(got_data_1 && got_data_2){
            got_data_1 = false;
            got_data_2 = false;
            return
        }
        
        // return if the timeout value is reached
        if((new Date).getTime() - start_timeout >= 5000){
            //TODO: Add a gateway to wsm timeout message
            console.log("Gateway Error: no response from sensor network")
            sendHttp("Gateway Error: no response from sensor network")
            got_data_1 = false;
            got_data_2 = false;
            return;
        }
        // write the string to the serial port
        if((new Date).getTime() - repeat_timeout >= 500){
            serialPort.write(write_string+"\n");
            repeat_timeout = (new Date).getTime();
        }
        //console.log("write2serial: " + write_string);
        // repeat this function after a timeout
        setTimeout(repeatSerialWrite, 10, write_string);
    }
}

// save the packet data to a local file
// each sensor node will have its own file to save the data
function saveToFile(json_packet){
    // get the device and verify that it is valid
    device_id = json_packet.dev_id;
    device_id_index = device_id - 1;
    if(device_id < 0 || device_id >= 10){
        return;
    }
    // create an array for each device if it doesn't exit
    while( typeof node_packets[device_id_index] == 'undefined'){
        node_packets.push([]);
    }
    // push the packet to the local queue, with MAX_QUEUE_SIZE
    //console.log("Node Packet Length Start: " + node_packets[device_id_index].length);
    if(node_packets[device_id_index].length >= MAX_QUEUE_SIZE){
        node_packets[device_id_index].shift()
        //console.log("Node Packet Length After: " + node_packets[device_id_index].length);
    } 
    node_packets[device_id_index].push(json_packet)
    
    //write the packet data to a file
    fs.writeFile(json_save_path, JSON.stringify(node_packets), function(err) {
        if(err) {
            return console.log(err);
        }
        console.log("The file was saved!");
    });
}

// calculate a CRC
function calcCheckSum(packet){
    var crc_value = 0;
    for(i = 0; i < packet.length-1; i++){
        crc_value = crc_value + packet[i];
    }
    return (crc_value % 255);
}