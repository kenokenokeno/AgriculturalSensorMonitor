# AgriculturalSensorMonitor
Use IoT Technologies to monitor plant health

README: PROJECT SET UP:
This read me document describes the set up process for my sensor module, gateway, and web application. 

Sensor Module: Used to take sensor reading of the enviroment
- Components: Arduino Mega2560, Xbee Radio, Xbee Shield, Prototyping Board, Battery, Switch, Sensors (soil moisture, light, humidity, temp)
- Programming: Arduino IDE
- File Path: Sensor-Net-Project/SensorModule/SensorModule.ini
- Power On: Flip the switch, verify that the lights turn on
- Verify Operation: Start the Network Gateway with Intel XDR, verify that packets are recieves

Network Gateway: Used to provide an interface between the sensor network and the internet. It parses the sensor data into json packets and pushes them to the network. 
- Components: Intel Edison, Xbee Radio, Xbee Shield, Level Shifter
- Programming: Intel XDR IoT Edition
- File Path: Sensor-Net-Project/WSM_Gateway
- Power On: Connect microusb port on the Edison processor to a USB wall charger
- Verify Operation: 

Web Application: Used to display sensor data, and to provide intellegent actuation of the sensor module. Receives pushed data from the gateway.
- Components: HTML, CSS, JS Files
- Programming: browser
- File Path: Sensor-Net-Project/wsn_html
- Power On: start the server from terminal: node main.js, start the webserver by going to: http://localhost:8080/ 

Set up Procedures: 
- Check the IP Address in main.js:sendHttp, verify that it matches the ip address of the computer running the webserver

TODO: STILL NEED TO FINISH THIS
