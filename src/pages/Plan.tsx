import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPlan, savePlan, setRecentPlanId } from '../db';
import { createHistoryManager } from '../history';
import { getConflictMap, getTableStats, generateId } from '../utils';
import { getActivityLog, appendActivity, getOperatorName } from '../activityLog';
import type { Plan as PlanType, Command, ActivityEntry } from '../types';
import GuestPool from '../components/GuestPool';
import Canvas from '../components/Canvas';
import RulesPanel from '../components/RulesPanel';
import StatsBar from '../components/StatsBar';
import ActivityLog from '../components/ActivityLog';

export default function PlanPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [plan, setPlan] = useState<PlanType | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null);
  const [dragGuestId, setDragGuestId] = useState<string | null>(null);
  const historyRef = useRef<ReturnType<typeof createHistoryManager> | null>(null);
  const [conflictMap, setConflictMap] = useState<Map<string, string[]>>(new Map());
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [activityLog, setActivityLog] = useState<ActivityEntry[]>([]);
  const [operator, setOperator] = useState<string>(() => getOperatorName());

  useEffect(() => {
    if (!id) return;
    setActivityLog(getActivityLog(id));
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
    // 人数变更留痕：记录谁、什么时候、改了多少、退回几人
    if (command.type === 'setTableCapacity' && id) {
      const table = current.tables.find((t) => t.id === command.tableId);
      if (table && table.capacity !== command.capacity) {
        const entry: ActivityEntry = {
          id: generateId(),
          at: Date.now(),
          actor: getOperatorName(),
          tableId: table.id,
          tableLabel: table.label,
          oldCapacity: table.capacity,
          newCapacity: command.capacity,
          returnedCount: Math.max(0, table.seatOrder.length - command.capacity),
        };
        setActivityLog(appendActivity(id, entry));
      }
    }
  }, [id]);

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
        />
        <div className="right-sidebar">
          <RulesPanel
            plan={plan}
            dispatch={dispatch}
          />
          <ActivityLog
            entries={activityLog}
            operator={operator}
            onOperatorChange={setOperator}
          />
        </div>
      </div>
    </div>
  );
}
