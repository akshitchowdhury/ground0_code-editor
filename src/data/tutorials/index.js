import javascript from './javascript.js'
import react from './react.js'
import python from './python.js'
import go from './go.js'
import java from './java.js'
import shell from './shell.js'

export const TUTORIALS = { javascript, react, python, go, java, shell }

export function getLevels(trackId) {
  return TUTORIALS[trackId] || []
}
