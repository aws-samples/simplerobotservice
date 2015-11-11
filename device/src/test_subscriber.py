#!/usr/bin/env python

import paho.mqtt.client as mqtt
import ssl

ROOT_CA = "<PATH_TO_ROOT_CERT>"
CERTIFICATE = "<PATH_TO_YOUR_CERT>"
PRIVATE_KEY = "<PATH_TO_PRIVATE_KEY>"
AWS_IOT_TOPIC = "<YOUR_IOT_TOPIC>"
AWS_IOT_ENDPOINT = "<YOUR_IOT_ENDPOINT>"

def on_connect(client, userdata, flags, rc):
	print("Connected with result code "+str(rc))
	client.subscribe(AWS_IOT_TOPIC)

def on_message(client, userdata, msg):
	print(msg.topic+" "+str(msg.payload))

client = mqtt.Client()
client.on_connect = on_connect
client.tls_set(ROOT_CA,
			   CERTIFICATE,
			   PRIVATE_KEY,
				tls_version=ssl.PROTOCOL_TLSv1_2)

client.on_message = on_message

client.connect(AWS_IOT_ENDPOINT, 8883, 10)

client.loop_forever()
