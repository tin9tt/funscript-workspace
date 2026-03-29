/// <reference lib="webworker" />

/**
 * Web Worker for continuous motion timing.
 *
 * Runs the up/down cycle loop in a Worker thread so that browser tab-switching
 * does not throttle the timing (background-tab setTimeout throttling only
 * applies to the main thread, not to Workers for typical tab switches).
 *
 * Protocol:
 *   Main → Worker : { type: 'start', config: StartConfig }
 *   Main → Worker : { type: 'stop' }
 *   Main → Worker : { type: 'ack', success: boolean, timestamp: number }
 *   Worker → Main : { type: 'sendLinear', duration: number, pos: number }
 */

interface StartConfig {
  upDuration: number
  downDuration: number
  upperPos: number
  lowerPos: number
  leadMs: number
}

type InboundMessage =
  | { type: 'start'; config: StartConfig }
  | { type: 'stop' }
  | { type: 'ack'; success: boolean; timestamp: number }

let isRunning = false
let resolveAck:
  | ((result: { success: boolean; timestamp: number }) => void)
  | null = null

let lastSentTimestamp = 0
let lastSentDuration = 0

self.onmessage = (e: MessageEvent<InboundMessage>) => {
  const msg = e.data

  if (msg.type === 'start') {
    isRunning = true
    lastSentTimestamp = Date.now()
    lastSentDuration = 0
    runLoop(msg.config)
  } else if (msg.type === 'stop') {
    isRunning = false
    resolveAck?.({ success: false, timestamp: Date.now() })
    resolveAck = null
  } else if (msg.type === 'ack') {
    resolveAck?.({ success: msg.success, timestamp: msg.timestamp })
    resolveAck = null
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function waitForAck(): Promise<{ success: boolean; timestamp: number }> {
  return new Promise((resolve) => {
    resolveAck = resolve
  })
}

async function waitForCommandWindow(leadMs: number): Promise<boolean> {
  while (isRunning) {
    const elapsed = Date.now() - lastSentTimestamp
    const remaining = lastSentDuration - elapsed

    if (remaining <= leadMs) {
      return true
    }

    await sleep(Math.min(16, remaining))
  }
  return false
}

async function runLoop(config: StartConfig): Promise<void> {
  const { upDuration, downDuration, upperPos, lowerPos, leadMs } = config

  while (isRunning) {
    if (!(await waitForCommandWindow(leadMs))) break

    if (!isRunning) break
    postMessage({ type: 'sendLinear', duration: upDuration, pos: upperPos })

    const upResult = await waitForAck()
    if (upResult.success) {
      lastSentTimestamp = upResult.timestamp
      lastSentDuration = upDuration
    } else {
      await sleep(24)
    }

    if (!isRunning) break

    if (!(await waitForCommandWindow(leadMs))) break

    if (!isRunning) break
    postMessage({ type: 'sendLinear', duration: downDuration, pos: lowerPos })

    const downResult = await waitForAck()
    if (downResult.success) {
      lastSentTimestamp = downResult.timestamp
      lastSentDuration = downDuration
    } else {
      await sleep(24)
    }
  }
}
