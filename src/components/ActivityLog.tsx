import { useState } from 'react';
import type { ActivityEntry } from '../types';
import { setOperatorName } from '../activityLog';

interface Props {
  entries: ActivityEntry[];
  operator: string;
  onOperatorChange: (name: string) => void;
}

function formatTime(at: number): string {
  const d = new Date(at);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export default function ActivityLog({ entries, operator, onOperatorChange }: Props) {
  const [name, setName] = useState(operator);

  const commitName = () => {
    const trimmed = name.trim() || '我';
    setOperatorName(trimmed);
    onOperatorChange(trimmed);
    setName(trimmed);
  };

  return (
    <div className="activity-log">
      <h3>人数变更记录</h3>
      <div className="operator-row">
        操作者:
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={commitName}
          onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
          placeholder="我"
        />
      </div>
      <div className="activity-list">
        {entries.length === 0 && <div className="activity-empty">暂无变更记录</div>}
        {[...entries].reverse().map((e) => (
          <div key={e.id} className="activity-item">
            <div className="activity-main">
              <b>{e.actor}</b> 将 {e.tableLabel} 人数 {e.oldCapacity} → {e.newCapacity}
            </div>
            <div className="activity-meta">
              {formatTime(e.at)}
              {e.returnedCount > 0 && <span className="activity-returned">，{e.returnedCount} 人退回未分配</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
