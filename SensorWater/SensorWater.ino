 /**
 * Name: Ken Oyadomari
 * Email: ken.y.oyadomari@gmail.com
 * School: San Jose State University
 * Date: Oct 2015
 * Info: Argriculture Sensor Module Project
 */
#include<stdlib.h>
#include <Wire.h>
#include <Adafruit_MotorShield.h>
#include "utility/Adafruit_MS_PWMServoDriver.h"

// init an empty xbee packets
char xbee_tx_packet[100];
char xbee_rx_packet[100];
// set the duty cycle of the packets
double sensorModuleDutyCycle = 60000;
// set the device id of the sensor module
char sensorModuleID = '2';
// init the ADC pins
int soilMoisturePin = A0;
// Create the motor shield object with the default I2C address
Adafruit_MotorShield AFMS = Adafruit_MotorShield(); 
// Select which 'port' M1, M2, M3 or M4. In this case, M1
Adafruit_DCMotor *myMotor = AFMS.getMotor(1);
// pin used for water control
int WATER_CONTROL_PIN = 52;
int WATER_CONTROL_STATE = 0;

void setup() {
  // init the consule serial communication
  Serial1.begin(9600);
  // init the Zigbee serial communication
  Serial.begin(9600);
  // set up the motor control output
  pinMode(WATER_CONTROL_PIN, OUTPUT);
  // init the motor shield interface
  AFMS.begin();
  myMotor->run(FORWARD);
  myMotor->setSpeed(0);
  Serial1.println("Sensor Water Node Controller Starting. . .");
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
    // process the get new data command
    if(String(xbee_rx_packet).indexOf("GetNewData") >=0) {
      cmd_received = 1;
      Serial1.println("GET NEW DATA COMMAND !");
    }
    // process the turn water ON command
    if(String(xbee_rx_packet).indexOf("TurnOnWater") >=0) {
      Serial.println("TurnOnWaterACK");
      Serial1.println("TURN ON THE WATER !");
      digitalWrite(WATER_CONTROL_PIN, HIGH);
      myMotor->setSpeed(100);  
      WATER_CONTROL_STATE = 1;
    }
    // process the turn water OFF command
    else if(String(xbee_rx_packet).indexOf("TurnOffWater") >=0) {
      Serial.println("TurnOffWaterACK");
      Serial1.println("TURN OFF THE WATER !");
      digitalWrite(WATER_CONTROL_PIN, LOW);
      myMotor->setSpeed(0);  
      WATER_CONTROL_STATE = 0;
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
  
  // Get the soil moisture content
  int soil_moisture = analogRead(soilMoisturePin);
  Serial1.write("[Soil Moisture] Level: ");
  Serial1.println(soil_moisture);

  String Tag      = "KENO";
  String Clock    = String(millis());
  String Moisture = String(soil_moisture);

  String Packet = Tag + 
                  ",@" + sensorModuleID + 
                  ",C" + Clock;
  Packet = Packet + ",M" + Moisture;
  Packet = Packet + ",W" + String(WATER_CONTROL_STATE) + ",";
  
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


