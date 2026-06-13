import networking from './lessons/networking.js'
import apis from './lessons/apis.js'
import databases from './lessons/databases.js'
import cloud from './lessons/cloud.js'
import devops from './lessons/devops.js'
import ai from './lessons/ai.js'

export const CLOUD_LESSONS = { networking, apis, databases, cloud, devops, ai }

export function getCloudLessons(moduleId) {
  return CLOUD_LESSONS[moduleId] || []
}
