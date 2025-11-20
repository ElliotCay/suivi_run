import TrainingBlockClient, { TrainingBlock } from "@/components/TrainingBlockClient"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000"

async function getCurrentBlock(): Promise<TrainingBlock | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/training/current-block`, {
      cache: "no-store",
      next: { revalidate: 0 },
    })
    if (res.status === 404) return null
    if (!res.ok) {
      console.error("Failed to fetch current block", res.statusText)
      return null
    }
    return await res.json()
  } catch (error) {
    console.error("Error fetching current block:", error)
    return null
  }
}

export default async function TrainingBlockPage() {
  const initialBlock = await getCurrentBlock()
  return <TrainingBlockClient initialBlock={initialBlock} />
}
