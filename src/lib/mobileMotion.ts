export const mobileEase = [0.22, 1, 0.36, 1] as const

export const mobileViewport = {
  once: true,
  margin: '-10% 0px -6% 0px',
} as const

export const mobileSpring = {
  type: 'spring' as const,
  stiffness: 280,
  damping: 30,
  mass: 0.85,
}

export const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
}

export const fadeUpSubtle = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
}

export const scaleIn = {
  hidden: { opacity: 0, scale: 0.97 },
  visible: { opacity: 1, scale: 1 },
}

export const staggerContainer = (stagger = 0.1, delayChildren = 0.05) => ({
  hidden: {},
  visible: {
    transition: { staggerChildren: stagger, delayChildren },
  },
})
