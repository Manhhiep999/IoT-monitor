// UC05 — GET /api/sensors: danh mục loại cảm biến cho dropdown
export default defineEventHandler(async () => {
  return { data: await listSensors(true) }
})
