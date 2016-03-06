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
char xbee_rx_packet[100];
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
    Serial1.println(xbee_rx_packet);
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
  
  // Add a short delay
  delay(50);
}
// =====================================================================

