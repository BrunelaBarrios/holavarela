const MAX_WIDTH = 1280
const MAX_HEIGHT = 1280
const WEBP_QUALITY = 0.78
const MAX_FILE_SIZE_BYTES = 6 * 1024 * 1024

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

export async function fileToDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Selecciona un archivo de imagen valido.")
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error("La imagen es demasiado pesada. Usa una menor a 6 MB.")
  }

  const image = await loadImage(file)
  const widthRatio = MAX_WIDTH / Math.max(image.width || 1, 1)
  const heightRatio = MAX_HEIGHT / Math.max(image.height || 1, 1)
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

  const result = canvas.toDataURL("image/webp", WEBP_QUALITY)
  if (!result) {
    throw new Error("No se pudo convertir la imagen seleccionada.")
  }

  return result
}
