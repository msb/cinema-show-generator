import React, { useState } from 'react'
import './App.css'
import * as JSZip from 'jszip'
import { saveAs } from 'file-saver'
import slugify from 'slugify'

/*
  TODO:
  /assets/cinemashow/shows.json
  /assets/cinemashow/show_{showSlug}.json
  /assets/cinemashow/lang/en_us.json (?)
  /assets/cinemashow/models/item/show_{showSlug}.json
  /assets/cinemashow/models/block/screen_base.json (?)
  /assets/cinemashow/models/block/show_{showSlug}_{x}_{y}.json
  /assets/cinemashow/blockstates/show_{showSlug}.json
 */

const PIXELS_PER_BLOCK = 16

/**
 * Upper limit of blocksX.
 */
const BLOCKS_X_MAX = 10

/**
 * Upper limit of blocksY.
 */
const BLOCKS_Y_MAX = 10

/**
 * Default value if `franeTime` not set.
 */
const DEFAULT_FRAME_TIME = 25

// FIXME
const NUMBER_OF_FRAMES = 17

const ROTATIONS: [string, {}][] = [
  ["north", {}],
  ["east", {y: 90}],
  ["south", {y: 180}],
  ["west", {y: 270}],
  ["north_down", {x: 90}],
  ["east_down", {x: 90, y: 90}],
  ["south_down", {x: 90, y: 180}],
  ["west_down", {x: 90, y: 270}],
  ["north_up", {x: 270}],
  ["east_up", {x: 270, y: 90}],
  ["south_up", {x: 270, y: 180}],
  ["west_up", {x: 270, y: 270}],
]

type Point = {
  x: number
  y: number
}

function toJson(value: any): string {
  return JSON.stringify(value, null, 2)
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

function canvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) {
        resolve(blob)
      } else {
        reject("FIXME")
      }
    })
  })
}

