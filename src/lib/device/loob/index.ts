import { Funscript, FunscriptAction, sanitizeFunscript } from '@/lib/funscript'
import {
  Device,
  DeviceContinuousMotionSupported,
  DeviceFunscriptSupported,
} from '..'

const ServiceUUID = 'b75c49d2-04a3-4071-a0b5-35853eb08307'
const WriteUUID = 'ba5c49d2-04a3-4071-a0b5-35853eb08307'

const ContinuousMotionMinCycleDuration = 180
const ContinuousMotionMaxCycleDuration = 3200
const ContinuousMotionMediumSpeed = 50

export const calculateContinuousBaseCycleDuration = (speed: number): number => {
  const normalizedSpeed = Math.max(1, Math.min(100, speed))
  const speedRate = (normalizedSpeed - 1) / 99
  const mediumSpeedRate = (ContinuousMotionMediumSpeed - 1) / 99

  // Keep the fastest end unchanged while making the middle and lower range less aggressive.
  const adjustedSpeedRate = speedRate ** 2
  const lowSpeedDurationFactor =
    speedRate < mediumSpeedRate
      ? 1 + Math.sqrt((mediumSpeedRate - speedRate) / mediumSpeedRate)
      : 1

  return Math.round(
    (ContinuousMotionMaxCycleDuration -
      adjustedSpeedRate *
        (ContinuousMotionMaxCycleDuration - ContinuousMotionMinCycleDuration)) *
      lowSpeedDurationFactor,
  )
}

export interface LoobI
  extends Device, DeviceFunscriptSupported, DeviceContinuousMotionSupported {
  connect(device: BluetoothDevice): Promise<LoobI>
  sendCommand(data: BufferSource): Promise<void>
  sendLinearCommand(
    duration: number,
    pos: number,
    options?: { minApplyFactor?: number },
  ): Promise<boolean>
  play(playbackStartTime: number, videoCurrentTime: number): Promise<void>
}

interface LinearCommandLog {
  /**
   * timestamp
   */
  timestamp: Date
  /**
   * duration milliseconds
   */
  duration: number
  /**
   * position in percentage (0-100)
   */
  pos: number
}

export class Loob implements LoobI {
  private static instance: Loob
  private device: BluetoothDevice | null = null
  private service: BluetoothRemoteGATTService | null = null
  private characteristic: BluetoothRemoteGATTCharacteristic | null = null
  private linearInvert: boolean = false
  private gattWriteQueue: Promise<void> = Promise.resolve()

  private constructor() {}

  public static async connect(device: BluetoothDevice): Promise<Loob> {
    if (!Loob.instance) {
      const instance = new Loob()
      Loob.instance = await instance.connect(device)
    }
    return Loob.instance
  }

  async connect(device: BluetoothDevice): Promise<Loob> {
    this.device = device
    try {
      const server = await device.gatt?.connect()
      if (!server) {
        throw 'Failed to connect to device'
      }
      console.log(`Connected to device: ${device.name} (${device.id})`)
      this.service = await server.getPrimaryService(ServiceUUID)
      this.characteristic = await this.service.getCharacteristic(WriteUUID)
      await this.sendLinearCommand(1000, 0)
      await this.sendLinearCommand(1000, 100)
      await this.sendLinearCommand(1000, 0)
      return this
    } catch (error) {
      // this.disconnect()
      throw error
    }
  }

  async disconnect() {
    console.log(`Disconnect device: ${this.device?.name} (${this.device?.id})`)
    this.device?.gatt?.disconnect()
  }

  async sendCommand(data: BufferSource) {
    if (!this.characteristic) {
      throw 'Characteristic not found'
    }

    const nextWrite = this.gattWriteQueue
      .catch(() => undefined)
      .then(async () => {
        console.log('Command sent:', data)
        await this.characteristic?.writeValue(data)
      })

    this.gattWriteQueue = nextWrite

    await nextWrite
  }

