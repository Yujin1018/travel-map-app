import type { Itinerary } from '@/types/itinerary';

/**
 * 第一次打开、或本地没有有效数据时使用。
 * 坐标是公开景点的大致位置。分钟数是写死的示例，方便先看到界面。
 */
export function createSampleItinerary(): Itinerary {
  return {
    id: 'sample-trip',
    title: '我的行程',
    days: [
      {
        id: 'day-kyoto',
        dateLabel: '第 1 天',
        title: '京都半日',
        stops: [
          {
            id: 'stop-fushimi',
            name: '伏见稻荷大社',
            latitude: 34.96714,
            longitude: 135.77267,
            note: '从这里出发',
          },
          {
            id: 'stop-kiyomizu',
            name: '清水寺',
            latitude: 34.99486,
            longitude: 135.78505,
            note: '第二个停留点',
          },
          {
            id: 'stop-yasaka',
            name: '八坂神社',
            latitude: 35.00363,
            longitude: 135.77857,
            note: '这一天的最后一站',
          },
        ],
        sampleLegs: [
          {
            fromStopId: 'stop-fushimi',
            toStopId: 'stop-kiyomizu',
            minutes: 40,
            label: '示例',
          },
          {
            fromStopId: 'stop-kiyomizu',
            toStopId: 'stop-yasaka',
            minutes: 25,
            label: '示例',
          },
        ],
      },
    ],
  };
}
