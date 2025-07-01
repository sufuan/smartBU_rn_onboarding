import dotenv from 'dotenv';
import mqtt, { MqttClient } from 'mqtt';

// Load environment variables
dotenv.config();

interface ESP32Config {
  brokerUrl: string;
  mockMode: boolean;
  reconnectPeriod: number;
  connectTimeout: number;
}

class ESP32Manager {
  private client: MqttClient | null = null;
  private config: ESP32Config;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;

  constructor() {
    this.config = {
      brokerUrl: process.env.MQTT_BROKER || 'mqtt://broker.hivemq.com',
      mockMode: process.env.MOCK_MQTT === 'true',
      reconnectPeriod: 5000, // 5 seconds
      connectTimeout: 30000, // 30 seconds
    };

    // Check if MQTT is enabled
    const mqttEnabled = process.env.MQTT_ENABLED !== 'false';

    if (!mqttEnabled) {
      console.log('⏭️ ESP32Manager: MQTT disabled by configuration');
      return;
    }

    if (!this.config.mockMode) {
      this.initializeMQTT();
    } else {
      console.log('🔧 ESP32Manager: Running in MOCK mode - MQTT disabled');
    }
  }

  private initializeMQTT(): void {
    try {
      console.log(`🔄 ESP32Manager: Connecting to MQTT broker: ${this.config.brokerUrl}`);

      // Prepare connection options
      const connectOptions: any = {
        reconnectPeriod: this.config.reconnectPeriod,
        connectTimeout: this.config.connectTimeout,
        clientId: `washing-machine-server-${Date.now()}`,
        clean: true,
        keepalive: 15,  // Faster keep-alive (15 seconds instead of 60)
        queueQoSZero: false,  // Don't queue QoS 0 messages
        reschedulePings: true,  // Reschedule pings on send
      };

      // Add authentication if credentials are provided
      const mqttUsername = process.env.MQTT_USERNAME;
      const mqttPassword = process.env.MQTT_PASSWORD;

      console.log(`🔍 ESP32Manager Debug: Username="${mqttUsername}", Password="${mqttPassword ? '[SET]' : '[NOT SET]'}"`);

      if (mqttUsername && mqttPassword) {
        connectOptions.username = mqttUsername;
        connectOptions.password = mqttPassword;
        console.log(`🔐 ESP32Manager: Using authentication for user: ${mqttUsername}`);
      } else {
        console.log('⚠️ ESP32Manager: No MQTT credentials found - connecting without authentication');
        console.log(`   Username: ${mqttUsername || 'undefined'}`);
        console.log(`   Password: ${mqttPassword ? 'set' : 'undefined'}`);
      }

      this.client = mqtt.connect(this.config.brokerUrl, connectOptions);

      this.setupEventHandlers();
    } catch (error) {
      console.error('❌ ESP32Manager: Failed to initialize MQTT:', error);
      this.handleConnectionError();
    }
  }

  private setupEventHandlers(): void {
    if (!this.client) return;

    this.client.on('connect', () => {
      console.log('✅ ESP32Manager: Connected to MQTT broker');
      this.isConnected = true;
      this.reconnectAttempts = 0;
    });

    this.client.on('error', (error) => {
      console.error('❌ ESP32Manager: MQTT connection error:', error);
      this.isConnected = false;
      this.handleConnectionError();
    });

    this.client.on('close', () => {
      console.log('⚠️ ESP32Manager: MQTT connection closed');
      this.isConnected = false;
    });

    this.client.on('reconnect', () => {
      this.reconnectAttempts++;
      console.log(`🔄 ESP32Manager: Reconnecting to MQTT broker (attempt ${this.reconnectAttempts})`);

      // Circuit breaker: Stop if too many attempts
      if (this.reconnectAttempts > this.maxReconnectAttempts) {
        console.error(`🛑 ESP32Manager: Circuit breaker activated - stopping reconnection after ${this.reconnectAttempts} attempts`);
        this.client.end(true);
      }
    });

    this.client.on('offline', () => {
      console.log('📴 ESP32Manager: MQTT client offline');
      this.isConnected = false;
    });
  }

  private handleConnectionError(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(`❌ ESP32Manager: Max reconnection attempts (${this.maxReconnectAttempts}) reached - stopping reconnection`);
      this.client.end(true); // Force close the client
      return;
    }

