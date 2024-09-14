// script.js

// Global variables
let gameData;
let userMarker;
let currentPointIndex = 0;
let totalPoints = 0;
let map;
let pointMarker;

// Fetch the game data from the URL
fetch('http://localhost:8000/game-data') // Replace with your actual URL
    .then(response => response.json())
    .then(data => {
        gameData = data;
        initMap();
        startGame();
    })
    .catch(error => {
        console.error('Error fetching game data:', error);
        document.getElementById('message').textContent = 'Failed to load game data.';
    });

// Initialize the map using the area coordinates from the game data
function initMap() {
    const area = gameData.area;
    const bounds = [
        [parseFloat(area.x1), parseFloat(area.y1)],
        [parseFloat(area.x2), parseFloat(area.y2)]
    ];

    // Initialize the map and fit it to the area bounds
    map = L.map('map').fitBounds(bounds);

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    // Add the first point marker
    updatePointMarker();
}

// Start tracking the user's location
function startGame() {
    if (navigator.geolocation) {
        navigator.geolocation.watchPosition(
            position => {
                const userLat = position.coords.latitude;
                const userLng = position.coords.longitude;
                checkUserPosition(userLat, userLng);
            },
            error => {
                console.error('Geolocation error:', error);
                document.getElementById('message').textContent = 'Unable to retrieve your location.';
            },
            { enableHighAccuracy: true }
        );
    } else {
        document.getElementById('message').textContent = 'Geolocation is not supported by your browser.';
    }
}

// Check if the user is within the map area
function checkUserPosition(lat, lng) {
    const area = gameData.area;
    const latMin = Math.min(parseFloat(area.x1), parseFloat(area.x2));
    const latMax = Math.max(parseFloat(area.x1), parseFloat(area.x2));
    const lngMin = Math.min(parseFloat(area.y1), parseFloat(area.y2));
    const lngMax = Math.max(parseFloat(area.y1), parseFloat(area.y2));

    if (lat >= latMin && lat <= latMax && lng >= lngMin && lng <= lngMax) {
        document.getElementById('message').textContent = 'You are on the map.';
        updateUserMarker(lat, lng);
        checkProximityToPoint(lat, lng);
    } else {
        document.getElementById('message').textContent = 'You are not on the map.';
    }
}

// Update the user's position marker on the map
function updateUserMarker(lat, lng) {
    if (userMarker) {
        userMarker.setLatLng([lat, lng]);
    } else {
        userMarker = L.marker([lat, lng]).addTo(map).bindPopup('You are here').openPopup();
    }
}

// Check if the user is close enough to the current point to reach
function checkProximityToPoint(userLat, userLng) {
    if (currentPointIndex >= gameData.points_to_reach.length) return;

    const point = gameData.points_to_reach[currentPointIndex];
    const pointLat = parseFloat(point.x);
    const pointLng = parseFloat(point.y);

    const distance = getDistanceFromLatLonInMeters(userLat, userLng, pointLat, pointLng);

    if (distance <= 20) { // Within 20 meters
        presentQuestion(point.question);
    }
}

// Calculate the distance between two coordinates in meters
function getDistanceFromLatLonInMeters(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

// Present the question to the user
function presentQuestion(questionText) {
    document.getElementById('question-section').style.display = 'block';
    document.getElementById('question-text').textContent = questionText;
}

// Event listener for the answer submission
document.getElementById('submit-answer').addEventListener('click', checkAnswer);

// Check the user's answer
function checkAnswer() {
    const userAnswer = document.getElementById('answer-input').value.trim();
    const point = gameData.points_to_reach[currentPointIndex];

    if (userAnswer === point.answer) {
        totalPoints += parseInt(point.points);
        currentPointIndex++;
        document.getElementById('answer-input').value = '';
        document.getElementById('question-section').style.display = 'none';

        if (currentPointIndex < gameData.points_to_reach.length) {
            document.getElementById('message').textContent = 'Correct! Proceed to the next point.';
            updatePointMarker();
        } else {
            document.getElementById('message').textContent = `Congrats you finished! Total points: ${totalPoints}`;
            if (pointMarker) map.removeLayer(pointMarker);
        }
    } else {
        document.getElementById('message').textContent = 'Wrong answer.';
    }
}

// Update the point to reach marker on the map
function updatePointMarker() {
    if (currentPointIndex >= gameData.points_to_reach.length) return;

    const point = gameData.points_to_reach[currentPointIndex];
    const pointLat = parseFloat(point.x);
    const pointLng = parseFloat(point.y);

    if (pointMarker) {
        pointMarker.setLatLng([pointLat, pointLng]);
    } else {
        pointMarker = L.marker([pointLat, pointLng], {
            icon: L.icon({
                iconUrl: 'https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34]
            })
        }).addTo(map).bindPopup('Point to Reach');
    }
}
