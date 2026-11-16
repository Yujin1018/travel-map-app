import type { Stop } from '@/types/itinerary';

/** 与 Mapbox 文档里的 CDN 入门示例同一版本。 */
const MAPBOX_GL_VERSION = '3.35.0';

/**
 * 在 Expo Go 里用网页版 Mapbox 画出已有地点。
 * 地点之间是按顺序连起来的虚线，不是道路导航。
 */
export function buildMapHtml(token: string, stops: Stop[]): string {
  const payload = JSON.stringify(
    stops.map((stop, index) => ({
      name: stop.name,
      longitude: stop.longitude,
      latitude: stop.latitude,
      order: index + 1,
    })),
  ).replace(/</g, '\\u003c');
  const tokenLiteral = JSON.stringify(token);

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<link href="https://api.mapbox.com/mapbox-gl-js/v${MAPBOX_GL_VERSION}/mapbox-gl.css" rel="stylesheet" />
<script src="https://api.mapbox.com/mapbox-gl-js/v${MAPBOX_GL_VERSION}/mapbox-gl.js"></script>
<style>
  html, body, #map { margin: 0; height: 100%; width: 100%; }
  body { background: #d7e6e4; }
  .msg {
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100%;
    margin: 0;
    padding: 28px;
    color: #1c2430;
    font-family: "PingFang SC", "Noto Sans SC", "Microsoft YaHei", sans-serif;
    line-height: 1.6;
    font-size: 16px;
    text-align: center;
  }
  .marker {
    width: 28px;
    height: 28px;
    border-radius: 14px;
    background: #0e6b63;
    color: #fff;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid #fff;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.28);
    font-size: 13px;
    font-family: sans-serif;
  }
</style>
</head>
<body>
<div id="map"></div>
<script>
  const stops = ${payload};
  const token = ${tokenLiteral};

  function showMessage(text) {
    document.body.innerHTML = '<p class="msg">' + text + '</p>';
  }

  if (!window.mapboxgl) {
    showMessage('地图库没有加载。请检查网络后再打开这一页。');
  } else {
    try {
      const first = stops[0];
      const map = new mapboxgl.Map({
        accessToken: token,
        container: 'map',
        style: 'mapbox://styles/mapbox/streets-v12',
        language: 'zh-Hans',
        center: first ? [first.longitude, first.latitude] : [104, 35],
        zoom: first ? 11 : 2
      });

      map.on('load', function () {
        if (stops.length >= 2) {
          map.addSource('route', {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: stops.map(function (stop) {
                  return [stop.longitude, stop.latitude];
                })
              }
            }
          });
          map.addLayer({
            id: 'route',
            type: 'line',
            source: 'route',
            layout: { 'line-cap': 'round', 'line-join': 'round' },
            paint: {
              'line-color': '#C4622D',
              'line-width': 4,
              'line-dasharray': [1.4, 1.2]
            }
          });
        }

        if (stops.length === 0) {
          return;
        }

        const bounds = new mapboxgl.LngLatBounds();
        stops.forEach(function (stop) {
          const el = document.createElement('div');
          el.className = 'marker';
          el.textContent = String(stop.order);
          new mapboxgl.Marker({ element: el })
            .setLngLat([stop.longitude, stop.latitude])
            .setPopup(new mapboxgl.Popup({ offset: 24 }).setText(stop.order + '. ' + stop.name))
            .addTo(map);
          bounds.extend([stop.longitude, stop.latitude]);
        });

        if (stops.length === 1) {
          map.setCenter([stops[0].longitude, stops[0].latitude]);
          map.setZoom(13);
        } else {
          map.fitBounds(bounds, { padding: 56, maxZoom: 14, duration: 0 });
        }
      });

      map.on('error', function (event) {
        const error = event && event.error;
        const status = error && error.status;
        const message = error && error.message ? String(error.message) : '';
        if (status === 401 || status === 403 || /access token|unauthorized/i.test(message)) {
          showMessage('Mapbox 没有接受这个令牌。请检查 .env 里的公开令牌是不是以 pk. 开头，保存后重新运行 npx expo start。');
        }
      });
    } catch (error) {
      showMessage('地图没有打开。请检查公开令牌和网络，然后重新运行应用。');
    }
  }
</script>
</body>
</html>`;
}