    setTimeout(() => {
      if (!this.isConnected && !this.config.mockMode && this.reconnectAttempts < this.maxReconnectAttempts) {
        console.log('🔄 ESP32Manager: Attempting to reconnect...');
        this.initializeMQTT();
      }
    }, this.config.reconnectPeriod * (this.reconnectAttempts + 1));
  }

  private publishMessage(topic: string, message: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.config.mockMode) {
        console.log(`🔧 ESP32Manager [MOCK]: Publishing to ${topic}: ${message}`);
        resolve();
        return;
      }

      if (!this.client || !this.isConnected) {
        const error = 'MQTT client not connected';
        console.error(`❌ ESP32Manager: ${error}`);
        reject(new Error(error));
        return;
      }

      this.client.publish(topic, message, { qos: 1, retain: false }, (error) => {
        if (error) {
          console.error(`❌ ESP32Manager: Failed to publish to ${topic}:`, error);
          reject(error);
        } else {
          console.log(`📤 ESP32Manager: Published to ${topic}: ${message} (QoS 1)`);
          resolve();
        }
      });
    });
  }

  /**
   * Start washing cycle for a specific machine with slot expiration time
   * @param machineId - The ID of the washing machine (e.g., 'WASHER-001')
   * @param slotEndTime - Optional slot end time for automatic cutoff
   */
  public async startCycle(machineId: string, slotEndTime?: Date): Promise<void> {
    try {
      // Check if MQTT is enabled
      if (process.env.MQTT_ENABLED === 'false') {
        console.log(`📤 [MOCK] ESP32Manager: Started cycle for machine ${machineId}`);
        return;
      }

      const topic = `washer/${machineId}/control`;

      if (slotEndTime) {
        // Send start command with slot end time
        const startCommand = {
          action: 'start',
          slotEndTime: slotEndTime.toISOString(),
          maxDuration: 30 * 60 // 30 minutes in seconds as fallback
        };
        await this.publishMessage(topic, JSON.stringify(startCommand));
        console.log(`🚀 ESP32Manager: Started cycle for machine ${machineId} until ${slotEndTime.toISOString()}`);
      } else {
        // Fallback to simple start command
        await this.publishMessage(topic, 'start');
        console.log(`🚀 ESP32Manager: Started cycle for machine ${machineId} (30min default)`);
      }
    } catch (error) {
      console.error(`❌ ESP32Manager: Failed to start cycle for machine ${machineId}:`, error);
      throw error;
    }
  }

  /**
   * Stop washing cycle for a specific machine
   * @param machineId - The ID of the washing machine (e.g., 'washer1')
   */
  public async stopCycle(machineId: string): Promise<void> {
    try {
      // Check if MQTT is enabled
      if (process.env.MQTT_ENABLED === 'false') {
        console.log(`📤 [MOCK] ESP32Manager: Stopped cycle for machine ${machineId}`);
        return;
      }

      const topic = `washer/${machineId}/control`;
      await this.publishMessage(topic, 'stop');
      console.log(`🛑 ESP32Manager: Stopped cycle for machine ${machineId}`);
    } catch (error) {
      console.error(`❌ ESP32Manager: Failed to stop cycle for machine ${machineId}:`, error);
      throw error;
    }
  }

  /**
   * Send display update to ESP32 (for LCD/OLED displays)
   * @param machineId - The ID of the washing machine
   * @param displayData - Object containing display information
   */
  public async updateDisplay(machineId: string, displayData: {
    line1?: string;
    line2?: string;
    line3?: string;
    line4?: string;
  }): Promise<void> {
    try {
      // Check if MQTT is enabled
      if (process.env.MQTT_ENABLED === 'false') {
        console.log(`📤 [MOCK] ESP32Manager: Updated display for machine ${machineId}:`, displayData);
        return;
      }

      const topic = `washer/${machineId}/display`;
      const message = JSON.stringify(displayData);
      await this.publishMessage(topic, message);
      console.log(`📺 ESP32Manager: Updated display for machine ${machineId}`);
    } catch (error) {
      console.error(`❌ ESP32Manager: Failed to update display for machine ${machineId}:`, error);
      throw error;
    }
  }

  /**
   * Get connection status
   */
  public getConnectionStatus(): {
    connected: boolean;
    mockMode: boolean;
    brokerUrl: string;
    reconnectAttempts: number;
  } {
    return {
      connected: this.isConnected,
      mockMode: this.config.mockMode,
      brokerUrl: this.config.brokerUrl,
      reconnectAttempts: this.reconnectAttempts,
    };
  }

  /**
   * Gracefully disconnect from MQTT broker
   */
  public async disconnect(): Promise<void> {
    if (this.client && this.isConnected) {
      console.log('🔌 ESP32Manager: Disconnecting from MQTT broker...');
      await new Promise<void>((resolve) => {
        this.client!.end(false, {}, () => {
          console.log('✅ ESP32Manager: Disconnected from MQTT broker');
          resolve();
        });
      });
    }
  }
}

// Create singleton instance
const esp32Manager = new ESP32Manager();

// Export functions for use in other modules
export const startCycle = (machineId: string): Promise<void> => {
  return esp32Manager.startCycle(machineId);
};

export const stopCycle = (machineId: string): Promise<void> => {
  return esp32Manager.stopCycle(machineId);
};

export const updateDisplay = (machineId: string, displayData: {
  line1?: string;
  line2?: string;
  line3?: string;
  line4?: string;
}): Promise<void> => {
  return esp32Manager.updateDisplay(machineId, displayData);
};

export const getConnectionStatus = () => {
  return esp32Manager.getConnectionStatus();
};

export const disconnect = (): Promise<void> => {
  return esp32Manager.disconnect();
};

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('🔄 ESP32Manager: Received SIGINT, shutting down gracefully...');
  await disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🔄 ESP32Manager: Received SIGTERM, shutting down gracefully...');
  await disconnect();
  process.exit(0);
});

export default esp32Manager;
