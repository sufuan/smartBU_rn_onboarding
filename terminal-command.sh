# Using mosquitto_pub (install it first if needed)
mosquitto_pub -h broker.hivemq.com -t "washer/washer1/control" -m "stop"
# Wait a few seconds
mosquitto_pub -h broker.hivemq.com -t "washer/washer1/control" -m "start"