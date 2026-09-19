import { useState, useRef, useEffect } from 'react';
import type { Plan, Table, Command } from '../types';
import { MIN_CAPACITY, MAX_CAPACITY } from '../types';
import { generateId } from '../utils';

interface Props {
  plan: Plan;
  dragGuestId: string | null;
  setDragGuestId: (id: string | null) => void;
  conflictMap: Map<string, string[]>;
  dispatch: (cmd: Command) => void;
  onResizeTable: (tableId: string, capacity: number) => void;
}

export default function Canvas({ plan, dragGuestId, setDragGuestId, conflictMap, dispatch, onResizeTable }: Props) {
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
          const emptyCount = Math.max(0, table.capacity - table.seatOrder.length);
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
                    onMouseDown={(e) => e.stopPropagation()}
                    style={{ width: 80, fontSize: 13 }}
                  />
                ) : (
                  <>
                    {table.label} ({table.seatOrder.length}/{table.capacity})
                    {emptyCount > 0 && <span className="table-empty-badge">空{emptyCount}位</span>}
                  </>
                )}
              </div>
              {isSelected && (
                <CapacityEditor table={table} onCommit={(cap) => onResizeTable(table.id, cap)} />
              )}
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
                        <span className="seat-empty">{i + 1}号位</span>
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

/**
 * 桌角人数编辑器：草稿式输入，失焦 / 回车才提交。
 * 超出该桌型上限时拦住不生效，并说明最多能到多少；
 * 缩小人数不受已坐人数限制，多出来的人由上层退回未分配池。
 */
function CapacityEditor({ table, onCommit }: { table: Table; onCommit: (capacity: number) => void }) {
  const [draft, setDraft] = useState(String(table.capacity));
  const [error, setError] = useState<string | null>(null);
  const max = MAX_CAPACITY[table.shape];
  const shapeName = table.shape === 'round' ? '圆桌' : '长条桌';

  // 外部变化（撤销/重做等）时同步草稿
  useEffect(() => {
    setDraft(String(table.capacity));
    setError(null);
  }, [table.capacity]);

  const commit = () => {
    const val = parseInt(draft, 10);
    if (isNaN(val)) {
      setDraft(String(table.capacity));
      setError(null);
      return;
    }
    if (val < MIN_CAPACITY) {
      setError(`最少 ${MIN_CAPACITY} 人`);
      return;
    }
    if (val > max) {
      setError(`${shapeName}最多 ${max} 人`);
      return;
    }
    setError(null);
    if (val !== table.capacity) onCommit(val);
  };

  const cancel = () => {
    setDraft(String(table.capacity));
    setError(null);
  };

  return (
    <div
      className="table-capacity-edit"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <span>人数:</span>
      <input
        type="number"
        className={error ? 'invalid' : ''}
        value={draft}
        min={MIN_CAPACITY}
        max={max}
        onChange={(e) => { setDraft(e.target.value); setError(null); }}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            commit();
            (e.target as HTMLInputElement).blur();
          } else if (e.key === 'Escape') {
            cancel();
            (e.target as HTMLInputElement).blur();
          }
        }}
      />
      <span className="capacity-range">{MIN_CAPACITY}~{max}</span>
      {error && <div className="capacity-error">{error}</div>}
    </div>
  );
}
