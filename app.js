(function prepareGVizJSONP(){
    window.google = window.google || {};
    google.visualization = google.visualization || {};
    google.visualization.Query = google.visualization.Query || {};
    // ให้สคริปต์จาก Google เรียกมาที่ onSheetLoad ของเรา
    google.visualization.Query.setResponse = function (res) {
      try { onSheetLoad(res); } catch (e) { console.error(e); }
    };
  })();
/* ====== CONFIG ====== */
const SHEET_ID   = '1DrF40wxE4UuWPnnQTuz4DlVpuZtv4CPtx5wBk1C1IpM';      // เช่น 1AbCdEfGhIJ...
const SHEET_NAME = 'Sheet1';    // เช่น 'Sheet1'

/* ====== STATE ====== */
let map;                     // main Google Map
let modalMap;                // map inside modal
let allPlaces = [];          // raw data
let markers = [];            // google.maps.Marker[]
let markerByIndex = {};      // index -> marker

/* ====== INIT MAP ====== */
window.initMap = function initMap() {
  // Osaka center
  const OSAKA = { lat: 34.6937, lng: 135.5023 };
  map = new google.maps.Map(document.getElementById('map'), {
    center: OSAKA,
    zoom: 12,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: true,
  });

  // load sheet via JSONP (GViz)
  loadSheetJsonp();
  bindControls();
};

/* ==== GViz JSONP Bridge (สำคัญ) ==== */


  
/* ====== LOAD SHEET (JSONP) ====== */
function loadSheetJsonp(){
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?sheet=${encodeURIComponent(SHEET_NAME)}&tqx=out:json`;
    const s = document.createElement('script');
    s.src = url;
    s.referrerPolicy = 'no-referrer';
    s.onerror = () => alert('โหลดข้อมูลจาก Google Sheet ไม่สำเร็จ (ตรวจสอบการ Publish และสิทธิ์การเข้าถึง)');
    document.body.appendChild(s);
  }
  

// This function name must match responseHandler above
window.onSheetLoad = function onSheetLoad(json){
console.log(json);

  try{
    const rows = json.table.rows || [];
    // Expecting columns in order: Category, Title, Location, ImageURL, Travel
    allPlaces = rows
      .map(r => r.c)
      .filter(Boolean)
      .map((c, idx) => {
        const cat   = (c[0]?.v ?? '').toString().trim();
        const title = (c[1]?.v ?? '').toString().trim();
        const loc   = (c[2]?.v ?? '').toString().trim();
        const img   = (c[3]?.v ?? '').toString().trim();
        const travel= (c[4]?.v ?? '').toString().trim();

        const [latStr, lngStr] = loc.split(',').map(s => s?.trim());
        const lat = Number(latStr), lng = Number(lngStr);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

        return { idx, cat, title, lat, lng, img, travel };
      })
      .filter(Boolean);

    // build UI
    buildCategoryFilter();
    createMarkers(allPlaces);
    renderList();
  }catch(e){
    console.error(e);
    alert('โครงสร้างชีตไม่ตรงตามที่กำหนด (Category, Title, Location, ImageURL, Travel)');
  }
};

/* ====== MARKERS ====== */
function createMarkers(data){
  // clear old
  markers.forEach(m => m.setMap(null));
  markers = []; markerByIndex = {};

  data.forEach(place => {
    const m = new google.maps.Marker({
      position: {lat: place.lat, lng: place.lng},
      map,
      title: place.title,
      animation: google.maps.Animation.DROP,
    });
    m.addListener('click', () => openModal(place));
    markers.push(m);
    markerByIndex[place.idx] = m;
  });
}

/* ====== LIST & FILTER ====== */
function bindControls(){
  const q = document.getElementById('searchInput');
  const sel = document.getElementById('categorySelect');
  q.addEventListener('input', renderList);
  sel.addEventListener('change', renderList);
}

function buildCategoryFilter(){
  const sel = document.getElementById('categorySelect');
  const uniq = Array.from(new Set(allPlaces.map(p => p.cat).filter(Boolean))).sort((a,b)=>a.localeCompare(b,'th'));
  uniq.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat; opt.textContent = cat;
    sel.appendChild(opt);
  });
}

function renderList(){
  const q = (document.getElementById('searchInput').value || '').toLowerCase();
  const sel = document.getElementById('categorySelect').value;

  const filtered = allPlaces.filter(p => {
    const inCat = sel === 'all' || p.cat === sel;
    const inText = [p.title, p.travel, p.cat].join(' ').toLowerCase().includes(q);
    return inCat && inText;
  });

  // Show/Hide markers to match filter
  markers.forEach(m => m.setMap(null));
  filtered.forEach(p => markerByIndex[p.idx]?.setMap(map));

  const grid = document.getElementById('cardList');
  grid.innerHTML = '';
  filtered.forEach(place => grid.appendChild(card(place)));

  // Ifมีผลลัพธ์ ให้ซูมพอดี
  if (filtered.length){
    const bounds = new google.maps.LatLngBounds();
    filtered.forEach(p => bounds.extend({lat:p.lat,lng:p.lng}));
    map.fitBounds(bounds, 80);
  }
}

function card(place){
  const el = document.createElement('article');
  el.className = 'card';
  el.innerHTML = `
    <img class="card__img" src="${escapeHtml(place.img || '')}" alt="">
    <div class="card__body">
      <span class="badge">${escapeHtml(place.cat || 'อื่น ๆ')}</span>
      <h3 class="card__title">${escapeHtml(place.title)}</h3>
      <div class="muted">การเดินทาง: ${escapeHtml(place.travel || '-')}</div>
    </div>
  `;

  // Click = open modal
  el.addEventListener('click', () => openModal(place));

  // Hover = bounce marker + pan
  el.addEventListener('mouseenter', () => {
    const m = markerByIndex[place.idx];
    if (!m) return;
    m.setAnimation(google.maps.Animation.BOUNCE);
    setTimeout(()=>m.setAnimation(null), 700);
  });

  return el;
}

/* ====== MODAL ====== */
function openModal(place){
  const modal = document.getElementById('modal');
  modal.setAttribute('aria-hidden','false');
  document.body.style.overflow='hidden';

  document.getElementById('modalImage').src   = place.img || '';
  document.getElementById('modalCategory').textContent = place.cat || 'อื่น ๆ';
  document.getElementById('modalTitle').textContent    = place.title;
  document.getElementById('modalTravel').textContent   = place.travel || '';

  const dirUrl = `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}&travelmode=walking`;
  const dirBtn = document.getElementById('dirBtn');
  dirBtn.href = dirUrl;

  // small map in modal
  setTimeout(() => {
    modalMap = new google.maps.Map(document.getElementById('modalMap'), {
      center: {lat:place.lat, lng:place.lng},
      zoom: 15,
      streetViewControl: false,
      mapTypeControl: false,
    });
    new google.maps.Marker({ position:{lat:place.lat,lng:place.lng}, map: modalMap, title: place.title });
  }, 0);

  // close handlers
  modal.querySelectorAll('[data-close]').forEach(btn=>{
    btn.onclick = closeModal;
  });
  window.addEventListener('keydown', onEscClose);
}

function closeModal(){
  const modal = document.getElementById('modal');
  modal.setAttribute('aria-hidden','true');
  document.body.style.overflow='';
  window.removeEventListener('keydown', onEscClose);
}
function onEscClose(e){ if (e.key === 'Escape') closeModal(); }

/* ====== UTILS ====== */
function escapeHtml(s=''){
  return s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}
