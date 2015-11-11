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

import sys
sys.path.insert(0, "../lib")
import Leap
from Leap import CircleGesture
import json
import time

import paho.mqtt.client as paho
import ssl

ROOT_CA = "<PATH_TO_ROOT_CERT>"
CERTIFICATE = "<PATH_TO_YOUR_CERT>"
PRIVATE_KEY = "<PATH_TO_PRIVATE_KEY>"
AWS_IOT_TOPIC = "<YOUR_IOT_TOPIC>"
AWS_IOT_ENDPOINT = "<YOUR_IOT_ENDPOINT>"

'''
AWS IoT Listener sends data to AWS IoT via MQTT.
@extends Leap.Listener
'''

class AWSIoTListener(Leap.Listener):

    mqttc = None

    def on_mqtt_log(self, client, userdata, level, buf):
    	print (str(level) + ": '" + str(buf))

    def on_mqtt_connect(self, client, userdata, flags, rc):
        print("Connected with result code "+str(rc))
        self.mqttc = client

    def on_init(self, controller):
        mqttc = paho.Client()
        mqttc.tls_set(ROOT_CA, CERTIFICATE, PRIVATE_KEY, tls_version=ssl.PROTOCOL_TLSv1_2)
        mqttc.on_log = self.on_mqtt_log
        mqttc.on_connect = self.on_mqtt_connect
        mqttc.connect(AWS_IOT_ENDPOINT, 8883, 10)
        time.sleep(4)
        mqttc.loop_start()


    def on_connect(self, controller):
        controller.enable_gesture(Leap.Gesture.TYPE_CIRCLE);

    def on_frame(self, controller):

        clockwiseness = 0
        frame = controller.frame()

        # Get gestures
        for gesture in frame.gestures():
            if gesture.type == Leap.Gesture.TYPE_CIRCLE:
                circle = CircleGesture(gesture)

                # Determine clock direction using the angle between the pointable and the circle normal
                if circle.pointable.direction.angle_to(circle.normal) <= Leap.PI/2:
                    clockwiseness = 1
                else:
                    clockwiseness = 0

        if not (frame.hands.is_empty and frame.gestures().is_empty):

            xAxis = round(frame.hands[0].direction[0], 2)
            yAxis = round(frame.hands[0].arm.wrist_position[1], 2)
            zAxis = round(frame.hands[0].arm.wrist_position[2], 2)

            set_xAxis = int((600 - ((xAxis / 1.98) * 450)) - 150 )
            set_yAxis = int(375 - (100 * (yAxis / 360)))
            set_zAxis = int(275 + (((zAxis + 50) / 200) * 200))

            tev_json_obj = json.dumps({'frameId':frame.id, 'coordinates':{'xAxis':set_xAxis,'yAxis':set_yAxis, 'zAxis': set_zAxis, 'clockwiseness': clockwiseness}})
            print(tev_json_obj)

            counter = str(frame.id)
            counter = counter[-1:]
            if counter == '1' and self.mqttc != None:
                self.mqttc.publish(AWS_IOT_TOPIC, tev_json_obj, 0, False)

if __name__ == "__main__":

    # Create the AWS IoT listener and add it to the Leap Motion Controller
    aws_iot_listener = AWSIoTListener()
    controller = Leap.Controller()
    controller.add_listener(aws_iot_listener)

    print "To quit, press enter."
    try:
        sys.stdin.readline()
    except KeyboardInterrupt:
        pass
    finally:
        controller.remove_listener(aws_iot_listener)
