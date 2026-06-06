import { useEffect, useState, useCallback } from 'react'
import { getDistanceKm } from '../lib/location-utils'
import type { Coords } from './useGeolocation'

export interface Stage {
  id: string
  name: string
  location: {
    lat: number
    lng: number
  }
}

export interface StageArrival {
  stage: Stage
  distance: number
  timestamp: number
  confidence: 'high' | 'medium' | 'low'
}

export interface UseStageDetectionOptions {
  stages: Stage[]
  currentPosition: Coords | null
  isActive: boolean
  arrivalThresholdMeters?: number
  departureThresholdMeters?: number
  onArrival?: (arrival: StageArrival) => void
  onDeparture?: (stage: Stage) => void
}

export function useStageDetection(options: UseStageDetectionOptions) {
  const {
    stages,
    currentPosition,
    isActive,
    arrivalThresholdMeters = 100, // 100m radius
    departureThresholdMeters = 200, // 200m to confirm departure
    onArrival,
    onDeparture,
  } = options

  const [nearestStage, setNearestStage] = useState<Stage | null>(null)
  const [distanceToNearest, setDistanceToNearest] = useState<number | null>(null)
  const [currentStage, setCurrentStage] = useState<Stage | null>(null)
  const [stageHistory, setStageHistory] = useState<StageArrival[]>([])

  const findNearestStage = useCallback(
    (position: Coords): { stage: Stage; distance: number } | null => {
      if (!stages.length) return null

      let nearest: Stage | null = null
      let minDistance = Infinity

      for (const stage of stages) {
        const distance = getDistanceKm(position, stage.location) * 1000 // Convert to meters
        if (distance < minDistance) {
          minDistance = distance
          nearest = stage
        }
      }

      return nearest ? { stage: nearest, distance: minDistance } : null
    },
    [stages],
  )

  const getConfidence = useCallback(
    (distance: number, accuracy: number | null): 'high' | 'medium' | 'low' => {
      const effectiveAccuracy = accuracy ?? 100

      if (distance < arrivalThresholdMeters / 2 && effectiveAccuracy < 20) {
        return 'high'
      }

      if (distance < arrivalThresholdMeters && effectiveAccuracy < 50) {
        return 'medium'
      }

      return 'low'
    },
    [arrivalThresholdMeters],
  )

  // Detect stage arrivals and departures
  useEffect(() => {
    if (!isActive || !currentPosition || !stages.length) return

    const result = findNearestStage(currentPosition)
    if (!result) return

    const { stage, distance } = result
    setNearestStage(stage)
    setDistanceToNearest(distance)

    // Arrival detection
    if (distance <= arrivalThresholdMeters && currentStage?.id !== stage.id) {
      const confidence = getConfidence(distance, currentPosition.accuracy)
      const arrival: StageArrival = {
        stage,
        distance,
        timestamp: Date.now(),
        confidence,
      }

      setCurrentStage(stage)
      setStageHistory((prev) => [...prev.slice(-9), arrival]) // Keep last 10
      onArrival?.(arrival)
    }

    // Departure detection
    if (currentStage && distance > departureThresholdMeters && currentStage.id !== stage.id) {
      onDeparture?.(currentStage)
      setCurrentStage(null)
    }
  }, [
    currentPosition,
    stages,
    isActive,
    arrivalThresholdMeters,
    departureThresholdMeters,
    currentStage,
    findNearestStage,
    getConfidence,
    onArrival,
    onDeparture,
  ])

  const getUpcomingStages = useCallback(
    (limit: number = 3): Stage[] => {
      if (!currentStage) return stages.slice(0, limit)

      const currentIndex = stages.findIndex((s) => s.id === currentStage.id)
      if (currentIndex === -1) return stages.slice(0, limit)

      return stages.slice(currentIndex + 1, currentIndex + 1 + limit)
    },
    [currentStage, stages],
  )

  const getRecentStages = useCallback(
    (limit: number = 3): StageArrival[] => {
      return stageHistory.slice(-limit).reverse()
    },
    [stageHistory],
  )

  return {
    nearestStage,
    distanceToNearest,
    currentStage,
    stageHistory,
    getUpcomingStages,
    getRecentStages,
  }
}
