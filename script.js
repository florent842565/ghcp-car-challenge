"use strict";

// Stations suivies et coordonnées GPS
const STATIONS = [
	{ id: "Chamonix", name: "Chamonix", latitude: 45.9237, longitude: 6.8694 },
	{ id: "Verbier", name: "Verbier", latitude: 46.0961, longitude: 7.2266 },
	{ id: "Zermatt", name: "Zermatt", latitude: 46.0207, longitude: 7.7491 },
	{ id: "Megeve", name: "Megève", latitude: 45.8562, longitude: 6.6178 },
];

// Associe les codes météo Open-Meteo à une icône lisible
function getWeatherIcon(weatherCode) {
	const iconByCode = {
		0: "☀️",
		1: "🌤️",
		2: "⛅",
		3: "☁️",
		45: "🌫️",
		48: "🌫️",
		51: "🌦️",
		53: "🌦️",
		55: "🌧️",
		56: "🌧️",
		57: "🌧️",
		61: "🌧️",
		63: "🌧️",
		65: "🌧️",
		66: "🌧️",
		67: "🌧️",
		71: "🌨️",
		73: "❄️",
		75: "❄️",
		77: "❄️",
		80: "🌧️",
		81: "🌧️",
		82: "⛈️",
		85: "🌨️",
		86: "❄️",
		95: "⛈️",
		96: "⛈️",
		99: "⛈️",
	};

	return iconByCode[weatherCode] ?? "🌡️";
}

// Récupère la météo d'une station depuis l'API publique Open-Meteo
async function fetchStationWeather(station) {
	// Paramètres de requête:
	// - current: température, vent, code météo actuel
	// - hourly: neige horaire (snowfall)
	const params = new URLSearchParams({
		latitude: String(station.latitude),
		longitude: String(station.longitude),
		current: "temperature_2m,wind_speed_10m,weather_code",
		hourly: "snowfall",
		timezone: "auto",
	});

	const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
	const response = await fetch(url);

	if (!response.ok) {
		throw new Error(`Erreur API Open-Meteo: ${response.status} ${response.statusText}`);
	}

	const data = await response.json();

	// Données actuelles
	const temperature = data?.current?.temperature_2m ?? null;
	const wind = data?.current?.wind_speed_10m ?? null;
	const weatherCode = data?.current?.weather_code ?? null;
	const currentTime = data?.current?.time ?? null;

	// Aligne l'heure actuelle avec la série horaire pour obtenir la neige
	let snow = null;
	const timeIndex = data?.hourly?.time?.indexOf(currentTime);
	if (timeIndex !== -1 && timeIndex != null) {
		snow = data?.hourly?.snowfall?.[timeIndex] ?? null;
	}

	// Objet de retour attendu
	return {
		stationId: station.id,
		station: station.name,
		temperature,
		neige: snow,
		vent: wind,
		iconeMeteo: getWeatherIcon(weatherCode),
		weatherCode,
		observationTime: currentTime,
	};
}

function formatStatus(meteo) {
	const temperature = meteo.temperature != null ? `${Math.round(meteo.temperature)}°C` : "N/A";
	const neige = meteo.neige != null ? `${meteo.neige} mm neige` : "N/A neige";
	const vent = meteo.vent != null ? `${Math.round(meteo.vent)} km/h vent` : "N/A vent";
	return `${meteo.iconeMeteo} ${temperature} • ${neige} • ${vent}`;
}

function updateCardStatus(stationId, text) {
	const card = document.querySelector(`.station-card[data-station="${stationId}"]`);
	if (!card) {
		return;
	}

	const statusElement = card.querySelector(".status");
	if (!statusElement) {
		return;
	}

	statusElement.textContent = text;
}

async function loadStationsWeather() {
	const settledResults = await Promise.allSettled(
		STATIONS.map((station) => fetchStationWeather(station)),
	);

	settledResults.forEach((result, index) => {
		const station = STATIONS[index];

		if (result.status === "fulfilled") {
			updateCardStatus(station.id, formatStatus(result.value));
			return;
		}

		updateCardStatus(station.id, "⚠️ Données météo indisponibles");
		console.error(`Erreur météo ${station.name}:`, result.reason);
	});
}

loadStationsWeather();
