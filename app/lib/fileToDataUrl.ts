const MAX_DIMENSION = 1600
const JPEG_QUALITY = 0.82

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

  const image = await loadImage(file)
  const scale = Math.min(
    1,
    MAX_DIMENSION / Math.max(image.width || 1, image.height || 1)
  )

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

  const result = canvas.toDataURL("image/jpeg", JPEG_QUALITY)
  if (!result) {
    throw new Error("No se pudo convertir la imagen seleccionada.")
  }

  return result
}
