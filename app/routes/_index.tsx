import { useState, useEffect } from "react";
import { LoaderFunction, json } from "@remix-run/node";
import { useLoaderData, useSearchParams } from "@remix-run/react";
import type { MetaFunction } from "@remix-run/node";

export const meta: MetaFunction = () => {
  return [
    { title: "New Remix App" },
    { name: "description", content: "Welcome to Remix!" },
  ];
};

type WeatherData = {
  location: string;
  current: {
    dt: number;
    temp: number;
    feels_like: number;
    pressure: number;
    humidity: number;
    wind_speed: number;
    weather: Array<{ description: string }>;
    sunrise: number;
    sunset: number;
  };
  daily: Array<{
    dt: number;
    temp: { min: number; max: number };
    weather: Array<{ description: string }>;
  }>;
};

export const loader: LoaderFunction = async ({ request }) => {
  const url = new URL(request.url);
  const zipCode = url.searchParams.get("zipCode") || "10001";
  const apiKey = process.env.OPENWEATHERMAP_API_KEY;

  try {
    // First, get lat/lon from zip code
    const geoUrl = `http://api.openweathermap.org/geo/1.0/zip?zip=${zipCode},US&appid=${apiKey}`;
    const geoResponse = await fetch(geoUrl);
    const geoData = await geoResponse.json();

    if (!geoResponse.ok) {
      throw new Error(`Geo API error: ${geoData.message || 'Unknown error'}`);
    }

    if (!geoData.lat || !geoData.lon) {
      throw new Error(`Invalid zip code: ${JSON.stringify(geoData)}`);
    }

    // Then, use lat/lon to get weather data
    const weatherUrl = `https://api.openweathermap.org/data/3.0/onecall?lat=${geoData.lat}&lon=${geoData.lon}&exclude=minutely,hourly,alerts&units=imperial&appid=${apiKey}`;
    const weatherResponse = await fetch(weatherUrl);
    const weatherData = await weatherResponse.json();

    if (!weatherResponse.ok) {
      throw new Error(`Weather API error: ${weatherData.message || 'Unknown error'}`);
    }

    if (!weatherData.current || !weatherData.daily) {
      throw new Error(`Invalid weather data: ${JSON.stringify(weatherData)}`);
    }

    return json({
      location: `${geoData.name}, ${geoData.country}`,
      current: weatherData.current,
      daily: weatherData.daily,
    });
  } catch (error) {
    console.error('Error fetching weather data:', error);
    return json({ error }, { status: 500 });
  }
};

export default function Index() {
  const [, setSearchParams] = useSearchParams();
  const weatherData = useLoaderData<WeatherData>();
  const [zipCode, setZipCode] = useState("10001");
  const [showExtra, setShowExtra] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    params.set("zipCode", zipCode);
    setSearchParams(params, {
      preventScrollReset: true,
    });
  };

  return (
    <div className="font-sans p-4 max-w-3xl mx-auto">
      <h1 className="text-3xl mb-4">Weather App</h1>
      
      {/* Zip code input and search button */}
      <form onSubmit={handleSearch} className="flex mb-4">
        <input
          type="text"
          value={zipCode}
          onChange={(e) => setZipCode(e.target.value)}
          className="border p-2 flex-grow"
          placeholder="Enter ZIP code"
        />
        <button
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 ml-2"
        >
          Search
        </button>
      </form>

      {/* Current conditions */}
      <div className="bg-gray-100 p-4 rounded-lg mb-4">
        <h2 className="text-2xl mb-2">{weatherData.location}</h2>
        <p>{weatherData.current.weather[0].description}</p>
        <p>Current: {Math.round(weatherData.current.temp)}°F</p>
        <p>Feels like: {Math.round(weatherData.current.feels_like)}°F</p>
        <p>High: {Math.round(weatherData.daily[0].temp.max)}°F</p>
        <p>Low: {Math.round(weatherData.daily[0].temp.min)}°F</p>
        
        <button
          onClick={() => setShowExtra(!showExtra)}
          className="bg-blue-500 text-white px-4 py-2 rounded mt-2"
        >
          {showExtra ? "Hide" : "Show"} Extra Info
        </button>
        
        {showExtra && (
          <div className="mt-2">
            <p>Wind Speed: {weatherData.current.wind_speed} mph</p>
            <p>Humidity: {weatherData.current.humidity}%</p>
            <p>Pressure: {weatherData.current.pressure} hPa</p>
            <p>Sunrise: {new Date(weatherData.current.sunrise * 1000).toLocaleTimeString()}</p>
            <p>Sunset: {new Date(weatherData.current.sunset * 1000).toLocaleTimeString()}</p>
          </div>
        )}
      </div>

      {/* 7-day forecast */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {weatherData.daily.slice(0, 7).map((day, index) => (
          <div key={index} className="bg-gray-100 p-4 rounded-lg">
            <p className="font-bold">{new Date(day.dt * 1000).toLocaleDateString()}</p>
            <p>{day.weather[0].description}</p>
            <p>High: {Math.round(day.temp.max)}°F</p>
            <p>Low: {Math.round(day.temp.min)}°F</p>
          </div>
        ))}
      </div>
    </div>
  );
}
