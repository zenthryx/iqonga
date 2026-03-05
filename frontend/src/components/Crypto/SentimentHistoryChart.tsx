import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { SentimentSnapshot } from '../../services/cryptoService';

interface Props {
  token: string;
  data: SentimentSnapshot[];
}

export const SentimentHistoryChart: React.FC<Props> = ({ token, data }) => {
  const chartData = (data || []).map((d) => ({
    time: new Date(d.snapshot_time).toLocaleTimeString(),
    score: d.sentiment_score,
  }));

  return (
    <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-white">{token} Sentiment (recent)</h3>
        <span className="text-xs text-gray-400">{data.length} points</span>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="time" stroke="#9CA3AF" />
            <YAxis stroke="#9CA3AF" domain={[-100, 100]} />
            <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#1F2937' }} />
            <Line type="monotone" dataKey="score" stroke="#6366F1" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

