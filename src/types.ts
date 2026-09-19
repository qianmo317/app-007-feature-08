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

export type ActivityEntry = {
  id: string;
  at: number; // timestamp
  actor: string; // 操作者
  tableId: string;
  tableLabel: string;
  oldCapacity: number;
  newCapacity: number;
  returnedCount: number; // 退回未分配的人数
};

export type Command =
  | { type: 'updatePlan'; plan: Plan }
  | { type: 'updateTables'; tables: Table[] }
  | { type: 'updateGuests'; guests: Guest[] }
  | { type: 'updateRules'; rules: Rule[] }
  | { type: 'updateTable'; table: Table }
  | { type: 'addGuest'; guest: Guest }
  | { type: 'removeGuest'; guestId: string }
  | { type: 'addTable'; table: Table }
  | { type: 'removeTable'; tableId: string }
  | { type: 'setTableCapacity'; tableId: string; capacity: number }
  | { type: 'moveGuest'; guestId: string; fromTableId: string | null; toTableId: string | null; toIndex?: number }
  | { type: 'batch'; commands: Command[] };

export const TAG_OPTIONS = ['男方亲属', '女方亲属', '同事', '同学', '儿童', '素食'];

// 每桌人数下限，以及按桌型分开的人数上限
export const CAPACITY_MIN = 4;
export const CAPACITY_MAX_BY_SHAPE: Record<TableShape, number> = {
  round: 20,
  rect: 24,
};
