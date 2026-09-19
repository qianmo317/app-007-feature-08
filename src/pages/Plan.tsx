import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPlan, savePlan, setRecentPlanId } from '../db';
import { createHistoryManager } from '../history';
import { getConflictMap, getTableStats, generateId, getOperatorName, getAuditLog, appendAuditLog } from '../utils';
import type { Plan as PlanType, Command, AuditEntry } from '../types';
import GuestPool from '../components/GuestPool';
import Canvas from '../components/Canvas';
import RulesPanel from '../components/RulesPanel';
import StatsBar from '../components/StatsBar';
import AuditLogPanel from '../components/AuditLogPanel';

export default function PlanPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [plan, setPlan] = useState<PlanType | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null);
  const [dragGuestId, setDragGuestId] = useState<string | null>(null);
  const historyRef = useRef<ReturnType<typeof createHistoryManager> | null>(null);
  const [conflictMap, setConflictMap] = useState<Map<string, string[]>>(new Map());
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (id) setAuditLog(getAuditLog(id));
  }, [id]);

  useEffect(() => {
    if (!id) return;
    getPlan(id).then((p) => {
      if (!p) {
        const fallback = { id, name: '未命名方案', tables: [], guests: [], rules: [], updatedAt: Date.now() };
        historyRef.current = createHistoryManager(fallback);
        setPlan(fallback);
      } else {
        historyRef.current = createHistoryManager(p);
        setPlan(p);
        setRecentPlanId(id);
      }
      setLoading(false);
    });
  }, [id]);

  useEffect(() => {
    if (!plan) return;
    setConflictMap(getConflictMap(plan));
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      savePlan(plan);
    }, 500);
  }, [plan]);

  const dispatch = useCallback((command: Command) => {
    if (!historyRef.current) return;
    const current = historyRef.current.current();
    historyRef.current.push(current, command);
    setPlan(historyRef.current.current());
  }, []);

  const handleUndo = useCallback(() => {
    if (!historyRef.current) return;
    const p = historyRef.current.undo();
    if (p) setPlan(p);
  }, []);

  const handleRedo = useCallback(() => {
    if (!historyRef.current) return;
    const p = historyRef.current.redo();
    if (p) setPlan(p);
  }, []);

  // 修改某桌人数：分发命令（多出来的人自动回未分配池），并留一条审计记录
  const handleResizeTable = useCallback((tableId: string, capacity: number) => {
    if (!historyRef.current || !id) return;
    const current = historyRef.current.current();
    const table = current.tables.find((t) => t.id === tableId);
    if (!table || table.capacity === capacity) return;
    const returnedCount = Math.max(0, table.seatOrder.length - capacity);
    dispatch({ type: 'resizeTable', tableId, capacity });
    const entry: AuditEntry = {
      id: generateId(),
      at: Date.now(),
      actor: getOperatorName(),
      tableId,
      tableLabel: table.label,
      fromCapacity: table.capacity,
      toCapacity: capacity,
      returnedCount,
    };
    setAuditLog(appendAuditLog(id, entry));
  }, [id, dispatch]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleUndo, handleRedo]);

  if (loading) return <div className="plan-loading">加载中...</div>;
  if (!plan) return <div className="plan-loading">方案不存在</div>;

  const stats = getTableStats(plan);

  return (
    <div className="plan-page">
      <header className="plan-header">
        <div className="header-left">
          <button className="btn-back" onClick={() => navigate('/')}>返回</button>
          <input
            className="plan-name-input"
            value={plan.name}
            onChange={(e) => dispatch({ type: 'updatePlan', plan: { ...plan, name: e.target.value } })}
          />
        </div>
        <div className="header-actions">
          <button onClick={handleUndo} disabled={!historyRef.current?.canUndo()}>撤销</button>
          <button onClick={handleRedo} disabled={!historyRef.current?.canRedo()}>重做</button>
          <button onClick={() => navigate(`/plan/${plan.id}/print`)}>打印 / 导出</button>
        </div>
      </header>
      <StatsBar stats={stats} />
      <div className="plan-body">
        <GuestPool
          guests={plan.guests}
          selectedId={selectedGuestId}
          onSelect={setSelectedGuestId}
          onAdd={(g) => dispatch({ type: 'addGuest', guest: g })}
          onRemove={(gid) => dispatch({ type: 'removeGuest', guestId: gid })}
          onDragStart={setDragGuestId}
          conflictMap={conflictMap}
          onUpdate={(g) => {
            const guests = plan.guests.map((gg) => gg.id === g.id ? g : gg);
            dispatch({ type: 'updateGuests', guests });
          }}
        />
        <Canvas
          plan={plan}
          dragGuestId={dragGuestId}
          setDragGuestId={setDragGuestId}
          conflictMap={conflictMap}
          dispatch={dispatch}
          onResizeTable={handleResizeTable}
        />
        <div className="right-sidebar">
          <RulesPanel
            plan={plan}
            dispatch={dispatch}
          />
          <AuditLogPanel entries={auditLog} />
        </div>
      </div>
    </div>
  );
}
