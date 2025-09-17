// URL ของ API ที่เราสร้างจาก Google Apps Script
const API_URL = 'https://script.google.com/macros/s/AKfycbz09b2mLM45a9KDFnJS1wQdAEIrF9jxl4-NEdUJWNctn5yvmgrpD-hfloZSVBLU2sRB/exec';

// Global variables
let allData = [];
let map; // ตัวแปรสำหรับแผนที่
let markers = []; // Array สำหรับเก็บหมุดทั้งหมด

// DOM Elements
const grid = document.getElementById('card-grid');
const searchBox = document.getElementById('search-box');
const categorySelect = document.getElementById('category-select');

// ฟังก์ชันนี้จะถูกเรียกโดย callback จาก Google Maps API
async function initialize() {
    displayLoader();
    setupMap(); // ตั้งค่าแผนที่ก่อน
    try {
        const response = await fetch(API_URL);
        allData = await response.json();
        setupFilters();
        displayData(allData);
    } catch (error) {
        grid.innerHTML = '<p>เกิดข้อผิดพลาดในการโหลดข้อมูล</p>';
        console.error('Error fetching data:', error);
    }
}

// แสดงตัวโหลดข้อมูล (เหมือนเดิม)
function displayLoader() {
    grid.innerHTML = '<p class="loader">Loading data...</p>';
}

// --- ส่วนที่แก้ไข ---
// ตั้งค่าแผนที่ Google Maps
function setupMap() {
    // ตั้งค่าเริ่มต้นให้แผนที่ซูมมาที่กรุงเทพฯ
    map = new google.maps.Map(document.getElementById('map'), {
        center: { lat: 34.6775704, lng: 135.4036366 },
        zoom: 12,
        mapId: 'YOUR_MAP_ID' // Optional: for custom styling in Cloud Console
    });
}

// สร้างปุ่ม Filter (เหมือนเดิม)
function setupFilters() {
    const categories = ['All', ...new Set(allData.map(item => item.Category))];
    
    // เปลี่ยนจากการสร้างปุ่ม มาเป็นการสร้าง option ใน select
    categorySelect.innerHTML = categories.map(cat => 
        `<option value="${cat}">${cat}</option>`
    ).join('');
    
    // เพิ่ม Event Listener ให้กับ select (dropdown)
    // เมื่อมีการเปลี่ยนแปลงค่า (เลือก category ใหม่) ให้ทำการกรองข้อมูล
    categorySelect.addEventListener('change', filterAndDisplay);
}

// กรองข้อมูลและแสดงผล (เหมือนเดิม)
function filterAndDisplay() {
    // เปลี่ยนวิธีการดึงค่า category ที่ถูกเลือก
    // จากการหาปุ่ม .active มาเป็นการดึง value จาก dropdown ที่ถูกเลือกโดยตรง
    const category = categorySelect.value;
    const searchTerm = searchBox.value.toLowerCase();

    let filteredData = allData.filter(item => {
        const matchesCategory = (category === 'All' || item.category === category);
        const matchesSearch = item.name.toLowerCase().includes(searchTerm);
        return matchesCategory && matchesSearch;
    });

    displayData(filteredData);
}


// --- ส่วนที่แก้ไข ---
// แสดงผลข้อมูลเป็นการ์ดและปักหมุดบน Google Maps
function displayData(data) {
    grid.innerHTML = '';
    
    // ล้างหมุดเก่าบนแผนที่
    markers.forEach(marker => marker.setMap(null));
    markers = [];

    if (data.length === 0) {
        grid.innerHTML = '<p>ไม่พบข้อมูลที่ตรงกัน</p>';
        return;
    }

    data.forEach(item => {
        // สร้าง Card (เหมือนเดิม)
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <img src="${item.ImageUrl}" alt="${item.Name}" loading="lazy">
            <div class="card-content">
                <span class="category">${item.Category}</span>
                <h3>${item.Name}</h3>
                <p><strong>การเดินทาง:</strong> ${item.travel}</p>
            </div>
        `;
        grid.appendChild(card);

        // ปักหมุดบน Google Maps
        if (item.Lat && item.Long) {
            const lat = parseFloat(item.Lat);
            const lng = parseFloat(item.Long);

            const marker = new google.maps.Marker({
                position: { lat: lat, lng: lng },
                map: map,
                title: item.Name
            });

            // สร้าง InfoWindow (กล่องข้อความเมื่อคลิกที่หมุด)
            const infowindow = new google.maps.InfoWindow({
                content: `<b>${item.Name}</b><br>${item.Category}`
            });

            marker.addListener('click', () => {
                infowindow.open(map, marker);
            });
            
            markers.push(marker); // เก็บ marker ไว้ใน array เพื่อล้างทีหลัง
        }
    });
}

// Event Listeners (เหมือนเดิม)
searchBox.addEventListener('input', filterAndDisplay);
// searchBox.addEventListener('input', filterAndDisplay);

// ไม่ต้องเรียก initialize() ที่นี่แล้ว เพราะ callback ใน HTML จะเรียกให้เอง