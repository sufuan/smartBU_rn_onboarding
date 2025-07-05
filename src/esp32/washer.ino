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
 * - washer/WASHER-001/control (subscribe) - receives 'start' or 'stop' commands
 * - washer/WASHER-001/status (publish) - sends status updates
 *
 * Wiring:
 * - GPIO 4 -> Relay IN (Active LOW: LOW=ON, HIGH=OFF)
 * - VCC -> 3.3V or 5V (depending on relay module)
 * - GND -> GND
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <WiFiClientSecure.h>
#include <time.h>

// WiFi Configuration
const char* ssid = "TP";
const char* password = "12233344";

// MQTT Configuration - HiveMQ Cloud with TLS and Authentication
const char* mqtt_server = "4f71cefb95804d629f86f0389c391427.s1.eu.hivemq.cloud";
const int mqtt_port = 8883;  // TLS port for secure connection
const char* mqtt_username = "abu_sufian";      // MQTT username
const char* mqtt_password = "Grameenphne1400"; // MQTT password

// MQTT Quality of Service and Timing
const int MQTT_QOS = 1;                    // QoS 1 for guaranteed delivery
const int MQTT_KEEP_ALIVE_TIME = 15;       // 15 seconds keep-alive (faster than default 60s)
const int MQTT_SOCKET_TIMEOUT_SEC = 5;     // 5 seconds socket timeout

// MQTT Topics - Fixed for WASHER-001
const char* control_topic = "washer/WASHER-001/control";
const char* status_topic = "washer/WASHER-001/status";
const char* display_topic = "washer/WASHER-001/display";
const char* mqtt_client_id = "ESP32_Washer_001";

// Hardware Configuration
const int RELAY_PIN = 4;  // GPIO 4 for relay control (Active LOW)
const int LED_PIN = 2;    // Built-in LED for status indication

// Timing Configuration
const unsigned long CYCLE_DURATION = 30 * 60 * 1000;  // 30 minutes in milliseconds
const unsigned long WIFI_TIMEOUT = 10000;             // 10 seconds WiFi connection timeout
const unsigned long MQTT_PING_INTERVAL = 5000;        // 5 seconds between MQTT pings (faster response)

// MQTT Retry Configuration - Exponential Backoff
const int MAX_MQTT_RECONNECT_ATTEMPTS = 10;           // Increased for better reliability
const unsigned long BASE_RECONNECT_DELAY = 1000;     // Start with 1 second
const unsigned long MAX_RECONNECT_DELAY = 30000;     // Max 30 seconds

// Global Variables - Updated for secure connection
WiFiClientSecure espClient;  // Use secure client for TLS/SSL
PubSubClient client(espClient);
unsigned long cycleStartTime = 0;
unsigned long slotEndTime = 0;  // When the slot expires (Unix timestamp in seconds)
bool cycleRunning = false;
bool hasSlotEndTime = false;    // Whether we received a slot end time
unsigned long lastStatusUpdate = 0;
unsigned long lastMqttPing = 0;
const unsigned long STATUS_UPDATE_INTERVAL = 5000;   // Send status every 5 seconds (faster)

// MQTT Retry Variables
int mqttReconnectAttempts = 0;
unsigned long lastReconnectAttempt = 0;

// NTP Time configuration
const char* ntpServer = "pool.ntp.org";
const long gmtOffset_sec = 0;     // GMT offset in seconds (0 for UTC)
const int daylightOffset_sec = 0; // Daylight offset in seconds

void setup() {
  // Initialize Serial Communication
  Serial.begin(115200);
  Serial.println();
  Serial.println("=== ESP32 Washing Machine Controller ===");
  Serial.println("Version: 1.0");
  Serial.println("Machine ID: WASHER-001");
  
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

  // Initialize time
  configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);
  Serial.println("⏰ Time synchronization started");

  // Setup secure MQTT connection optimized for fast response
  espClient.setInsecure();  // For testing - in production, use proper certificate validation
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(mqttCallback);
  client.setKeepAlive(10);        // Very fast keep-alive (10 seconds)
  client.setSocketTimeout(3);     // Very fast socket timeout (3 seconds)
  client.setBufferSize(1024);     // Increase buffer for faster processing

  Serial.println("Setup completed successfully!");
  Serial.println("Waiting for MQTT commands...");
}

// Calculate exponential backoff delay with jitter
unsigned long calculateBackoffDelay(int attempts) {
  // Exponential backoff: 2^attempt * baseDelay, with jitter
  unsigned long exponentialDelay = min(
    BASE_RECONNECT_DELAY * (1UL << (attempts - 1)), // 2^(attempts-1)
    MAX_RECONNECT_DELAY
  );

  // Add random jitter (±20%) to avoid thundering herd
  long jitter = (long)(exponentialDelay * 0.2 * (random(-100, 101) / 100.0));
  unsigned long finalDelay = max((long)exponentialDelay + jitter, 1000L); // Minimum 1 second

  return finalDelay;
}

