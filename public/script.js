// script.js
async function loadGoogleMaps() {
    const response = await fetch("/config");
    const config = await response.json();

    const script = document.createElement("script");

    script.src =
    "https://maps.googleapis.com/maps/api/js?key=" +
    config.googleApiKey +
    "&callback=initMap&loading=async";

    script.async = true;
    script.defer = true;

    document.head.appendChild(script);
}

loadGoogleMaps();
let map;
let markers = [];
let polyline;

function initMap() {
  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 30.3256, lng: 78.0419 }, // Dehradun
    zoom: 13
  });
}

async function getCoordinates(address) {
  const response = await fetch(`/geocode?address=${encodeURIComponent(address)}`);
  const data = await response.json();

  if (data.results && data.results.length > 0) {
    return data.results[0].geometry.location;
  } else {
    throw new Error("No coordinates found");
  }
}

function haversineDistance(loc1, loc2) {
  const R = 6371;
  const toRad = x => (x * Math.PI) / 180;
  const dLat = toRad(loc2.lat - loc1.lat);
  const dLng = toRad(loc2.lng - loc1.lng);

  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(loc1.lat)) * Math.cos(toRad(loc2.lat)) *
            Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function dijkstra(graph, start, end) {
  const dist = {};
  const prev = {};
  const unvisited = new Set(Object.keys(graph));

  for (let node of unvisited) dist[node] = Infinity;
  dist[start] = 0;

  while (unvisited.size) {
    let u = [...unvisited].reduce((a, b) => dist[a] < dist[b] ? a : b);
    unvisited.delete(u);

    if (u === end) break;

    for (let v in graph[u]) {
      let alt = dist[u] + graph[u][v];
      if (alt < dist[v]) {
        dist[v] = alt;
        prev[v] = u;
      }
    }
  }

  const path = [];
  for (let at = end; at; at = prev[at]) path.unshift(at);
  return path;
}

async function calculateShortestPath() {
  const start = document.getElementById("start").value;
  const end = document.getElementById("end").value;

  const places = [start, end];
  const coords = {};
  for (let place of places) {
    coords[place] = await getCoordinates(place);
  }

  const graph = {};
  for (let i = 0; i < places.length; i++) {
    graph[places[i]] = {};
    for (let j = 0; j < places.length; j++) {
      if (i !== j) {
        graph[places[i]][places[j]] = haversineDistance(coords[places[i]], coords[places[j]]);
      }
    }
  }

  const path = dijkstra(graph, start, end);

  if (polyline) polyline.setMap(null);
  markers.forEach(m => m.setMap(null));
  markers = [];

  const pathCoords = path.map(p => coords[p]);
  polyline = new google.maps.Polyline({
    path: pathCoords,
    strokeColor: "#FF0000",
    strokeWeight: 4,
  });
  polyline.setMap(map);

  pathCoords.forEach((pos, i) => {
    const marker = new google.maps.Marker({
      position: pos,
      map,
      label: path[i][0]
    });
    markers.push(marker);
  });

  map.setCenter(pathCoords[0]);
}


 