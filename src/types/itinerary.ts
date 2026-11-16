/** 行程里的一个停留点。坐标是 WGS84，和 Mapbox 使用的经纬度一致。 */
export type Stop = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  note?: string;
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
};
