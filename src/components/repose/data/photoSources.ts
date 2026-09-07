import manifest from './asset-manifest.json'

/**
 * One place that knows how a photo's URLs are built.
 *
 * `Photo` renders from this and the preloader warms from it, so the two can
 * never disagree about which file the browser is going to ask for — which is
 * exactly what went wrong before: the loader fetched `zen-garden-01.avif`
 * while the page, at `sizes="40vw"` on a 1440 desktop, went and asked for
 * `zen-garden-01-720.avif`. A different URL is a cold fetch, and the picture
 * arrived after the reveal.
 */

interface AssetRecord {
  file: string
  nativeWidth?: number
  responsiveFile?: string
  responsiveAvifFile?: string
  responsiveJpegFile?: string
}

export const assetMeta: Record<string, AssetRecord> = Object.fromEntries(
  (manifest as AssetRecord[]).map((record) => [record.file.replace(/\.webp$/, ''), record]),
)

export interface PhotoSources {
  avifSet: string
  webpSet: string
  jpgSrc: string
}

/** The three candidate sets for one photo, in the order `<picture>` offers them. */
export function photoSources(name: string, assetBase: string, responsive = true): PhotoSources {
  const meta = assetMeta[name]
  const nativeWidth = meta?.nativeWidth || 1200
  const hasResponsive = responsive && Boolean(meta?.responsiveFile)
  return {
    avifSet: hasResponsive
      ? `${assetBase}/${name}-720.avif 720w, ${assetBase}/${name}.avif ${nativeWidth}w`
      : `${assetBase}/${name}.avif`,
    webpSet: hasResponsive
      ? `${assetBase}/${name}-720.webp 720w, ${assetBase}/${name}.webp ${nativeWidth}w`
      : `${assetBase}/${name}.webp`,
    jpgSrc: `${assetBase}/${name}.jpg`,
  }
}

/**
 * A photo as it is actually used on the page. `sizes` matters as much as the
 * name: it is half of what decides which candidate the browser picks, so a
 * spec without it would warm the wrong file just as the old list did.
 */
export interface PhotoSpec {
  readonly name: string
  /** Must match the `sizes` the component renders. */
  readonly sizes: string
  /** False for the few assets that ship without a 720w variant. */
  readonly responsive?: boolean
}
