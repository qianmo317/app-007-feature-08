import { useState, useRef, useEffect } from 'react';
import type { Plan, Table, Command } from '../types';
import { generateId } from '../utils';
import { CAPACITY_MIN, CAPACITY_MAX_BY_SHAPE } from '../types';

const SHAPE_NAMES: Record<Table['shape'], string> = { round: '圆桌', rect: '长条桌' };

interface Props {
  plan: Plan;
  dragGuestId: string | null;
  setDragGuestId: (id: string | null) => void;
  conflictMap: Map<string, string[]>;
  dispatch: (cmd: Command) => void;
}

export default function Canvas({ plan, dragGuestId, setDragGuestId, conflictMap, dispatch }: Props) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [draggingTable, setDraggingTable] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [showTableMenu, setShowTableMenu] = useState<{ x: number; y: number } | null>(null);

  const handleDropOnCanvas = (e: React.DragEvent) => {
    e.preventDefault();
    if (!dragGuestId || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const table = plan.tables.find((t) => {
      const tx = t.x, ty = t.y;
      const w = t.shape === 'round' ? 120 : 160;
      const h = t.shape === 'round' ? 120 : 100;
      return x >= tx && x <= tx + w && y >= ty && y <= ty + h;
    });
    if (table) {
      const fromTable = plan.tables.find((t) => t.seatOrder.includes(dragGuestId));
      if (fromTable?.id === table.id) return;
      if (table.seatOrder.length >= table.capacity) {
        alert('该桌已满');
        return;
      }
      dispatch({
        type: 'moveGuest',
        guestId: dragGuestId,
        fromTableId: fromTable?.id || null,
        toTableId: table.id,
      });
    }
    setDragGuestId(null);
  };

  const handleTableMouseDown = (e: React.MouseEvent, table: Table) => {
    if ((e.target as HTMLElement).closest('.table-seats')) return;
    setDraggingTable(table.id);
    setSelectedTableId(table.id);
    setDragOffset({ x: e.clientX - table.x, y: e.clientY - table.y });
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!draggingTable) return;
      const x = e.clientX - dragOffset.x;
      const y = e.clientY - dragOffset.y;
      dispatch({
        type: 'updateTable',
        table: { ...plan.tables.find((t) => t.id === draggingTable)!, x: Math.max(0, x), y: Math.max(0, y) },
      });
    };
    const onUp = () => setDraggingTable(null);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [draggingTable, dragOffset, plan.tables, dispatch]);

  const addTable = (shape: 'round' | 'rect') => {
    const id = generateId();
    const count = plan.tables.filter((t) => t.shape === shape).length + 1;
    const table: Table = {
      id,
      label: `${shape === 'round' ? '圆' : '长'}桌${count}`,
      x: 50 + (plan.tables.length % 5) * 180,
      y: 50 + Math.floor(plan.tables.length / 5) * 160,
      shape,
      capacity: shape === 'round' ? 10 : 10,
      seatOrder: [],
    };
    dispatch({ type: 'addTable', table });
  };

  const removeTable = (tableId: string) => {
    if (!confirm('确定删除该桌？')) return;
    dispatch({ type: 'removeTable', tableId });
    setSelectedTableId(null);
  };

  const handleSeatDrop = (tableId: string, index: number) => {
    if (!dragGuestId) return;
    const fromTable = plan.tables.find((t) => t.seatOrder.includes(dragGuestId));
    const toTable = plan.tables.find((t) => t.id === tableId)!;
    if (toTable.seatOrder.includes(dragGuestId)) {
      // reorder within same table
      dispatch({ type: 'moveGuest', guestId: dragGuestId, fromTableId: tableId, toTableId: tableId, toIndex: index });
    } else {
      if (toTable.seatOrder.length >= toTable.capacity) {
        alert('该桌已满');
        return;
      }
      dispatch({ type: 'moveGuest', guestId: dragGuestId, fromTableId: fromTable?.id || null, toTableId: tableId, toIndex: index });
    }
    setDragGuestId(null);
  };

  return (
    <div className="canvas-panel">
      <div className="canvas-toolbar">
        <button onClick={() => addTable('round')}>+ 圆桌</button>
        <button onClick={() => addTable('rect')}>+ 长条桌</button>
      </div>
      <div
        className="canvas-area"
        ref={canvasRef}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDropOnCanvas}
        onContextMenu={(e) => { e.preventDefault(); setShowTableMenu({ x: e.clientX, y: e.clientY }); }}
        onClick={() => { setSelectedTableId(null); setShowTableMenu(null); }}
      >
        {plan.tables.map((table) => {
          const isSelected = selectedTableId === table.id;
          const isFull = table.seatOrder.length >= table.capacity;
          return (
            <div
              key={table.id}
              className={`table-item ${table.shape} ${isSelected ? 'selected' : ''} ${isFull ? 'full' : ''}`}
              style={{ left: table.x, top: table.y }}
              onMouseDown={(e) => handleTableMouseDown(e, table)}
            >
              <div className="table-label">
                {isSelected ? (
                  <input
                    value={table.label}
                    onChange={(e) => dispatch({ type: 'updateTable', table: { ...table, label: e.target.value } })}
                    onClick={(e) => e.stopPropagation()}
                    style={{ width: 80, fontSize: 13 }}
                  />
                ) : (
                  <>{table.label} ({table.seatOrder.length}/{table.capacity})</>
                )}
              </div>
              {isSelected && (
                <div
                  className="table-capacity-edit"
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  人数:
                  <CapacityEditor table={table} dispatch={dispatch} />
                  <span className="capacity-range">
                    {CAPACITY_MIN}–{CAPACITY_MAX_BY_SHAPE[table.shape]}人
                  </span>
                </div>
              )}
              <div className="table-empty-count">余 {Math.max(0, table.capacity - table.seatOrder.length)} 位</div>
              <div className="table-seats">
                {Array.from({ length: table.capacity }).map((_, i) => {
                  const gid = table.seatOrder[i];
                  const guest = gid ? plan.guests.find((g) => g.id === gid) : null;
                  const conflicts = gid ? conflictMap.get(gid) || [] : [];
                  const isConflict = conflicts.length > 0;
                  return (
                    <div
                      key={i}
                      className={`seat-cell ${gid ? 'occupied' : 'empty'} ${isConflict ? 'conflict' : ''}`}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => { e.stopPropagation(); handleSeatDrop(table.id, i); }}
                      onClick={(e) => { e.stopPropagation(); }}
                    >
                      {guest ? (
                        <>
                          <span className="seat-name">{guest.name}</span>
                          {isConflict && <span className="seat-conflict">!</span>}
                        </>
                      ) : (
                        <span className="seat-empty">{i + 1}号</span>
                      )}
                    </div>
                  );
                })}
              </div>
              {isSelected && (
                <div className="table-actions">
                  <button onClick={(e) => { e.stopPropagation(); removeTable(table.id); }}>删除</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {showTableMenu && (
        <div className="context-menu" style={{ left: showTableMenu.x, top: showTableMenu.y }}>
          <div onClick={() => { addTable('round'); setShowTableMenu(null); }}>添加圆桌</div>
          <div onClick={() => { addTable('rect'); setShowTableMenu(null); }}>添加长条桌</div>
        </div>
      )}
    </div>
  );
}

function CapacityEditor({ table, dispatch }: { table: Table; dispatch: (cmd: Command) => void }) {
  const [value, setValue] = useState(String(table.capacity));
  const max = CAPACITY_MAX_BY_SHAPE[table.shape];

  // 外部（撤销/重做、其他操作）改变容量时同步输入框
  useEffect(() => {
    setValue(String(table.capacity));
  }, [table.capacity]);

  const commit = () => {
    const val = parseInt(value, 10);
    if (Number.isNaN(val)) {
      setValue(String(table.capacity));
      return;
    }
    if (val < CAPACITY_MIN) {
      alert(`每桌至少 ${CAPACITY_MIN} 人，不能再少了`);
      setValue(String(table.capacity));
      return;
    }
    if (val > max) {
      alert(`${SHAPE_NAMES[table.shape]}最多 ${max} 人，不能超过上限`);
      setValue(String(table.capacity));
      return;
    }
    if (val !== table.capacity) {
      dispatch({ type: 'setTableCapacity', tableId: table.id, capacity: val });
    } else {
      setValue(String(table.capacity));
    }
  };

  return (
    <input
      type="number"
      value={value}
      min={CAPACITY_MIN}
      max={max}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
      style={{ width: 40, marginLeft: 4 }}
    />
  );
}