  /**
   * @param duration milliseconds
   * @param pos position in percentage (0-100)
   */
  async sendLinearCommand(
    duration: number,
    pos: number,
    options?: { minApplyFactor?: number },
  ): Promise<boolean> {
    console.log('Send linear command:', duration, pos)

    // C#コードに合わせて最小持続時間を適用
    if (this.lastLinearCommandCalled) {
      const prevPos = this.lastLinearCommandCalled.pos
      const posDiff = Math.abs(pos - prevPos)
      const minApplyFactor = options?.minApplyFactor ?? 5
      duration = Math.max(posDiff * minApplyFactor, duration)
    }

    // linearInvertがtrueの場合、位置を反転
    const finalPos = this.linearInvert ? 100 - pos : pos
    const posValue = Math.min(Math.max(finalPos * 10, 1), 1000)
    const timeValue = Math.min(duration, 65535)

    const data = new Uint8Array([
      (posValue >> 8) & 0xff,
      posValue & 0xff,
      (timeValue >> 8) & 0xff,
      timeValue & 0xff,
    ])

    try {
      // C#のコードではsleep()は使わない - コマンド送信のみ
      await this.sendCommand(data)

      this.lastLinearCommandCalled = {
        timestamp: new Date(),
        duration,
        pos,
      }
      return true
    } catch (error) {
      console.error(`Failed to send command: ${error}`)
      return false
    }
  }

  /**
   * @param positionDiff difference in position (0-100)
   * difference (0-100) * 5 means
   * - 30 difference should take more then 150ms to apply
   * - 100 difference should take more then 500ms to apply
   */
  static minApplyDuration = (positionDiff: number) => positionDiff * 5

  private funscript: Funscript | null = null
  private funscriptActionIndex: number = 0
  private lastLinearCommandCalled: LinearCommandLog = {
    timestamp: new Date(),
    duration: 0,
    pos: 0,
  }

  async load(funscript: Funscript) {
    console.log('Load funscript:', funscript.metadata?.title)
    this.funscript = sanitizeFunscript(funscript)

    // Funscript.invertedプロパティがある場合は、linearInvertを設定
    if (funscript.inverted !== undefined) {
      this.linearInvert = funscript.inverted
      console.log('Set linear invert from funscript:', funscript.inverted)
    }
  }

  /**
   * @param seekTo milliseconds
   */
  async seek(seekTo: number) {
    console.log('Seek:', seekTo)
    if (!this.funscript) {
      throw 'No funscript loaded'
    }

    // syncActionIndexを使用して正しいインデックスを設定
    this.syncActionIndex(seekTo)

    // 現在位置での補間位置を計算して即座に適用
    if (
      this.funscriptActionIndex > 0 &&
      this.funscriptActionIndex < this.funscript.actions.length
    ) {
      const nextAction = this.funscript.actions[this.funscriptActionIndex]
      const previousAction =
        this.funscript.actions[this.funscriptActionIndex - 1]

      if (seekTo >= previousAction.at && seekTo <= nextAction.at) {
        const position = pos(previousAction, nextAction, seekTo)
        const diff = Math.abs(position - this.lastLinearCommandCalled.pos)

        if (diff > 25) {
          await this.sendLinearCommand(Loob.minApplyDuration(diff), position)
        }
      }
    } else if (this.funscriptActionIndex < this.funscript.actions.length) {
      // 最初のアクション前の場合
      const firstAction = this.funscript.actions[0]
      const diff = Math.abs(firstAction.pos - this.lastLinearCommandCalled.pos)

      if (diff > 25) {
        await this.sendLinearCommand(
          Loob.minApplyDuration(diff),
          firstAction.pos,
        )
      }
    }
  }

  private isPlaying = false
  private isContinuousPlaying = false
  private continuousLoopGeneration = 0
  private continuousMotionWorker: Worker | null = null

  async play(playbackStartTime: number, videoCurrentTime: number) {
    console.log('Play', this.device?.name)
    if (!this.funscript) {
      console.log('Skip playing: no funscript loaded')
      throw 'No funscript loaded'
    }
    if (this.isPlaying) {
      console.log('Skip playing: already playing')
      return // already playing
    }
    this.isContinuousPlaying = false
    this.continuousLoopGeneration += 1
    this.isPlaying = true

    // 現在時刻に基づいて正しいアクションインデックスを設定
    const currentTime = Date.now() - playbackStartTime + videoCurrentTime
    this.syncActionIndex(currentTime)

    console.log(
      'Play %s\n\tScript\n\t\tlength: %d\n\t\tcurrentActionIndex: %d\n\tMedia:\n\t\ttimestamp: %d',
      this.device?.name,
      this.funscript.actions.length,
      this.funscriptActionIndex,
      videoCurrentTime,
    )

    const actions = this.funscript.actions

    const playLoop = async () => {
      while (this.isPlaying && this.funscriptActionIndex < actions.length) {
        const currentTime = Date.now() - playbackStartTime + videoCurrentTime
        const currentAction = actions[this.funscriptActionIndex]
        let duration = 500
        if (this.funscriptActionIndex > 0) {
          const prevAction = actions[this.funscriptActionIndex - 1]
          duration = currentAction.at - prevAction.at
          const posDiff = Math.abs(currentAction.pos - prevAction.pos)
          duration = Math.max(Loob.minApplyDuration(posDiff), duration)
        }
        // アクションの開始時刻に到達したらコマンド送信し、インデックスを進める
        if (currentTime >= currentAction.at - duration) {
          const sent = await this.sendLinearCommand(duration, currentAction.pos)
          if (sent) {
            this.funscriptActionIndex++
          } else {
            await new Promise((resolve) => setTimeout(resolve, 24))
          }
          continue
        }
        await new Promise((resolve) => setTimeout(resolve, 8))
      }
    }

    await playLoop()
  }

