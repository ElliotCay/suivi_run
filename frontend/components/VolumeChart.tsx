import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface VolumeChartProps {
  data: Array<{
    week: string
    total_distance: number
  }>
}

export default function VolumeChart({ data }: VolumeChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="week" />
        <YAxis label={{ value: 'km', angle: -90, position: 'insideLeft' }} />
        <Tooltip />
        <Line
          type="monotone"
          dataKey="total_distance"
          stroke="#8884d8"
          strokeWidth={2}
          name="Volume (km)"
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
