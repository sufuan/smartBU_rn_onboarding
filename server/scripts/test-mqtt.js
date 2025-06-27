#!/usr/bin/env node

/**
 * Test MQTT Connection
 * Check if MQTT messages are being sent properly
 */

import mqtt from 'mqtt';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const MQTT_BROKER = process.env.MQTT_BROKER || 'mqtt://test.mosquitto.org';
const MACHINE_ID = 'WASHER-001';

console.log('🧪 MQTT Connection Test');
console.log('═'.repeat(40));
console.log(`📡 Broker: ${MQTT_BROKER}`);
console.log(`🏭 Machine ID: ${MACHINE_ID}`);

// Connect to MQTT broker
const client = mqtt.connect(MQTT_BROKER, {
  clientId: `mqtt-test-${Date.now()}`,
  clean: true,
  keepalive: 15,
});

client.on('connect', () => {
  console.log('✅ Connected to MQTT broker');
  
  // Subscribe to status topic to listen for ESP32 responses
  const statusTopic = `washer/${MACHINE_ID}/status`;
  client.subscribe(statusTopic, (err) => {
    if (err) {
      console.error('❌ Failed to subscribe to status topic:', err);
    } else {
      console.log(`📩 Subscribed to: ${statusTopic}`);
    }
  });
  
  // Send test start command
  console.log('\n🚀 Sending test start command...');
  const controlTopic = `washer/${MACHINE_ID}/control`;
  const startCommand = {
    action: 'start',
    slotEndTime: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes from now
    maxDuration: 30 * 60 // 30 minutes in seconds
  };
  
  client.publish(controlTopic, JSON.stringify(startCommand), { qos: 1 }, (err) => {
    if (err) {
      console.error('❌ Failed to publish start command:', err);
    } else {
      console.log(`📤 Published to: ${controlTopic}`);
      console.log(`📝 Message: ${JSON.stringify(startCommand)}`);
    }
  });
  
  // Wait for ESP32 response
  console.log('\n⏳ Waiting for ESP32 response (10 seconds)...');
  setTimeout(() => {
    console.log('\n🛑 Sending test stop command...');
    client.publish(controlTopic, 'stop', { qos: 1 }, (err) => {
      if (err) {
        console.error('❌ Failed to publish stop command:', err);
      } else {
        console.log(`📤 Published stop command to: ${controlTopic}`);
      }
    });
    
    // Disconnect after another 5 seconds
    setTimeout(() => {
      console.log('\n🔌 Disconnecting...');
      client.end();
    }, 5000);
  }, 10000);
});

client.on('message', (topic, message) => {
  console.log(`📨 Message received:`);
  console.log(`   Topic: ${topic}`);
  console.log(`   Message: ${message.toString()}`);
  
  try {
    const data = JSON.parse(message.toString());
    if (data.status) {
      console.log(`   Status: ${data.status}`);
      if (data.status === 'running') {
        console.log('✅ ESP32 responded - cycle started successfully!');
      } else if (data.status === 'idle') {
        console.log('ℹ️ ESP32 is idle (not running cycle)');
      }
    }
  } catch (e) {
    // Not JSON, that's okay
  }
});

client.on('error', (error) => {
  console.error('❌ MQTT connection error:', error);
});

client.on('close', () => {
  console.log('🔌 MQTT connection closed');
});

client.on('offline', () => {
  console.log('📴 MQTT client offline');
});

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\n🛑 Stopping MQTT test...');
  client.end();
  process.exit(0);
});
