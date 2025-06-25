/*
 * ESP32 Washing Machine Controller
 * 
 * This sketch controls a washing machine relay via MQTT commands.
 * It connects to WiFi and subscribes to MQTT topics for control commands.
 * 
 * Hardware:
 * - ESP32 Development Board
 * - Relay Module connected to GPIO 4 (Active LOW)
 * - LED for testing (optional, same pin as relay)
 * 
 * MQTT Topics:
 * - washer/washer1/control (subscribe) - receives 'start' or 'stop' commands
 * - washer/washer1/status (publish) - sends status updates
 * 
 * Wiring:
 * - GPIO 4 -> Relay IN (Active LOW: LOW=ON, HIGH=OFF)
 * - VCC -> 3.3V or 5V (depending on relay module)
 * - GND -> GND
 */

#include <WiFi.h>
#include <PubSubClient.h>

// WiFi Configuration
const char* ssid = "TP";
const char* password = "12233344";

// MQTT Configuration
const char* mqtt_server = "broker.hivemq.com";  // Use same broker as backend
const int mqtt_port = 1883;
const char* mqtt_client_id = "ESP32_Washer_001";

// MQTT Topics
const char* control_topic = "washer/washer1/control";
const char* status_topic = "washer/washer1/status";
const char* display_topic = "washer/washer1/display";

// Hardware Configuration
const int RELAY_PIN = 4;  // GPIO 4 for relay control (Active LOW)
const int LED_PIN = 2;    // Built-in LED for status indication

// Timing Configuration
const unsigned long CYCLE_DURATION = 30 * 60 * 1000;  // 30 minutes in milliseconds
const unsigned long WIFI_TIMEOUT = 10000;             // 10 seconds WiFi connection timeout
const unsigned long MQTT_RECONNECT_DELAY = 5000;      // 5 seconds between MQTT reconnection attempts

// Global Variables
WiFiClient espClient;
PubSubClient client(espClient);
unsigned long cycleStartTime = 0;
bool cycleRunning = false;
unsigned long lastStatusUpdate = 0;
const unsigned long STATUS_UPDATE_INTERVAL = 30000;  // Send status every 30 seconds

void setup() {
  // Initialize Serial Communication
  Serial.begin(115200);
  Serial.println();
  Serial.println("=== ESP32 Washing Machine Controller ===");
  Serial.println("Version: 1.0");
  Serial.println("Machine ID: washer1");
  
  // Initialize GPIO Pins
  pinMode(RELAY_PIN, OUTPUT);
  pinMode(LED_PIN, OUTPUT);
  
  // Set relay to OFF state (HIGH for Active LOW relay)
  digitalWrite(RELAY_PIN, HIGH);
  digitalWrite(LED_PIN, LOW);
  
  Serial.println("GPIO initialized:");
  Serial.printf("  Relay Pin: %d (Active LOW)\n", RELAY_PIN);
  Serial.printf("  LED Pin: %d\n", LED_PIN);
  
  // Connect to WiFi
  setupWiFi();
  
  // Setup MQTT
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(mqttCallback);
  
  Serial.println("Setup completed successfully!");
  Serial.println("Waiting for MQTT commands...");
}

void loop() {
  // Maintain MQTT connection
  if (!client.connected()) {
    reconnectMQTT();
  }
  client.loop();
  
  // Check if cycle should be stopped (30-minute timeout)
  if (cycleRunning && (millis() - cycleStartTime >= CYCLE_DURATION)) {
    Serial.println("⏰ Cycle timeout reached (30 minutes) - Stopping cycle");
    stopCycle();
  }
  
  // Send periodic status updates
  if (millis() - lastStatusUpdate >= STATUS_UPDATE_INTERVAL) {
    sendStatusUpdate();
    lastStatusUpdate = millis();
  }
  
  // Small delay to prevent watchdog issues
  delay(100);
}

void setupWiFi() {
  Serial.printf("Connecting to WiFi: %s", ssid);
  WiFi.begin(ssid, password);
  
  unsigned long startTime = millis();
  while (WiFi.status() != WL_CONNECTED && (millis() - startTime < WIFI_TIMEOUT)) {
    delay(500);
    Serial.print(".");
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.println("✅ WiFi connected successfully!");
    Serial.printf("   IP Address: %s\n", WiFi.localIP().toString().c_str());
    Serial.printf("   Signal Strength: %d dBm\n", WiFi.RSSI());
    
    // Blink LED to indicate WiFi connection
    for (int i = 0; i < 3; i++) {
      digitalWrite(LED_PIN, HIGH);
      delay(200);
      digitalWrite(LED_PIN, LOW);
      delay(200);
    }
  } else {
    Serial.println();
    Serial.println("❌ WiFi connection failed!");
    Serial.println("   Check SSID and password");
    Serial.println("   Restarting in 10 seconds...");
    delay(10000);
    ESP.restart();
  }
}