function App() {

  const [min2ndAxisLength, setMin2ndAxisLength] = useState(Number.MAX_SAFE_INTEGER)
  const [blocksX, setBlocksX] = useState(BLOCKS_X_MAX)
  const [blocksY, setBlocksY] = useState(0)
  const [xDefinedAxis, setXDefinedAxis] = useState(false)
  const [showName, setShowName] = useState("Good Vintage")
  const [frameTime, setFrameTime] = useState(2)

  function drawImage(image: HTMLImageElement, canvas: HTMLCanvasElement, min2ndAxisLength: number): number {
    let width
    let height
  
    if (blocksY === 0) {
      width = blocksX * PIXELS_PER_BLOCK
      if (width > image.width) {
        // FIXME dis-allow this
        console.warn("You are scaling up which will result in loss of quality")
      }
      height = width * image.height / image.width
      min2ndAxisLength = Math.min(min2ndAxisLength, height)
    } else {
      height = blocksY * PIXELS_PER_BLOCK
      if (height > image.height) {
        // FIXME dis-allow this
        console.warn("You are scaling up which will result in loss of quality")
      }
      width = height * image.width / image.height
      min2ndAxisLength = Math.min(min2ndAxisLength, width)
    }
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    context && context.drawImage(image, 0, 0, width, height)
  
    return min2ndAxisLength
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

    if (blocksY === 0) {
      setXDefinedAxis(true)
      setBlocksY(min2ndAxisLength / PIXELS_PER_BLOCK)
    } else {
      setXDefinedAxis(false)
      setBlocksX(min2ndAxisLength / PIXELS_PER_BLOCK)
    }
    setMin2ndAxisLength(min2ndAxisLength)
    console.log(min2ndAxisLength / PIXELS_PER_BLOCK)
  }

  function getOffset(imageWidth: number, imageHeight: number): Point {
    if (xDefinedAxis) {
      return {x: 0, y: (imageHeight - min2ndAxisLength) / 2}
    } else {
      return {x: (imageWidth - min2ndAxisLength) / 2, y: 0}
    }
  }
  
  async function generateTextures() {

    const response = await fetch("/cinemashow-0.3.jar")
    if (response.status !== 200) {
      // FIXME handle
      throw new Error(response.statusText)
    }
    const zip = await JSZip.loadAsync(response.blob())

    // we can use a single canvas
    const output = document.createElement('canvas')
    output.width = PIXELS_PER_BLOCK
    output.height = PIXELS_PER_BLOCK * NUMBER_OF_FRAMES

    const assetsPath = "/assets/cinemashow"
    const commonName = `show_${slugify(showName, {replacement: '_', lower: true, strict: true})}`

    // FIXME shouldn't overwrite
    zip.file(`${assetsPath}/shows.json`, toJson([commonName]))

    // TODO I don't think we use `frameTime`
    zip.file(`${assetsPath}/${commonName}.json`, toJson({showName, frameTime, blocksX, blocksY}))

    const messageResource: { [key: string]: string } = {
      "itemGroup.cinemashow": "Cinema Show"
    }
    messageResource[`block.cinemashow.${commonName}`] = showName
    // FIXME shouldn't overwrite
    zip.file(`${assetsPath}/lang/en_us.json`, toJson(messageResource))

    const textureBack = {texture: "#back"}

    zip.file(`${assetsPath}/models/item/${commonName}.json`, toJson({
      parent: "minecraft:block/cube_all",
      elements: [
        {
          faces: {
            down: textureBack,
            east: textureBack,
            north: textureBack,
            south: textureBack,
            up: {texture: "#screen"},
            west: textureBack
          },
          from: [0, 0, 0],
          to: [16, 16, 16]
        }
      ],
      textures: {
        back: "cinemashow:block/screen_base",
        screen: "cinemashow:block/screen_item"
      }
    }))

    // FIXME don't use any
    const variants: { [key: string]: {} } = {}

    for (let x = 0; x < blocksX; x ++) {
      for (let y = 0; y < blocksY; y ++) {
        const outputContext = output.getContext('2d')
        if (outputContext) {
          for (let f = 0; f < NUMBER_OF_FRAMES; f ++) {
            const frame = document.getElementById(`f_${f}`) as HTMLCanvasElement
            const textureYPos = f * PIXELS_PER_BLOCK
            const offset = getOffset(frame.width, frame.height)
            outputContext.drawImage(frame,
              offset.x + x * PIXELS_PER_BLOCK,
              offset.y + y * PIXELS_PER_BLOCK, 
              PIXELS_PER_BLOCK, PIXELS_PER_BLOCK,
              0, textureYPos,
              PIXELS_PER_BLOCK, PIXELS_PER_BLOCK
            )
          }
        }
        const tileResourceName = `${commonName}_${x}_${y}`
        const textureName = `${assetsPath}/textures/block/${tileResourceName}.png`
        const blob = await canvasToBlob(output)
        zip.file(textureName, blob, {base64: true})
        zip.file(`${textureName}.mcmeta`, toJson({animation: {frametime: frameTime}}))

        zip.file(`${assetsPath}/models/block/${tileResourceName}.json`, toJson({
          parent: "minecraft:block/cube_all",
          elements: [
            {
              faces: {
                down: textureBack,
                east: textureBack,
                north: {texture: "#screen"},
                south: textureBack,
                up: textureBack,
                west: textureBack
              },
              from: [0, 0, 0],
              to: [16, 16, 16]
            }
          ],
          textures: {
            back: "cinemashow:block/screen_base",
            screen: `cinemashow:block/${tileResourceName}`
          }
        }))

        ROTATIONS.forEach(([facing, rotation]) => {
          variants[`facing=${facing},x=${x},y=${y}`] = {
            ...rotation,
            model: `cinemashow:block/${tileResourceName}`,
          }
        })
      }
    }

    zip.file(`${assetsPath}/blockstates/${commonName}.json`, toJson({variants}))
  
    const content = await zip.generateAsync({type:"blob"})
    saveAs(content, "cinemashow.done.jar")
  }

  return (
    <div className="App">
      <div>
        <input type="file" multiple onChange={handleFileEvent} accept='image/png, image/jpeg' />
      </div>
      <div>
        {
          Array.from(Array(NUMBER_OF_FRAMES).keys()).map(index => (
            <span key={`f_${index}`}>
              <canvas id={`f_${index}`} width={10} height={10} />
              &nbsp;
            </span>
          ))
        }
      </div>
      <div>
        <button onClick={generateTextures}>Generate Resources</button>
      </div>
    </div>
  )
}

export default App
