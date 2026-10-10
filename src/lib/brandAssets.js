const candidates = Object.entries(
  import.meta.glob('../assets/branding/*.{avif,gif,jpg,jpeg,png,svg,webp}', {
    eager: true,
    import: 'default',
    query: '?url',
  }),
).sort(([left], [right]) => left.localeCompare(right))

// Keep one image in src/assets/branding; its filename and supported extension can vary.
const [brandAssetPath, brandAssetUrl] = candidates[0] ?? []
const extension = brandAssetPath?.split('.').at(-1)?.toLowerCase()

const mimeTypes = {
  avif: 'image/avif',
  gif: 'image/gif',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  svg: 'image/svg+xml',
  webp: 'image/webp',
}

export { brandAssetUrl, brandAssetPath }
export const brandAssetMimeType = mimeTypes[extension] ?? 'image/png'
