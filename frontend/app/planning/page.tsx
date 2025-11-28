import PlanningClient from "@/components/PlanningClient"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000"

async function getCurrentPlan() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/planning/current`, {
      cache: "no-store",
      next: { revalidate: 0 },
    })
    if (res.status === 404) return null
    if (!res.ok) {
      console.error("Failed to fetch current plan", res.statusText)
      return null
    }
    return await res.json()
  } catch (error) {
    console.error("Error fetching current plan:", error)
    return null
  }
}

async function getRaceObjective() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/race-objectives/current`, {
      cache: "no-store",
      next: { revalidate: 0 },
    })
    if (res.status === 404) return null
    if (!res.ok) return null
    return await res.json()
  } catch (error) {
    return null
  }
}

export default async function PlanningPage() {
  const [currentPlan, raceObjective] = await Promise.all([
    getCurrentPlan(),
    getRaceObjective()
  ])

  return <PlanningClient initialPlan={currentPlan} initialRaceObjective={raceObjective} />
}
