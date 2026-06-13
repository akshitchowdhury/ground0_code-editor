// Go & Java execution via the free Wandbox API (https://wandbox.org).
// Unlike the other tracks these compile and run in a cloud sandbox, so
// they need internet. Transient container errors are retried once.

const COMPILERS = {
  go: 'go-1.23.2',
  java: 'openjdk-jdk-22+36',
}

const ENDPOINT = 'https://wandbox.org/api/compile.json'

function isTransient(result) {
  // Wandbox occasionally fails to spawn a container under load.
  const err = (result.program_error || '') + (result.compiler_error || '')
  return result.status !== '0' && /OCI runtime|Resource temporarily unavailable|crun:/.test(err)
}

async function callWandbox(language, code, signal) {
  const payload = { compiler: COMPILERS[language], code, save: false }
  if (language === 'java') {
    // The sandbox's JVM defaults stdout to ASCII; force UTF-8 so emoji
    // and accented characters survive the round trip.
    payload['runtime-option-raw'] = '-Dstdout.encoding=UTF-8\n-Dstderr.encoding=UTF-8'
  }
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  })
  if (response.status === 429) {
    throw new Error('The cloud sandbox is rate-limiting requests. Wait a few seconds and try again.')
  }
  if (!response.ok) {
    throw new Error(`Cloud sandbox returned HTTP ${response.status}. Try again in a moment.`)
  }
  return response.json()
}

export async function runRemote(language, code, { onOutput, onStatus }) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 60000)
  onStatus?.(language === 'java' ? 'Compiling & running on JDK 22 (cloud sandbox)…' : 'Compiling & running on Go 1.23 (cloud sandbox)…')

  try {
    let result = await callWandbox(language, code, controller.signal)
    if (isTransient(result)) {
      onStatus?.('Sandbox was busy — retrying…')
      await new Promise((r) => setTimeout(r, 1500))
      result = await callWandbox(language, code, controller.signal)
    }

    if (result.compiler_error) {
      onOutput({ level: 'error', text: result.compiler_error.trimEnd() })
    } else if (result.compiler_message) {
      onOutput({ level: 'warn', text: result.compiler_message.trimEnd() })
    }
    if (result.program_output) {
      onOutput({ level: 'log', text: result.program_output.replace(/\n$/, '') })
    }
    if (result.program_error) {
      onOutput({ level: 'error', text: result.program_error.trimEnd() })
    }

    const exitCode = result.status
    if (result.signal) {
      onOutput({ level: 'error', text: `Process killed by signal: ${result.signal} (did it run too long?)` })
    } else if (exitCode && exitCode !== '0' && !result.compiler_error) {
      onOutput({ level: 'warn', text: `Process exited with code ${exitCode}` })
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      onOutput({ level: 'error', text: 'Cloud sandbox timed out after 60s.' })
    } else {
      onOutput({
        level: 'error',
        text: `${err.message || err}\n(Go & Java run on a free cloud sandbox — check your internet connection.)`,
      })
    }
  } finally {
    clearTimeout(timeout)
    onStatus?.(null)
  }
}
