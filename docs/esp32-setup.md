# ESP32 Washing Machine Controller Setup Guide

This guide will help you set up the ESP32 controller for the washing machine control system.

## 📋 Table of Contents

1. [Hardware Requirements](#hardware-requirements)
2. [Software Requirements](#software-requirements)
3. [Arduino IDE Setup](#arduino-ide-setup)
4. [Hardware Wiring](#hardware-wiring)
5. [Code Upload](#code-upload)
6. [MQTT Broker Setup](#mqtt-broker-setup)
7. [Testing](#testing)
8. [Troubleshooting](#troubleshooting)

## 🔧 Hardware Requirements

### Essential Components
- **ESP32 Development Board** (ESP32-WROOM-32 or similar)
- **Relay Module** (5V or 3.3V, Active LOW recommended)
- **Jumper Wires** (Male-to-Male and Male-to-Female)
- **Breadboard** (optional, for prototyping)
- **LED** (for testing, optional)
- **Resistor** (220Ω for LED, optional)

### For Production
- **Washing Machine** with electrical control interface
- **Proper electrical enclosure**
- **Fuses and safety components**
- **Professional electrical installation**

## 💻 Software Requirements

- **Arduino IDE** (version 1.8.19 or later) or **Arduino IDE 2.0**
- **ESP32 Board Package**
- **PubSubClient Library**
- **WiFi Library** (included with ESP32 package)

## 🛠 Arduino IDE Setup

### Step 1: Install Arduino IDE
1. Download Arduino IDE from [arduino.cc](https://www.arduino.cc/en/software)
2. Install and launch the IDE

### Step 2: Add ESP32 Board Support
1. Open Arduino IDE
2. Go to **File** → **Preferences**
3. In "Additional Board Manager URLs", add:
   ```
   https://dl.espressif.com/dl/package_esp32_index.json
   ```
4. Click **OK**
5. Go to **Tools** → **Board** → **Boards Manager**
6. Search for "ESP32" and install **ESP32 by Espressif Systems**

### Step 3: Install Required Libraries
1. Go to **Tools** → **Manage Libraries**
2. Search and install the following libraries:
   - **PubSubClient** by Nick O'Leary (version 2.8 or later)
   - **ArduinoJson** by Benoit Blanchon (optional, for advanced features)

### Step 4: Select Board and Port
1. Connect your ESP32 to your computer via USB
2. Go to **Tools** → **Board** → **ESP32 Arduino** → **ESP32 Dev Module**
3. Go to **Tools** → **Port** and select the appropriate COM port (Windows) or /dev/tty* (Mac/Linux)

## 🔌 Hardware Wiring

### Basic Wiring (for Testing with LED)
```
ESP32 Pin    →    Component
GPIO 4       →    LED Anode (through 220Ω resistor)
GND          →    LED Cathode
GPIO 2       →    Built-in LED (status indicator)
```

### Relay Module Wiring
```
ESP32 Pin    →    Relay Module
GPIO 4       →    IN (Signal Input)
3.3V or 5V   →    VCC (Power)
GND          →    GND (Ground)
```

### Relay to Washing Machine (⚠️ Professional Installation Required)
```
Relay Module    →    Washing Machine
COM (Common)    →    Live Wire (L)
NO (Normally Open) → Machine Control Input
```

**⚠️ WARNING**: Working with mains electricity is dangerous. Always consult a qualified electrician for washing machine connections.

## 📤 Code Upload

### Step 1: Open the Sketch
1. Open `src/esp32/washer.ino` in Arduino IDE
2. Review the configuration section at the top of the file

### Step 2: Configure WiFi Settings
Update these lines in the code:
```cpp
const char* ssid = "TP";           // Your WiFi network name
const char* password = "12233344"; // Your WiFi password
```

### Step 3: Configure MQTT Broker
Update the MQTT server if needed:
```cpp
const char* mqtt_server = "broker.hivemq.com";  // Public broker for testing
// For local broker: const char* mqtt_server = "192.168.1.100";
```

### Step 4: Upload the Code
1. Click the **Upload** button (→) in Arduino IDE
2. Wait for compilation and upload to complete
3. Open **Serial Monitor** (Tools → Serial Monitor)
4. Set baud rate to **115200**
5. Press the **Reset** button on ESP32 to see startup messages

## 🌐 MQTT Broker Setup

### Option 1: Use Public Broker (Testing Only)
The code is pre-configured to use `broker.hivemq.com` for testing.

**Pros**: No setup required
**Cons**: Not secure, not reliable for production

### Option 2: Local Mosquitto Broker (Recommended)

#### Install Mosquitto (Windows)
1. Download from [mosquitto.org](https://mosquitto.org/download/)
2. Install and start the service
3. Update ESP32 code with your local IP address

#### Install Mosquitto (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install mosquitto mosquitto-clients
sudo systemctl start mosquitto
sudo systemctl enable mosquitto
```

#### Install Mosquitto (macOS)
```bash
brew install mosquitto
brew services start mosquitto
```

### Option 3: Cloud MQTT Service
Consider services like:
- **AWS IoT Core**
- **Google Cloud IoT**
- **Azure IoT Hub**
- **HiveMQ Cloud**

## 🧪 Testing

### Step 1: Verify Serial Output
After uploading, you should see:
```
=== ESP32 Washing Machine Controller ===
Version: 1.0
Machine ID: washer1
Connecting to WiFi: TP.....
✅ WiFi connected successfully!
   IP Address: 192.168.1.100
✅ MQTT connected successfully!
   Subscribed to: washer/washer1/control
Setup completed successfully!
Waiting for MQTT commands...
```

### Step 2: Test MQTT Commands
Use an MQTT client to send test commands:

#### Using mosquitto_pub (Command Line)
```bash
# Start cycle
mosquitto_pub -h broker.hivemq.com -t "washer/washer1/control" -m "start"

# Stop cycle
mosquitto_pub -h broker.hivemq.com -t "washer/washer1/control" -m "stop"
```

#### Using MQTT Explorer (GUI)
1. Download MQTT Explorer
2. Connect to your MQTT broker
3. Publish to topic: `washer/washer1/control`
4. Send message: `start` or `stop`

### Step 3: Verify Relay Operation
- **Start Command**: GPIO 4 should go LOW, LED should turn ON
- **Stop Command**: GPIO 4 should go HIGH, LED should turn OFF
- **Auto-Stop**: After 30 minutes, cycle should stop automatically

### Step 4: Test with Backend
1. Start your Node.js backend server
2. Use the mobile app to book a slot and start a cycle
3. Verify ESP32 receives commands and controls the relay

## 🔧 Environment Variables

Update your backend `.env` file:
```env
# MQTT Configuration
MQTT_BROKER=mqtt://broker.hivemq.com
MOCK_MQTT=false

# For local broker:
# MQTT_BROKER=mqtt://localhost:1883
# MQTT_BROKER=mqtt://192.168.1.100:1883
```

## 🐛 Troubleshooting

### WiFi Connection Issues
- **Check SSID and password** in the code
- **Verify WiFi signal strength** at ESP32 location
- **Try different WiFi network** (avoid enterprise networks with complex authentication)

### MQTT Connection Issues
- **Check broker URL** and port (usually 1883 for non-SSL)
- **Verify network connectivity** to broker
- **Check firewall settings** on your router/computer
- **Try public broker first** (broker.hivemq.com) for testing

### Relay Not Working
- **Check wiring** connections
- **Verify relay module type** (Active HIGH vs Active LOW)
- **Test with multimeter** to verify GPIO output
- **Check power supply** to relay module

### Serial Monitor Issues
- **Correct baud rate**: Set to 115200
- **Check USB cable**: Use data cable, not charge-only
- **Driver issues**: Install ESP32 USB drivers if needed
- **Port selection**: Ensure correct COM port is selected

### Backend Integration Issues
- **Check MQTT broker** is the same in both ESP32 and backend
- **Verify topic names** match exactly
- **Check backend logs** for MQTT connection status
- **Test MQTT independently** before integrating

## 🔒 Security Considerations

### For Production Use
1. **Use secure MQTT** (TLS/SSL encryption)
2. **Implement authentication** (username/password or certificates)
3. **Use private MQTT broker** (not public brokers)
4. **Secure WiFi network** (WPA2/WPA3)
5. **Regular firmware updates**
6. **Professional electrical installation**

### Example Secure Configuration
```cpp
// Use secure MQTT broker
const char* mqtt_server = "your-secure-broker.com";
const int mqtt_port = 8883;  // SSL port

// Add authentication
const char* mqtt_username = "your_username";
const char* mqtt_password = "your_password";
```

## 📞 Support

If you encounter issues:
1. Check the **Serial Monitor** output for error messages
2. Verify all **wiring connections**
3. Test with **simple MQTT client** first
4. Check **network connectivity**
5. Review **troubleshooting section** above

For additional help, consult:
- ESP32 documentation
- PubSubClient library documentation
- Arduino IDE troubleshooting guides
