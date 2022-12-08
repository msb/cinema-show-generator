import React, { useState } from 'react'
import './App.css'

const PIXELS_PER_BLOCK = 16
// FIXME
const NUMBER_OF_FRAMES = 8

type Point = {
  x: number
  y: number
}

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

  const [min2ndAxisLength, setMin2ndAxisLength] = useState(Number.MAX_SAFE_INTEGER)
  const [blocksX, setBlocksX] = useState(4)
  const [blocksY, setBlocksY] = useState(0)
  const [xDefinedAxis, setXDefinedAxis] = useState(true)

  function drawImage(image: HTMLImageElement, canvas: HTMLCanvasElement, min2ndAxisLength: number): number {
    let width
    let height
  
    if (xDefinedAxis) {
      width = blocksX * PIXELS_PER_BLOCK
      height = width * image.height / image.width
      min2ndAxisLength = Math.min(min2ndAxisLength, height)
    } else {
      height = blocksY * PIXELS_PER_BLOCK
      width = height * image.width / image.height
      min2ndAxisLength = Math.min(min2ndAxisLength, width)
    }
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    context && context.drawImage(image, 0, 0, width, height)
  
    return min2ndAxisLength
  }

  function getOffset(imageWidth: number, imageHeight: number): Point {
    if (xDefinedAxis) {
      return {x: 0, y: (imageHeight - min2ndAxisLength) / 2}
    } else {
      return {x: (imageWidth - min2ndAxisLength) / 2, y: 0}
    }
  }

  async function handleFileEvent(event: React.ChangeEvent<HTMLInputElement>) {
    let min2ndAxisLength = Number.MAX_SAFE_INTEGER

    const files:File[] = Array.prototype.slice.call(event.target.files)
    files.sort((f1, f2) => {
       return f1.name.localeCompare(f2.name)
    })
    let index = 0
    for (const file of files) {
      const image = await loadImageFromDataURL(await readFile(file))
      const canvas = document.getElementById(`f_${index}`) as HTMLCanvasElement
      min2ndAxisLength = drawImage(image, canvas, min2ndAxisLength)
      index ++
    }

    // rounds `min2ndAxisLength` down to the nearest `PIXELS_PER_BLOCK` (idempotent)
    min2ndAxisLength -= min2ndAxisLength % PIXELS_PER_BLOCK

    if (xDefinedAxis) {
      setBlocksY(min2ndAxisLength / PIXELS_PER_BLOCK)
    } else {
      setBlocksX(min2ndAxisLength / PIXELS_PER_BLOCK)
    }
    setMin2ndAxisLength(min2ndAxisLength)
    console.log(min2ndAxisLength / PIXELS_PER_BLOCK)
    }

  async function generateTextures() {
    for (let x = 0; x < blocksX; x ++) {
      for (let y = 0; y < blocksY; y ++) {
        const output = document.getElementById(`${x}_${y}`) as HTMLCanvasElement
        output.width = PIXELS_PER_BLOCK
        output.height = PIXELS_PER_BLOCK * NUMBER_OF_FRAMES
        const outputContext = output.getContext('2d')
        if (outputContext) {
          for (let f = 0; f < NUMBER_OF_FRAMES; f ++) {
            const frame = document.getElementById(`f_${f}`) as HTMLCanvasElement
            const textureYPos = f * PIXELS_PER_BLOCK
            const offset = getOffset(frame.width, frame.height)
            outputContext.drawImage(frame,
              offset.x + x * PIXELS_PER_BLOCK,
              offset.y + (blocksY - 1 - y) * PIXELS_PER_BLOCK, 
              PIXELS_PER_BLOCK, PIXELS_PER_BLOCK,
              0, textureYPos,
              PIXELS_PER_BLOCK, PIXELS_PER_BLOCK
            )
          }
        }
      }
    }
  }

  return (
    <div className="App">
      <div>
        <input type="file" multiple onChange={handleFileEvent} accept='image/png, image/jpeg' />
      </div>
      <div>
        {
          [0, 1, 2, 3, 4, 5, 6, 7].map(index => (
            <>
              <canvas key={`f_${index}`} id={`f_${index}`} width={10} height={10} />
              &nbsp;
            </>
          ))
        }
      </div>
      <div>
        <button onClick={generateTextures}>Generate Textures</button>
      </div>
      <div>
        {
          [0, 1, 2, 3].map(x => (
            [0, 1, 2].map(y => (
              <>
                <canvas key={`${x}_${y}`} id={`${x}_${y}`} width={10} height={10} />
                &nbsp;
              </>
            ))
          ))
        }
      </div>
    </div>
  )
}

export default App
