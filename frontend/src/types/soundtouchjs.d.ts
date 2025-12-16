declare module 'soundtouchjs' {
  export class SoundTouch {
    tempo: number;
    pitch: number;
    rate: number;
    constructor();
  }

  export class WebAudioBufferSource {
    constructor(buffer: AudioBuffer);
    extract(target: Float32Array, numFrames: number, position: number): number;
    position: number;
  }

  export class SimpleFilter {
    constructor(sourceSound: WebAudioBufferSource, soundTouch: SoundTouch, callback?: () => void);
    extract(target: Float32Array, numFrames: number): number;
    sourcePosition: number;
  }

  export function getWebAudioNode(
    context: AudioContext,
    filter: SimpleFilter,
    sourcePositionCallback?: (position: number) => void,
    bufferSize?: number
  ): AudioNode;
}