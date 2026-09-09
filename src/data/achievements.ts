export type Achievement = {
  title: string
  context: string
  detail?: string
}

export const achievements: Achievement[] = [
  {
    title: 'Winner — GEO-HACK 3.0',
    context: 'GSSR Geospatial Hackathon',
    detail: 'Geospatial imagery',
  },
  {
    title: 'First Place — Li-Fi',
    context: 'Light-based data transmission system',
    detail: 'Semiconductor engineering project',
  },
  {
    title: 'Gold from Garbage Initiative',
    context: 'Recycled-materials engineering model',
  },
  {
    title: 'Engineering Model Development',
    context: 'Coursework recognition',
  },
]
