const DEFAULT_MAX_WIDTH = 720
const DEFAULT_MAX_HEIGHT = 1440
const DEFAULT_INITIAL_WEBP_QUALITY = 0.72
const DEFAULT_MIN_WEBP_QUALITY = 0.4
const DEFAULT_TARGET_FILE_SIZE_BYTES = 160 * 1024
const MAX_FILE_SIZE_BYTES = 6 * 1024 * 1024

type FileToDataUrlOptions = {
  maxWidth?: number
  maxHeight?: number
  initialQuality?: number
  minQuality?: number
  targetFileSizeBytes?: number
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const image = new Image()

    image.onload = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(image)
    }

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error("No se pudo procesar la imagen seleccionada."))
    }

    image.src = objectUrl
  })
}

export async function fileToDataUrl(
  file: File,
  options: FileToDataUrlOptions = {}
): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Selecciona un archivo de imagen valido.")
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error("La imagen es demasiado pesada. Usa una menor a 6 MB.")
  }

  const image = await loadImage(file)
  const maxWidth = options.maxWidth ?? DEFAULT_MAX_WIDTH
  const maxHeight = options.maxHeight ?? DEFAULT_MAX_HEIGHT
  const initialQuality = options.initialQuality ?? DEFAULT_INITIAL_WEBP_QUALITY
  const minQuality = options.minQuality ?? DEFAULT_MIN_WEBP_QUALITY
  const targetFileSizeBytes =
    options.targetFileSizeBytes ?? DEFAULT_TARGET_FILE_SIZE_BYTES

  const widthRatio = maxWidth / Math.max(image.width || 1, 1)
  const heightRatio = maxHeight / Math.max(image.height || 1, 1)
  const scale = Math.min(1, widthRatio, heightRatio)

  const width = Math.max(1, Math.round(image.width * scale))
  const height = Math.max(1, Math.round(image.height * scale))

  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext("2d")
  if (!context) {
    throw new Error("No se pudo preparar la imagen seleccionada.")
  }

  context.drawImage(image, 0, 0, width, height)

  let currentWidth = width
  let currentHeight = height
  let quality = initialQuality
  let result = ""

  while (currentWidth > 0 && currentHeight > 0) {
    canvas.width = currentWidth
    canvas.height = currentHeight
    context.clearRect(0, 0, currentWidth, currentHeight)
    context.drawImage(image, 0, 0, currentWidth, currentHeight)

    quality = initialQuality

    while (quality >= minQuality) {
      result = canvas.toDataURL("image/webp", quality)
      if (!result) {
        throw new Error("No se pudo convertir la imagen seleccionada.")
      }

      const estimatedBytes = Math.ceil((result.length * 3) / 4)
      if (estimatedBytes <= targetFileSizeBytes) {
        return result
      }

      quality -= 0.08
    }

    currentWidth = Math.max(1, Math.round(currentWidth * 0.88))
    currentHeight = Math.max(1, Math.round(currentHeight * 0.88))
  }

  if (!result) {
    throw new Error("No se pudo convertir la imagen seleccionada.")
  }

  return result
}