void loop() {
  // Process MQTT messages first (highest priority for fast response)
  client.loop();

  // Maintain MQTT connection
  if (!client.connected()) {
    Serial.println("⚠️ MQTT disconnected - reconnecting...");
    reconnectMQTT();
  }

  // Send periodic status updates (faster response)
  if (millis() - lastStatusUpdate > STATUS_UPDATE_INTERVAL) {
    sendStatusUpdate();
    lastStatusUpdate = millis();
  }

  // Send periodic MQTT pings to keep connection alive
  if (millis() - lastMqttPing >= MQTT_PING_INTERVAL) {
    if (client.connected()) {
      Serial.println("📡 Sending MQTT ping to maintain connection");
      client.publish("washer/WASHER-001/ping", "alive", false);
    }
    lastMqttPing = millis();
  }

  // Check if cycle should be stopped (slot expiration or 30-minute timeout)
  if (cycleRunning) {
    bool shouldStop = false;
    String stopReason = "";

    // Check slot expiration first (if we have slot end time)
    if (hasSlotEndTime) {
      time_t now;
      time(&now);
      if (now > 0 && (unsigned long)now >= slotEndTime) {
        shouldStop = true;
        stopReason = "Slot expired";
      }
    }

    // Check 30-minute timeout as fallback
    if (!shouldStop && (millis() - cycleStartTime >= CYCLE_DURATION)) {
      shouldStop = true;
      stopReason = "30-minute timeout";
    }

    if (shouldStop) {
      Serial.printf("⏰ %s - Stopping cycle\n", stopReason.c_str());
      stopCycle();
    }
  }

  // Send periodic status updates
  if (millis() - lastStatusUpdate >= STATUS_UPDATE_INTERVAL) {
    sendStatusUpdate();
    lastStatusUpdate = millis();
  }

  // Shorter delay for more responsive MQTT processing
  delay(50);
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
  // Check if we should attempt reconnection (avoid too frequent attempts)
  unsigned long currentTime = millis();
  if (mqttReconnectAttempts > 0 && (currentTime - lastReconnectAttempt) < calculateBackoffDelay(mqttReconnectAttempts)) {
    return; // Too soon to retry
  }

  if (mqttReconnectAttempts >= MAX_MQTT_RECONNECT_ATTEMPTS) {
    Serial.printf("❌ Failed to connect to MQTT after %d attempts - restarting ESP32\n", MAX_MQTT_RECONNECT_ATTEMPTS);
    delay(5000);
    ESP.restart();
    return;
  }

  mqttReconnectAttempts++;
  lastReconnectAttempt = currentTime;

  unsigned long backoffDelay = calculateBackoffDelay(mqttReconnectAttempts);
  Serial.printf("🔄 MQTT connection attempt %d/%d to %s:%d (next retry in %lums)\n",
                mqttReconnectAttempts, MAX_MQTT_RECONNECT_ATTEMPTS, mqtt_server, mqtt_port, backoffDelay);

  // Use unique client ID with timestamp to avoid conflicts
  String clientId = String(mqtt_client_id) + "_" + String(millis());

  // Connect with authentication
  if (client.connect(clientId.c_str(), mqtt_username, mqtt_password)) {
    Serial.println("✅ MQTT connected successfully!");

    // Subscribe to control topic with QoS 1
    if (client.subscribe(control_topic, MQTT_QOS)) {
      Serial.printf("   ✅ Subscribed to: %s (QoS %d)\n", control_topic, MQTT_QOS);
    } else {
      Serial.printf("   ❌ Failed to subscribe to: %s\n", control_topic);
    }

    // Subscribe to display topic with QoS 1
    if (client.subscribe(display_topic, MQTT_QOS)) {
      Serial.printf("   ✅ Subscribed to: %s (QoS %d)\n", display_topic, MQTT_QOS);
    }

    // Send initial status
    sendStatusUpdate();

    // Reset attempt counter on successful connection
    mqttReconnectAttempts = 0;

  } else {
    Serial.printf("❌ MQTT connection failed (rc=%d)\n", client.state());
    Serial.printf("   Will retry in %lums with exponential backoff\n", backoffDelay);
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
    // Check if it's a JSON command (starts with '{')
    if (message.startsWith("{")) {
      // Parse JSON command
      if (message.indexOf("\"action\":\"start\"") > 0) {
        // Extract slot end time if present
        int slotEndIndex = message.indexOf("\"slotEndTime\":\"");
        if (slotEndIndex > 0) {
          int startQuote = slotEndIndex + 15; // Length of "slotEndTime":"
          int endQuote = message.indexOf("\"", startQuote);
          if (endQuote > startQuote) {
            String slotEndTimeStr = message.substring(startQuote, endQuote);
            Serial.printf("🕐 Slot end time received: %s\n", slotEndTimeStr.c_str());

            // Convert ISO string to Unix timestamp (simplified)
            // Note: This is a basic implementation. For production, use a proper JSON parser
            slotEndTime = parseISOToUnix(slotEndTimeStr);
            hasSlotEndTime = (slotEndTime > 0);

            if (hasSlotEndTime) {
              Serial.printf("✅ Slot end time set: %lu (Unix timestamp)\n", slotEndTime);
            }
          }
        }
        startCycle();
      } else if (message.indexOf("\"action\":\"stop\"") > 0) {
        stopCycle();
      }
    }
    // Handle simple string commands (backward compatibility)
    else if (message == "start") {
      hasSlotEndTime = false; // No slot end time provided
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

// Simple ISO 8601 to Unix timestamp converter
// Format: "2025-06-25T20:30:00.000Z"
unsigned long parseISOToUnix(String isoString) {
  // This is a simplified parser. For production, use a proper library
  // Extract year, month, day, hour, minute, second
  if (isoString.length() < 19) return 0;

  int year = isoString.substring(0, 4).toInt();
  int month = isoString.substring(5, 7).toInt();
  int day = isoString.substring(8, 10).toInt();
  int hour = isoString.substring(11, 13).toInt();
  int minute = isoString.substring(14, 16).toInt();
  int second = isoString.substring(17, 19).toInt();

  // Simple Unix timestamp calculation (approximate)
  // This is basic - for production use a proper time library
  unsigned long timestamp = 0;

  // Years since 1970
  for (int y = 1970; y < year; y++) {
    timestamp += (y % 4 == 0 && (y % 100 != 0 || y % 400 == 0)) ? 366 : 365;
  }

  // Days in months for current year
  int daysInMonth[] = {31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31};
  if (year % 4 == 0 && (year % 100 != 0 || year % 400 == 0)) {
    daysInMonth[1] = 29; // Leap year
  }

  for (int m = 1; m < month; m++) {
    timestamp += daysInMonth[m - 1];
  }

  timestamp += (day - 1); // Days
  timestamp = timestamp * 24 * 60 * 60; // Convert to seconds
  timestamp += hour * 3600 + minute * 60 + second; // Add time

  return timestamp;
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
  Serial.printf("   Max Duration: %d minutes\n", CYCLE_DURATION / 60000);

  if (hasSlotEndTime) {
    time_t now;
    time(&now);
    if (now > 0) {
      unsigned long remainingSeconds = (slotEndTime > (unsigned long)now) ? (slotEndTime - (unsigned long)now) : 0;
      Serial.printf("   Slot expires in: %lu minutes %lu seconds\n",
                    remainingSeconds / 60, remainingSeconds % 60);
    }
    Serial.printf("   Slot end time: %lu (Unix timestamp)\n", slotEndTime);
  } else {
    Serial.println("   Using 30-minute default timeout");
  }

  Serial.printf("🔍 Debug: cycleRunning=%s, cycleStartTime=%lu\n",
                cycleRunning ? "true" : "false", cycleStartTime);
  
  // Send status update with QoS 1 for guaranteed delivery
  client.publish(status_topic, "running", true);  // Retained message

  // Force immediate status update
  sendStatusUpdate();

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
  hasSlotEndTime = false;  // Reset slot end time
  slotEndTime = 0;
  
  Serial.println("✅ Washing cycle stopped!");
  Serial.printf("   Relay: OFF (GPIO %d = HIGH)\n", RELAY_PIN);
  Serial.printf("   Cycle duration: %lu minutes %lu seconds\n", 
                cycleDuration / 60000, (cycleDuration % 60000) / 1000);
  
  // Send status update
  client.publish(status_topic, "stopped", true);  // Retained message
}

void sendStatusUpdate() {
  if (!client.connected()) return;

  // Create status message with debug info
  String status = cycleRunning ? "running" : "idle";

  // Debug: Print current state
  Serial.printf("🔍 Status Debug: cycleRunning=%s, status=%s\n",
                cycleRunning ? "true" : "false", status.c_str());

  String statusMessage = "{";
  statusMessage += "\"status\":\"" + status + "\",";
  statusMessage += "\"machine_id\":\"WASHER-001\",";
  statusMessage += "\"uptime\":" + String(millis() / 1000) + ",";
  statusMessage += "\"wifi_rssi\":" + String(WiFi.RSSI()) + ",";
  statusMessage += "\"free_heap\":" + String(ESP.getFreeHeap());

  if (cycleRunning) {
    unsigned long elapsed = millis() - cycleStartTime;
    unsigned long remaining = (elapsed < CYCLE_DURATION) ? (CYCLE_DURATION - elapsed) : 0;
    statusMessage += ",\"cycle_elapsed\":" + String(elapsed / 1000);
    statusMessage += ",\"cycle_remaining\":" + String(remaining / 1000);

    // Debug: Print cycle timing info
    Serial.printf("🔍 Cycle Debug: elapsed=%lu, remaining=%lu\n", elapsed/1000, remaining/1000);
  }

  statusMessage += "}";

  // Debug: Print full status message
  Serial.printf("🔍 Full Status Message: %s\n", statusMessage.c_str());

  // Publish status
  if (client.publish(status_topic, statusMessage.c_str())) {
    Serial.printf("📤 Status update sent: %s\n", status.c_str());
  } else {
    Serial.println("❌ Failed to publish status update");
  }
}
