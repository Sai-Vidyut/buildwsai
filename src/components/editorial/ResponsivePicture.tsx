import { projectPictureSizes, projectSrcSet } from '../../lib/media'

type ResponsivePictureProps = {
  src: string
  alt: string
  width: number
  height: number
  className?: string
  loading?: 'lazy' | 'eager'
  draggable?: boolean
  'aria-hidden'?: boolean
}

export function ResponsivePicture({
  src,
  alt,
  width,
  height,
  className = '',
  loading = 'lazy',
  draggable,
  'aria-hidden': ariaHidden,
}: ResponsivePictureProps) {
  return (
    <picture>
      <source srcSet={projectSrcSet(src)} sizes={projectPictureSizes(width)} type="image/webp" />
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading={loading}
        decoding="async"
        draggable={draggable}
        aria-hidden={ariaHidden}
        className={className}
      />
    </picture>
  )
}
