import { useState } from 'react';
import type { AuditEntry } from '../types';
import { getOperatorName, setOperatorName } from '../utils';

function formatTime(at: number): string {
  const d = new Date(at);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export default function AuditLogPanel({ entries }: { entries: AuditEntry[] }) {
  const [operator, setOperator] = useState(getOperatorName());

  return (
    <div className="audit-panel">
      <h3>人数变更记录</h3>
      <label className="operator-field">
        操作者
        <input
          value={operator}
          placeholder="我"
          onChange={(e) => {
            setOperator(e.target.value);
            setOperatorName(e.target.value.trim() || '我');
          }}
          onBlur={() => { if (!operator.trim()) setOperator('我'); }}
        />
      </label>
      <div className="audit-list">
        {entries.length === 0 && <div className="audit-empty">暂无变更记录</div>}
        {entries.map((e) => (
          <div key={e.id} className="audit-item">
            <div className="audit-time">{formatTime(e.at)} · {e.actor}</div>
            <div className="audit-text">
              {e.tableLabel} 人数 {e.fromCapacity} → {e.toCapacity}
              {e.returnedCount > 0 && (
                <span className="audit-returned">，退回 {e.returnedCount} 人至未分配</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
