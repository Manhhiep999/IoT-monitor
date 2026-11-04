import type { MqttClient } from 'mqtt'

/** Topic MQTT — khớp firmware esp8266_iot.ino (TOPIC_SENSOR / TOPIC_CONTROL / TOPIC_RESPONSE) */
export const TOPICS = {
  sensorData: 'sensor_data',
  deviceControl: 'device_control',
  deviceResponse: 'device_response'
}

/** Khóa đèn trong payload firmware: thiết bị id 1..3 <-> "led1".."led3" */
export const ledKey = (deviceId: number) => `led${deviceId}`

let client: MqttClient | null = null

export function setMqttClient(c: MqttClient | null) {
  client = c
}

export function isMqttConnected() {
  return Boolean(client?.connected)
}

export function mqttPublish(topic: string, payload: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!client?.connected) return reject(new Error('MQTT Broker chưa kết nối'))
    client.publish(topic, JSON.stringify(payload), { qos: 1 }, (err) => (err ? reject(err) : resolve()))
  })
}
