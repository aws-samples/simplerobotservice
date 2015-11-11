'''
Copyright 2014-2015 Amazon.com, Inc. or its affiliates. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance with the License. A copy of the License is located at

    http://aws.amazon.com/apache2.0/

or in the "license" file accompanying this file. This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

Note: Other license terms may apply to certain, identified software files contained within or
distributed with the accompanying software if such terms are included in the directory containing
the accompanying software. Such other license terms will then apply in lieu of the terms of the
software license above.
'''

import paho.mqtt.client as paho
import ssl
import ast
from Adafruit_PWM_Servo_Driver import PWM
import json
import schedule, time

pins = {
    "xAxis": 0,
    "yAxis": 1,
    "zAxis": 2,
    "head": 3,
    "rightEye": 8,
    "leftEye": 9
}

ROOT_CA = "<PATH_TO_ROOT_CERT>"
CERTIFICATE = "<PATH_TO_YOUR_CERT>"
PRIVATE_KEY = "<PATH_TO_PRIVATE_KEY>"
AWS_IOT_TOPIC = "<YOUR_IOT_TOPIC>"
AWS_IOT_ENDPOINT = "<YOUR_IOT_ENDPOINT>"

var_payload = ''

# Default active flag is false.
active = False

# Initialise the PWM device using the default address
pwm = PWM(0x40)

# Note if you'd like more debug output you can instead run:
# pwm = PWM(0x40, debug=True)

pwm.setPWMFreq(60)  # Set frequency to 60 Hz.

'''
This function sets the servo pulse and channel.
'''
def set_servo_pulse(channel, pulse):
    pulseLength = 1000000                   # 1,000,000 us per second
    pulseLength /= 60                       # 60 Hz
    print "%d us per period" % pulseLength
    pulseLength /= 4096                     # 12 bits of resolution
    print "%d us per bit" % pulseLength
    pulse *= 1000
    pulse /= pulseLength
    pwm.setPWM(channel, 0, pulse)

'''
This function is invoked when the mqtt client makes a successful connection. It subscribes the client to the AWS IoT Topic.
@param client The MQTT Client
@param userdata
@param flags
@param rc The result code
'''
def on_connect(client, userdata, flags, rc):
    print("Connected with result code "+str(rc))
    client.subscribe(AWS_IOT_TOPIC)

'''
This function is invoked when a new message is received by the MQTT client. It sets the servo values to the values received from AWS IoT.
@param client The MQTT Client
@param userdata
@param msg The message that was recieved.
'''
def on_message(client, userdata, msg):

    print(msg.topic+" "+str(msg.payload))

    # Message received! Wake up!
    active = True

    # The message is in JSON format
    tev_json_obj = json.loads(msg.payload)

    pwm.setPWM(pins["xAxis"], 0, tev_json_obj["coordinates"]["xAxis"])
    pwm.setPWM(pins["yAxis"], 0, tev_json_obj["coordinates"]["yAxis"])
    pwm.setPWM(pins["zAxis"], 0, tev_json_obj["coordinates"]["zAxis"])

    pwm.setPWM(pins["rightEye"], 600)
    pwm.setPWM(pins["leftEye"], 600)

    if tev_json_obj["coordinates"]['clockwiseness'] == 0:
        print('tapStatus is counterclockwise')
        pwm.setPWM(pins["head"], 0, 200)
    if tev_json_obj["coordinates"]['clockwiseness'] == 1:
        print('tapStatus is clockwise')
        pwm.setPWM(pins["head"], 0, 500)

def go_to_sleep(active):

    if (active):
        print("Still active... I'm Awake!");
        active = False
    else:
        print("Not active... Sleeping...");
        pwm.setPWM(pins["xAxis"], 0, 0)
        pwm.setPWM(pins["yAxis"], 0, 0)
        pwm.setPWM(pins["zAxis"], 0, 0)
        pwm.setPWM(pins["rightEye"], 4, 0)
        pwm.setPWM(pins["leftEye"], 5, 0)

# The main application runs the Paho MQTT Client
if __name__ == "__main__":

    mqttc = paho.Client()
    mqttc.on_connect = on_connect
    mqttc.on_message = on_message
    mqttc.tls_set(ROOT_CA, CERTIFICATE, PRIVATE_KEY, tls_version=ssl.PROTOCOL_TLSv1_2)
    mqttc.connect(AWS_IOT_ENDPOINT, 8883, 10)
    mqttc.loop_start()

    schedule.every(0.1).minutes.do(lambda: go_to_sleep(active));

    while True:
        schedule.run_pending()
        time.sleep(1)
