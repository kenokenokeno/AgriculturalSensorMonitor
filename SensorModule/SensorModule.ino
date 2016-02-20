 /**
 * Name: Ken Oyadomari
 * Email: ken.y.oyadomari@gmail.com
 * School: San Jose State University
 * Date: Oct 2015
 * Info: Argriculture Sensor Module Project
 */
#include<stdlib.h>
#include <BMP180.h>
#include <Wire.h>
#include "HTU21D.h"

// init the pressure driver
SFE_BMP180 pressure;
// intit the humidity driver
HTU21D myHumidity;
// init the ADC pins
int temt6000Pin = A1;
int soilMoisturePin = A0;
// init an empty xbee packets
char xbee_tx_packet[100];
char xbee_rx_packet[100];
// set the duty cycle of the packets
double sensorModuleDutyCycle = 60000;
// set the device id of the sensor module
char sensorModuleID = '1';


void setup() {
  // init the consule serial communication
  Serial1.begin(9600);
  // init the Zigbee serial communication
  Serial.begin(9600);
  // start the BMP180 pressure sensor
  pressure.begin();
  // start the HTV21D humidity sensor
  myHumidity.begin();
}


// init variables for LOOP
double last_sent_time = millis();
bool cmd_received = 0;

// ==[ LOOP ]=========================================================
void loop() {
  
  // Check if any commands were recieved
  int index = 0;
  while (Serial.available() > 0 && index <= sizeof(xbee_rx_packet)) {
    if(index == 0){
      //delay on the first loop
      delay(15);
    }
    xbee_rx_packet[index] = Serial.read(); 
    index++;
    xbee_rx_packet[index] = '\0'; // Null terminate the string
  }

  // If data was read process the command
  if(index > 0){
    Serial1.print("\nRX DATA: " );
    Serial1.println(xbee_rx_packet);
    if(String(xbee_rx_packet).indexOf("GetNewData") >=0) {
      cmd_received = 1;
      Serial1.println("COMMAND RECEIVED !");
    }
    //reset the xbee rx string
    for(int i = 0; i < sizeof(xbee_rx_packet); i++){
      xbee_rx_packet[i] = 0;
    }
  }
  
  // Check if the duty cycle time expired or cmd received
  if(((millis() - last_sent_time) >= sensorModuleDutyCycle) || cmd_received) {
    // Set command received to false
    cmd_received = 0;
    
    // Get a new Sensor Packet
    getSensorPacket(xbee_tx_packet);
  
    // Send Xbee Packet
    Serial.print(xbee_tx_packet);

    // Update the last_sent_time
    last_sent_time = millis();
  }
  // Add a short delay
  delay(50);
}
// =====================================================================


// return a packet with updated sensor values
void getSensorPacket(char *xbee_packet){
  // Get the time (max millis 4294967296, 49 days and 17 hr)
  Serial1.print("\nSensor Module\n[SysTime] Millis: ");
  Serial1.println(millis());
  
  // Get a BMP180 pressure:
  float bmp180_temp, bmp180_pressure;
  double T,P;
  pressure.getPressure(P);
  bmp180_pressure = (float)P;
  Serial1.print("[BMP180] Pressure: ");
  Serial1.print(bmp180_pressure);
  Serial1.println(" mbar");
  pressure.getTemperature(T);
  bmp180_temp = (float)T;
  Serial1.print("[BMP180] Temp: ");
  Serial1.print(bmp180_temp);
  Serial1.println(" C");

  // Get the HTV21D Humidity
  float htv21d_humd = myHumidity.readHumidity();
  float htv21d_temp = myHumidity.readTemperature();
  Serial1.print("[HTV21D] Temp: ");
  Serial1.print(htv21d_temp);
  Serial1.println(" C");
  Serial1.print("[HTV21D] Humidity: ");
  Serial1.print(htv21d_humd);
  Serial1.println("%");

  // Get the TEMT6000 Temperature
  int temt6000_light = analogRead(temt6000Pin);
  Serial1.print("[TEMT6000] Light: ");
  Serial1.println(temt6000_light);

  // Get the soil moisture content
  int soil_moisture = analogRead(soilMoisturePin);
  Serial1.write("[Soil Moisture] Level: ");
  Serial1.println(soil_moisture);
  
  /* Sensor Module Data Packet Structure
   *  
   *  Overview:
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
   *  
   *  Example:
   *  KENO:C12345678,P1014.7,T23.7,T22.5,H74.4,L512,M32*
   */
  String Tag      = "KENO";
  String Clock    = String(millis());
  String Pressure = String(bmp180_pressure);
  String Temp1    = String(bmp180_temp);
  String Humidity = String(htv21d_humd);
  String Temp2    = String(htv21d_temp);
  String Light    = String(temt6000_light);
  String Moisture = String(soil_moisture);

  String Packet = Tag + 
                    ",@" + sensorModuleID + 
                    ",C" + Clock +
                    ",P" + Pressure + 
                    ",T" + Temp1 +
                    ",H" + Humidity +
                    ",T" + Temp2 +
                    ",L" + Light +
                    ",M" + Moisture + ",";
  int crc_value = checkSum(Packet, Packet.length());
  String SendPacket = Packet + char(crc_value) + '\0';
  SendPacket.toCharArray(xbee_packet, SendPacket.length());
}

// Calculate a small checksum
int checkSum(String packet, int packet_len){
  int crc_value = 0;
  for(int i = 0; i < packet_len; i++){
    crc_value = crc_value + packet[i];
  }
  return (crc_value % 255);
}


