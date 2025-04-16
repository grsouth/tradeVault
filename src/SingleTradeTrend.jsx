// src/SingleTradeTrend.jsx
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip);

export default function SingleTradeTrend({ trade, idx }) {
    const give = trade.giveHistory || [];
    const receive = trade.receiveHistory || [];
    const netHistory = give.map((g, i) => (receive[i] || 0) - g);
  
    return (
      <div className="mt-4">
        <Line
          data={{
            labels: netHistory.map((_, i) => `T-${netHistory.length - i}`),
            datasets: [
              {
                label: `Net History (Trade ${idx + 1})`,
                data: netHistory,
                borderColor: `hsl(${(idx * 67) % 360}, 70%, 60%)`,
                backgroundColor: 'transparent',
                borderWidth: 2,
                tension: 0.4,
              },
            ],
          }}
          options={{
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
              x: { display: false },
              y: {
                ticks: { color: '#ccc' },
                title: {
                  display: false,
                  text: 'Net Value',
                },
              },
            },
          }}
        />
      </div>
    );
  }
  
