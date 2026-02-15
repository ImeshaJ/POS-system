export type Attachment = {
  name: string
  type: string
  size: number
  data: string | null
}

export const DEFAULT_ATTACHMENT_TYPE = "application/octet-stream"

export const cloneAttachments = (items?: Attachment[]) => (items || []).map((item) => ({ ...item }))

export const normalizeAttachments = (value: unknown, fallback?: Attachment[]) => {
  if (!value) return cloneAttachments(fallback)
  if (Array.isArray(value)) {
    return value.map((item) => ({
      name: typeof item?.name === "string" && item.name.trim() ? item.name : "attachment",
      type:
        typeof item?.type === "string" && item.type.trim() ? item.type : DEFAULT_ATTACHMENT_TYPE,
      size: Number(item?.size) || 0,
      data: typeof item?.data === "string" ? item.data : null,
    }))
  }
  return cloneAttachments(fallback)
}

export const buildAttachmentDataUrl = (attachment: Attachment) => {
  if (!attachment?.data) return null
  const type = attachment.type || DEFAULT_ATTACHMENT_TYPE
  return `data:${type};base64,${attachment.data}`
}

export const formatFileSize = (size: number) => {
  if (!size || size <= 0) return "0 B"
  const units = ["B", "KB", "MB", "GB"]
  const index = Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1)
  const value = size / Math.pow(1024, index)
  const precision = value >= 10 || index === 0 ? 0 : 1
  return `${value.toFixed(precision)} ${units[index]}`
}

export const readFileAsAttachment = (file: File): Promise<Attachment> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        resolve({
          name: file.name,
          type: file.type || DEFAULT_ATTACHMENT_TYPE,
          size: file.size,
          data: null,
        })
        return
      }
      const base64 = reader.result.includes(",") ? reader.result.split(",").pop() || "" : reader.result
      resolve({
        name: file.name,
        type: file.type || DEFAULT_ATTACHMENT_TYPE,
        size: file.size,
        data: base64,
      })
    }
    reader.onerror = () => reject(reader.error || new Error("Failed to read file"))
    reader.readAsDataURL(file)
  })
}