  private syncActionIndex(currentTime: number) {
    if (!this.funscript) return

    // 現在時刻に最も近い（かつ過去の）アクションのインデックスを見つける
    let targetIndex = 0
    for (let i = 0; i < this.funscript.actions.length; i++) {
      if (this.funscript.actions[i].at <= currentTime) {
        targetIndex = i + 1 // 次に実行すべきアクションのインデックス
      } else {
        break
      }
    }

    this.funscriptActionIndex = Math.min(
      targetIndex,
      this.funscript.actions.length,
    )
    console.log(
      `Synced action index to ${this.funscriptActionIndex} for time ${currentTime}ms`,
    )
  }

  async pause() {
    console.log('Pause', this.device?.name)
    this.isPlaying = false
    this.isContinuousPlaying = false
    this.continuousLoopGeneration += 1
  }

  async startContinuousMotion(options: {
    speed: number
    dutyRatio: number
    offset: number
    limit: number
    inverted: boolean
  }) {
    const lowerPos = Math.max(0, Math.min(options.offset, options.limit))
    const upperPos = Math.min(100, Math.max(options.offset, options.limit))
    const speed = Math.max(1, Math.min(100, options.speed))
    const dutyRatio = Math.max(20, Math.min(80, options.dutyRatio))

    if (lowerPos === upperPos) {
      return
    }

    this.linearInvert = options.inverted
    this.isPlaying = false
    this.isContinuousPlaying = true
    this.continuousLoopGeneration += 1

    // 直前モードの残り時間で初回送信が遅れないようにリセット
    this.lastLinearCommandCalled = {
      timestamp: new Date(0),
      duration: 0,
      pos: this.lastLinearCommandCalled.pos,
    }

    const baseCycleDuration = calculateContinuousBaseCycleDuration(speed)

    // Range が狭いほど周期を短くして、上下端で止まって見える時間を減らす
    const spanRate = Math.max(0.05, (upperPos - lowerPos) / 100)
    const cycleDuration = Math.max(90, Math.round(baseCycleDuration * spanRate))

    const upDuration = Math.max(
      45,
      Math.round((cycleDuration * dutyRatio) / 100),
    )
    const downDuration = Math.max(45, cycleDuration - upDuration)
    const commandLeadMs = 20

    // Terminate any previous Worker before starting a new one
    this.continuousMotionWorker?.terminate()

    // タイミングループを Web Worker で実行することで、他のブラウザタブを表示中でも
    // setTimeout がスロットリングされずに動作し続ける
    const worker = new Worker(
      new URL('./continuousMotionWorker.ts', import.meta.url),
    )
    this.continuousMotionWorker = worker

    worker.onmessage = async (
      e: MessageEvent<{ type: 'sendLinear'; duration: number; pos: number }>,
    ) => {
      const { duration, pos } = e.data
      const sent = await this.sendLinearCommand(duration, pos, {
        minApplyFactor: 2,
      })
      worker.postMessage({
        type: 'ack',
        success: sent,
        timestamp: Date.now(),
      })
    }

    worker.postMessage({
      type: 'start',
      config: {
        upDuration,
        downDuration,
        upperPos,
        lowerPos,
        leadMs: commandLeadMs,
      },
    })
  }

  async stopContinuousMotion() {
    this.isContinuousPlaying = false
    this.continuousLoopGeneration += 1
    this.continuousMotionWorker?.postMessage({ type: 'stop' })
    this.continuousMotionWorker?.terminate()
    this.continuousMotionWorker = null
  }
}

export const pos = (
  prev: FunscriptAction,
  next: FunscriptAction,
  seekTo: number,
): number => {
  const duration = next.at - prev.at
  return prev.pos + ((next.pos - prev.pos) * (seekTo - prev.at)) / duration
}
