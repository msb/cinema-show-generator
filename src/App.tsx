import React, { useRef, useState, MouseEvent } from 'react'
import styled from 'styled-components'

const APP_MAX_WIDTH = 1000

const PIXELS_PER_BLOCK = 16

const BLOCKS_MAX = 10

const Main = styled.main`
  font-family: Roboto Mono;
  max-width: ${APP_MAX_WIDTH}px;
  margin: auto;
  background-color: palegoldenrod;
  text-align: center;
`

const Header = styled.header`
  margin-bottom: 20px;
  text-decoration: underline;
`

const FieldWrapper = styled.div`
  margin-bottom: 20px;
`

const Canvas = styled.canvas`
  border: 1px solid gray;
`

function readFile(file: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (event) => {
      if (event.target && event.target.result) {
        resolve(event.target.result as string)
      }
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function loadImageFromDataURL(dataURL: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    let image = new Image()
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = dataURL
  })
}

function App() {

  const [frames, setFrames] = useState<HTMLImageElement[]>([])

  const [frameIndex, setNextFrame] = useState<number>(0)

  const [frameRate, setFrameRate] = useState<number>(4)

  const [[minWidth, minHeight], setMinDimensions] = useState<[number, number]>([0, 0])

  const [[targetWidth, targetHeight], setTargetDimensions] = useState<[number, number]>([0, 0])

  const [intervalId, setIntervalId] = useState(0)

  const [firstAxisX, setFirstAxisX] = useState(true)

  const [firstAxisBlocks, setFirstAxisBlocks] = useState(BLOCKS_MAX)

  const canvasRef = useRef<HTMLCanvasElement>(null)

  function animate(frames: HTMLImageElement[], frameRate: number, minWidth: number, minHeight: number, targetWidth: number, targetHeight: number) {
    if (intervalId > 0) {
      clearInterval(intervalId)
    }
    setIntervalId(window.setInterval(() => {
      setNextFrame(frameIndex => {
        if (frames.length > 0 && canvasRef.current) {
          const xOffset = (frames[frameIndex].width - minWidth) / 2
          const yOffset = (frames[frameIndex].height - minHeight) / 2
          const context = canvasRef.current.getContext('2d')
          if (context) {
            context.lineWidth = 0.5
            context.drawImage(frames[frameIndex], xOffset, yOffset, minWidth, minHeight, 0, 0, targetWidth, targetHeight)
            for (let x = 0; x < targetWidth; x += PIXELS_PER_BLOCK) {
              context.beginPath()
              context.moveTo(x, 0)
              context.lineTo(x, targetHeight)
              context.stroke()
            }
            for (let y = 0; y < targetHeight; y += PIXELS_PER_BLOCK) {
              context.beginPath()
              context.moveTo(0, y)
              context.lineTo(targetWidth, y)
              context.stroke()
            }
          }

          return (frameIndex + 1) % frames.length
        }
        return 0
      })
    }, frameRate * 40))
  }

  function updateDimensions(frames: HTMLImageElement[], firstAxisX: boolean, firstAxisBlocks: number) {
    let minWidth = Number.MAX_SAFE_INTEGER
    let minHeight = Number.MAX_SAFE_INTEGER
    for (const frame of frames) {
      minWidth = Math.min(frame.width, minWidth)
      minHeight = Math.min(frame.height, minHeight)
    }

    let [targetWidth, targetHeight] = [0, 0]

    if (firstAxisX) {
      targetWidth = firstAxisBlocks * PIXELS_PER_BLOCK
      targetHeight = targetWidth * minHeight / minWidth
      targetHeight -= targetHeight % PIXELS_PER_BLOCK
      minHeight = minWidth * targetHeight / targetWidth
    } else {
      targetHeight = firstAxisBlocks * PIXELS_PER_BLOCK
      targetWidth = targetHeight * minWidth / minHeight
      targetWidth -= targetWidth % PIXELS_PER_BLOCK
      minWidth = minHeight * targetWidth / targetHeight
    }

    if (canvasRef.current) {
      // FIXME not just here
      canvasRef.current.width = targetWidth
      canvasRef.current.height = targetHeight
    }

    setMinDimensions([minWidth, minHeight])
    setTargetDimensions([targetWidth, targetHeight])

    animate(frames, frameRate, minWidth, minHeight, targetWidth, targetHeight)
  }

  async function handleFileEvent(event: React.ChangeEvent<HTMLInputElement>) {
    const files:File[] = Array.prototype.slice.call(event.target.files)
    files.sort((f1, f2) => {
       return f1.name.localeCompare(f2.name)
    })
    const frames = []
    for (const file of files) {
      frames.push(await loadImageFromDataURL(await readFile(file)))
    }
    setFrames(frames)
    updateDimensions(frames, firstAxisX, firstAxisBlocks)
  }

  function handleBlocksChange(event: React.ChangeEvent<HTMLInputElement>) {
    const firstAxisBlocks = parseInt(event.target.value)
    setFirstAxisBlocks(firstAxisBlocks)
    updateDimensions(frames, firstAxisX, firstAxisBlocks)
  }

  function handleAxisChange(event: MouseEvent<HTMLButtonElement>) {
    setFirstAxisX(!firstAxisX)
    updateDimensions(frames, !firstAxisX, firstAxisBlocks)
  }

  function handleFrameRateChange(event: React.ChangeEvent<HTMLInputElement>) {
    const frameRate = parseInt(event.target.value)
    setFrameRate(frameRate)
    animate(frames, frameRate, minWidth, minHeight, targetWidth, targetHeight)
  }

  return (
    <Main>
      <Header>Cinema Show</Header>
      <FieldWrapper>
        <input type='file' multiple onChange={handleFileEvent} accept='image/png, image/jpeg' />
        <span>[instructions on how to prepare the frame images for upload]</span>
      </FieldWrapper>
      <FieldWrapper>
        <input type='text' placeholder='Give the show a good name' />
      </FieldWrapper>
      <FieldWrapper>
        <Canvas ref={canvasRef} />
      </FieldWrapper>
      <FieldWrapper>
        Make the show
        {" "}
        <input type='text' value={firstAxisBlocks} size={1} onChange={handleBlocksChange} />
        {" "}
        blocks
        {" "}
        <button onClick={handleAxisChange}>{firstAxisX ? "wide" : "high"}</button>
        {" "}
        and give it a frame rate of
        {" "}
        <input type='text' value={frameRate} size={1} onChange={handleFrameRateChange} />.
        <span>[instructions + warn about frame rate]</span>
      </FieldWrapper>
      <FieldWrapper>
        <button>Create the show</button>
      </FieldWrapper>
      <footer>
        <a href="#fixme">how the page works</a>
      </footer>
    </Main>
  );
}

export default App