void reconnectMQTT() {
  while (!client.connected()) {
    Serial.printf("Connecting to MQTT broker: %s:%d", mqtt_server, mqtt_port);
    
    if (client.connect(mqtt_client_id)) {
      Serial.println();
      Serial.println("✅ MQTT connected successfully!");
      
      // Subscribe to control topic
      if (client.subscribe(control_topic)) {
        Serial.printf("   Subscribed to: %s\n", control_topic);
      } else {
        Serial.printf("   ❌ Failed to subscribe to: %s\n", control_topic);
      }
      
      // Subscribe to display topic (optional)
      if (client.subscribe(display_topic)) {
        Serial.printf("   Subscribed to: %s\n", display_topic);
      }
      
      // Send initial status
      sendStatusUpdate();
      
    } else {
      Serial.printf(" ❌ MQTT connection failed (rc=%d)\n", client.state());
      Serial.printf("   Retrying in %d seconds...\n", MQTT_RECONNECT_DELAY / 1000);
      delay(MQTT_RECONNECT_DELAY);
    }
  }
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  // Convert payload to string
  String message = "";
  for (int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  
  Serial.printf("📨 MQTT message received:\n");
  Serial.printf("   Topic: %s\n", topic);
  Serial.printf("   Message: %s\n", message.c_str());
  
  // Handle control commands
  if (String(topic) == control_topic) {
    if (message == "start") {
      startCycle();
    } else if (message == "stop") {
      stopCycle();
    } else {
      Serial.printf("   ⚠️ Unknown command: %s\n", message.c_str());
    }
  }
  
  // Handle display commands (optional - for future LCD/OLED integration)
  else if (String(topic) == display_topic) {
    Serial.printf("📺 Display update: %s\n", message.c_str());
    // TODO: Parse JSON and update display if LCD/OLED is connected
  }
}

void startCycle() {
  if (cycleRunning) {
    Serial.println("⚠️ Cycle already running - ignoring start command");
    return;
  }
  
  Serial.println("🚀 Starting washing cycle...");
  
  // Turn ON relay (LOW for Active LOW relay)
  digitalWrite(RELAY_PIN, LOW);
  digitalWrite(LED_PIN, HIGH);  // Turn on LED to indicate cycle running
  
  // Record cycle start time
  cycleStartTime = millis();
  cycleRunning = true;
  
  Serial.println("✅ Washing cycle started!");
  Serial.printf("   Relay: ON (GPIO %d = LOW)\n", RELAY_PIN);
  Serial.printf("   Duration: %d minutes\n", CYCLE_DURATION / 60000);
  
  // Send status update
  client.publish(status_topic, "running", true);  // Retained message
  
  // Blink LED rapidly to confirm start
  for (int i = 0; i < 5; i++) {
    digitalWrite(LED_PIN, LOW);
    delay(100);
    digitalWrite(LED_PIN, HIGH);
    delay(100);
  }
}

void stopCycle() {
  if (!cycleRunning) {
    Serial.println("⚠️ No cycle running - ignoring stop command");
    return;
  }
  
  Serial.println("🛑 Stopping washing cycle...");
  
  // Turn OFF relay (HIGH for Active LOW relay)
  digitalWrite(RELAY_PIN, HIGH);
  digitalWrite(LED_PIN, LOW);  // Turn off LED
  
  // Calculate cycle duration
  unsigned long cycleDuration = millis() - cycleStartTime;
  cycleRunning = false;
  
  Serial.println("✅ Washing cycle stopped!");
  Serial.printf("   Relay: OFF (GPIO %d = HIGH)\n", RELAY_PIN);
  Serial.printf("   Cycle duration: %lu minutes %lu seconds\n", 
                cycleDuration / 60000, (cycleDuration % 60000) / 1000);
  
  // Send status update
  client.publish(status_topic, "stopped", true);  // Retained message
}

void sendStatusUpdate() {
  if (!client.connected()) return;
  
  // Create status message
  String status = cycleRunning ? "running" : "idle";
  String statusMessage = "{";
  statusMessage += "\"status\":\"" + status + "\",";
  statusMessage += "\"machine_id\":\"washer1\",";
  statusMessage += "\"uptime\":" + String(millis() / 1000) + ",";
  statusMessage += "\"wifi_rssi\":" + String(WiFi.RSSI()) + ",";
  statusMessage += "\"free_heap\":" + String(ESP.getFreeHeap());
  
  if (cycleRunning) {
    unsigned long elapsed = millis() - cycleStartTime;
    unsigned long remaining = (elapsed < CYCLE_DURATION) ? (CYCLE_DURATION - elapsed) : 0;
    statusMessage += ",\"cycle_elapsed\":" + String(elapsed / 1000);
    statusMessage += ",\"cycle_remaining\":" + String(remaining / 1000);
  }
  
  statusMessage += "}";
  
  // Publish status
  if (client.publish(status_topic, statusMessage.c_str())) {
    Serial.printf("📤 Status update sent: %s\n", status.c_str());
  }
}
