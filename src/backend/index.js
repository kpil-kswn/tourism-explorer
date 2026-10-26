import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'

const app = new Hono()

app.use('*', logger())

app.use(
  '*',
  cors({
    origin: (origin, c) => {
      const allowedOrigins = [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        c.env?.DEV_DOMAIN,
        c.env?.STAGING_DOMAIN,
        c.env?.PROD_DOMAIN,
      ].filter(Boolean) 

      return allowedOrigins.includes(origin) ? origin : null
    },
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  })
)

app.get('/api/places', async (c) => {
  try {
    const lat = c.req.query('lat');
    const lon = c.req.query('lon');
    const categoryType = c.req.query('category') || 'sights';
    
    const limit = parseInt(c.req.query('limit')) || 20;
    const radius = parseInt(c.req.query('radius')) || 5000;
    const enrichCount = Math.min(limit, parseInt(c.req.query('enrichCount')) || 5); 
    
    const apiKey = c.env.GEOAPIFY_API_KEY; 

    if (!lat || !lon) return c.json({ error: 'Coordinates are required' }, 400);
    if (!apiKey) return c.json({ error: 'API key is missing' }, 500);

    let geoapifyCategory = 'tourism.sights'; 
    const intent = categoryType.toLowerCase();

    if (intent.includes('museum')) geoapifyCategory = 'entertainment.museum';
    else if (intent.includes('temple') || intent.includes('church') || intent.includes('mosque')) geoapifyCategory = 'building.place_of_worship';
    else if (intent.includes('park') || intent.includes('garden')) geoapifyCategory = 'leisure.park';
    else if (intent.includes('viewpoint')) geoapifyCategory = 'natural.viewpoint';
    else if (intent.includes('fort')) geoapifyCategory = 'heritage,building.historic';
    else if (intent.includes('monument') || intent.includes('historic') || intent.includes('landmark')) geoapifyCategory = 'heritage.monument,heritage';

    const placesUrl = `https://api.geoapify.com/v2/places?categories=${geoapifyCategory}&filter=circle:${lon},${lat},${radius}&limit=${limit}&apiKey=${apiKey}`;
    const placesResponse = await fetch(placesUrl);
    const placesData = await placesResponse.json();
    console.log("GEOAPIFY URL:", placesUrl);
    // FIXED: Catch Geoapify HTTP errors explicitly (Error 3)
    if (!placesResponse.ok) {
      return c.json({ 
        error: 'Geoapify API failed', 
        details: placesData.message || placesResponse.statusText 
      }, placesResponse.status);
    }

    const filteredPlaces = (placesData.features || []).filter(place => {
      const cats = place.properties.categories || [];
      return !cats.includes('catering') && !cats.includes('accommodation') && !cats.includes('commercial');
    });

    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,precipitation_probability_max,weathercode&timezone=auto`;
    
    const [weatherRes, ...wikiResponses] = await Promise.all([
      fetch(weatherUrl).then(res => res.json()).catch(() => null),
      ...filteredPlaces.slice(0, enrichCount).map(place => {
        const placeName = place.properties.name || place.properties.city;
        if (!placeName) return Promise.resolve(null);
        
        // FIXED: Added User-Agent for Wikipedia API (Error 2)
        return fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(placeName)}`, {
          headers: {
            'User-Agent': 'TourismExplorer/1.0 (https://hyperdart.com; contact@hyperdart.com)'
          }
        })
          .then(res => res.ok ? res.json() : null)
          .catch(() => null);
      })
    ]);

    const enrichedPlaces = filteredPlaces.map((place, index) => {
      const wikiData = index < enrichCount ? wikiResponses[index] : null;
      return {
        id: place.properties.place_id,
        name: place.properties.name || place.properties.formatted || place.properties.city || "Point of Interest",
        distance: place.properties.distance,
        address: place.properties.address_line2,
        categories: place.properties.categories,
        description: wikiData?.extract || (place.properties.address_line2 ? `Located at ${place.properties.address_line2}` : "A local point of interest."),
        image: wikiData?.thumbnail?.source || null,
        lat: place.geometry.coordinates[1],
        lon: place.geometry.coordinates[0]
      };
    });

    return c.json({ weather: weatherRes?.daily || null, places: enrichedPlaces });
  } catch (error) {
    return c.json({ error: 'Failed to fetch tourism data', details: error.message }, 500);
  }
});

export default app