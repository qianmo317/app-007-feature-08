export type Guest = {
  id: string;
  name: string;
  tags: string[];
  partySize: number;
  childSeat?: boolean;
  note?: string;
};

export type TableShape = 'round' | 'rect';

export type Table = {
  id: string;
  label: string;
  x: number;
  y: number;
  shape: TableShape;
  capacity: number;
  seatOrder: string[]; // guest ids, length <= capacity
};

export type RuleType = 'together' | 'apart' | 'adjacent' | 'separate';

export type Rule = {
  id: string;
  type: RuleType;
  a: string; // guest id
  b: string; // guest id
};

export type Plan = {
  id: string;
  name: string;
  tables: Table[];
  guests: Guest[];
  rules: Rule[];
  updatedAt: number;
};

export type Command =
  | { type: 'updatePlan'; plan: Plan }
  | { type: 'updateTables'; tables: Table[] }
  | { type: 'updateGuests'; guests: Guest[] }
  | { type: 'updateRules'; rules: Rule[] }
  | { type: 'updateTable'; table: Table }
  | { type: 'resizeTable'; tableId: string; capacity: number }
  | { type: 'addGuest'; guest: Guest }
  | { type: 'removeGuest'; guestId: string }
  | { type: 'addTable'; table: Table }
  | { type: 'removeTable'; tableId: string }
  | { type: 'moveGuest'; guestId: string; fromTableId: string | null; toTableId: string | null; toIndex?: number }
  | { type: 'batch'; commands: Command[] };

export const TAG_OPTIONS = ['男方亲属', '女方亲属', '同事', '同学', '儿童', '素食'];

/** 每桌人数下限（两种桌型通用） */
export const MIN_CAPACITY = 4;

/** 每桌人数上限，圆桌与长条桌分开设置 */
export const MAX_CAPACITY: Record<TableShape, number> = {
  round: 20,
  rect: 12,
};

/** 人数变更审计记录（谁在什么时候改了哪桌的人数） */
export type AuditEntry = {
  id: string;
  at: number;
  actor: string;
  tableId: string;
  tableLabel: string;
  fromCapacity: number;
  toCapacity: number;
  /** 因缩小人数被退回未分配池的宾客数 */
  returnedCount: number;
};
