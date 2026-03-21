export interface Task {
  id: string
  title: string
  description: string
  priority: 'low' | 'medium' | 'high'
  status: 'pending' | 'in-progress' | 'completed'
  photo?: string
  thumbnail?: string
  location: {
    lat: number
    lng: number
  }
  createdAt: Date
}

// Generate a small circular thumbnail from an image
export async function generateThumbnail(imageUrl: string, size: number = 40): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')
      if (ctx) {
        // Create circular clip
        ctx.beginPath()
        ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
        ctx.closePath()
        ctx.clip()
        
        // Draw image centered and cropped to square
        const minDim = Math.min(img.width, img.height)
        const sx = (img.width - minDim) / 2
        const sy = (img.height - minDim) / 2
        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size)
        
        resolve(canvas.toDataURL('image/jpeg', 0.7))
      } else {
        resolve('')
      }
    }
    img.onerror = () => resolve('')
    img.src = imageUrl
  })
}

// Mock tasks for demonstration
export const mockTasks: Task[] = [
  {
    id: '1',
    title: 'Fix streetlight',
    description: 'Streetlight at Main St is not working',
    priority: 'high',
    status: 'pending',
    location: { lat: 40.7128, lng: -74.006 },
    createdAt: new Date('2026-03-20'),
  },
  {
    id: '2',
    title: 'Repair pothole',
    description: 'Large pothole on Oak Avenue needs repair',
    priority: 'medium',
    status: 'pending',
    location: { lat: 40.7148, lng: -74.008 },
    createdAt: new Date('2026-03-19'),
  },
  {
    id: '3',
    title: 'Tree trimming',
    description: 'Overgrown tree blocking sidewalk',
    priority: 'low',
    status: 'in-progress',
    location: { lat: 40.7108, lng: -74.004 },
    createdAt: new Date('2026-03-18'),
  },
  {
    id: '4',
    title: 'Graffiti removal',
    description: 'Graffiti on the wall near park entrance',
    priority: 'medium',
    status: 'pending',
    location: { lat: 40.7138, lng: -74.002 },
    createdAt: new Date('2026-03-17'),
  },
  {
    id: '5',
    title: 'Broken bench',
    description: 'Park bench needs replacement',
    priority: 'low',
    status: 'pending',
    location: { lat: 40.7118, lng: -74.01 },
    createdAt: new Date('2026-03-16'),
  },
]
