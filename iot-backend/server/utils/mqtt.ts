import type { MqttClient } from 'mqtt'

/** Topic MQTT — khớp firmware esp32_iot.ino (sensorTopic / controlTopic / statusTopic) */
export const TOPICS = {
  sensorData: 'iot/sensors/data',
  deviceControl: 'iot/devices/control',
  deviceStatus: 'iot/devices/status'
}

/** Tên thiết bị trong giao tiếp với firmware: thiết bị id 1..3 <-> "LED1".."LED3" */
export const deviceCode = (deviceId: number) => `LED${deviceId}`

/** Lệnh điều khiển dạng văn bản firmware nhận: LED1_ON, LED2_OFF... */
export const controlCommand = (deviceId: number, action: 'ON' | 'OFF') => `${deviceCode(deviceId)}_${action}`

let client: MqttClient | null = null

export function setMqttClient(c: MqttClient | null) {
  client = c
}

export function isMqttConnected() {
  return Boolean(client?.connected)
}

/** Chuỗi được gửi nguyên văn (lệnh LED1_ON), giá trị khác được gửi dạng JSON */
export function mqttPublish(topic: string, payload: unknown): Promise<void> {
  const body = typeof payload === 'string' ? payload : JSON.stringify(payload)
  return new Promise((resolve, reject) => {
    if (!client?.connected) return reject(new Error('MQTT Broker chưa kết nối'))
    client.publish(topic, body, { qos: 1 }, (err) => (err ? reject(err) : resolve()))
  })
}
