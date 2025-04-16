// src/TotalTrendChart.jsx
import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

export default function TotalTrendChart({ trades }) {
  // Use number of historical steps from first trade
  const steps = trades[0]?.giveHistory?.length || 6;
  const labels = Array(steps).fill(0).map((_, i) => `T-${steps - i}`);

  const cumulativeHistory = [];
  let runningTotal = 0;

  for (let i = 0; i < steps; i++) {
    // Sum net value at each timestep across all trades
    const netAtStep = trades.reduce((sum, t) => {
      const give = t.giveHistory?.[i] ?? 0;
      const receive = t.receiveHistory?.[i] ?? 0;
      return sum + (receive - give);
    }, 0);

    runningTotal += netAtStep;
    cumulativeHistory.push(+runningTotal.toFixed(2));
  }

  return (
    <div className="bg-gray-900 rounded-xl p-6 shadow-xl mb-8">
      <h3 className="text-xl font-bold text-amber-400 mb-4">Overall Trade Net Trend</h3>
      <Line
        data={{
          labels,
          datasets: [
            {
              label: 'Cumulative Net Value',
              data: cumulativeHistory,
              borderColor: '#facc15',
              backgroundColor: '#facc15',
              fill: false,
              borderWidth: 3,
              tension: 0.4,
            },
          ],
        }}
        options={{
          responsive: true,
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                color: '#fff',
              },
            },
          },
          scales: {
            x: {
              ticks: { color: '#ccc' },
            },
            y: {
              ticks: { color: '#ccc' },
              title: {
                display: true,
                text: 'Cumulative Net ($)',
                color: '#fff',
              },
            },
          },
        }}
      />
    </div>
  );
}
