# Quick Setup Guide

## 1. Install Dependencies
```bash
npm install
```

## 2. Get Google Maps API Key
1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a new project or select existing one
3. Enable these APIs:
   - Geocoding API
   - Directions API
4. Create an API key
5. Copy the key

## 3. Set Up Environment
```bash
cp env.example .env
# Edit .env and add your API key
```

## 4. Build the Project
```bash
npm run build
```

## 5. Test the Server
```bash
# Test Google Maps API integration
npm run dev src/test.ts

# Start the MCP server
npm start
```

## 6. Configure Claude Desktop
Add this to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "spatial-copilot": {
      "command": "node",
      "args": ["/path/to/spatial-copilot-mcp/dist/index.js"],
      "env": {
        "GOOGLE_MAPS_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

## Available Tools

### `find_location`
Find coordinates for any location
```json
{
  "name": "find_location",
  "arguments": {
    "query": "Times Square, New York"
  }
}
```

### `find_precise_location`
Find exact coordinates for specific businesses/places
```json
{
  "name": "find_precise_location",
  "arguments": {
    "query": "Taco Bell",
    "location": "New York, NY"
  }
}
```

### `plan_trip`
Plan a trip with waypoints
```json
{
  "name": "plan_trip",
  "arguments": {
    "origin": "New York, NY",
    "destination": "Los Angeles, CA",
    "waypoints": [
      {"location": "Chicago, IL", "stopover": true}
    ]
  }
}
```

### `plan_trip_with_distance_constraints`
Plan trip with specific distance-based waypoints
```json
{
  "name": "plan_trip_with_distance_constraints",
  "arguments": {
    "origin": "San Francisco, CA",
    "destination": "Seattle, WA",
    "waypoints": [
      {"location": "Sacramento, CA", "distanceFromOrigin": 90}
    ]
  }
}
```

### `optimize_route`
Find the optimal route with shortest total travel time
```json
{
  "name": "optimize_route",
  "arguments": {
    "origin": "New York, NY",
    "destination": "Los Angeles, CA",
    "waypoints": [
      "Chicago, IL",
      "Denver, CO",
      "Taco Bell Phoenix",
      "Starbucks Las Vegas"
    ],
    "maxPermutations": 100
  }
}
```

## Example User Queries Claude Can Handle

- "Plan a trip from New York to Los Angeles with a stop at Taco Bell in Chicago"
- "Plan me a trip from San Francisco to Seattle with stops at Starbucks in Sacramento and Walmart in Portland after 90 and 635 miles respectively"
- "Find the exact location of the Taco Bell in Times Square"
- "Plan a road trip from Miami to Boston with stops at McDonald's in Atlanta and Starbucks in Washington DC"
- "Find the precise address of the Walmart Supercenter in Los Angeles"
- "What's the best optimized route to go from New York to Los Angeles hitting stops in Chicago, Denver, Phoenix, and Las Vegas?"
- "Find the optimal route from San Francisco to Seattle visiting Sacramento, Portland, and Seattle in the shortest time possible"

## Response Format
All tools return JSON with location data, route information, and a Google Maps URL for the planned trip. 