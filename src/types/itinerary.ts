/**
 * sample、manual 的坐标可以保存在设备上。
 * mapbox 的坐标只留在本次打开的内存里，写入磁盘前会去掉。
 */
export type CoordinateSource = 'sample' | 'manual' | 'mapbox';

/** 行程里的一个停留点。坐标是 WGS84。 */
export type Stop = {
  id: string;
  name: string;
  latitude?: number;
  longitude?: number;
  note?: string;
  /** 只在本次打开时用来去重。不会写入设备。 */
  mapboxId?: string;
  coordinateSource?: CoordinateSource;
  /** 用户自己输入或改过的名称。搜索结果保存时用它，不用接口返回的整段文案。 */
  userLabel?: string;
};

/** 搜索或手动输入后、还没写入行程时的地点。 */
export type PlaceDraft = {
  name: string;
  latitude: number;
  longitude: number;
  mapboxId?: string;
  note?: string;
  coordinateSource?: CoordinateSource;
  userLabel?: string;
};

/**
 * 两个地点之间手写的示例用时。
 * 还没有接入路线规划，所以这里的分钟数不是导航结果。
 */
export type SampleLeg = {
  fromStopId: string;
  toStopId: string;
  minutes: number;
  label: string;
};

/** 一天的安排。地点数组的顺序就是计划的访问顺序。 */
export type DayPlan = {
  id: string;
  title: string;
  dateLabel: string;
  stops: Stop[];
  sampleLegs: SampleLeg[];
};

export type Itinerary = {
  id: string;
  title: string;
  days: DayPlan[];
  /** 还没排进某一天的地点。 */
  wishlist: Stop[];
  /** 地图和行程页当前看着的那一天。 */
  activeDayId: string;
};
