# Spatial Copilot MCP Server

An MCP (Model Context Protocol) server that enables Claude Desktop to plan trips and generate Google Maps links. This server provides tools for location lookup, trip planning with waypoints, and distance-based route optimization.

## Features

- **Location Lookup**: Find coordinates and formatted addresses for any location
- **Trip Planning**: Plan routes with multiple waypoints and generate Google Maps links
- **Distance-Based Planning**: Plan trips with specific distance constraints for waypoints
- **Route Optimization**: Automatically optimize route order for efficiency
- **Google Maps Integration**: Generate direct links to Google Maps with the planned route

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Get Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a new project or select an existing one
3. Enable the following APIs:
   - Geocoding API
   - Directions API
   - Places API (optional, for future enhancements)
4. Create an API key
5. Copy the API key

### 3. Configure Environment

```bash
cp env.example .env
```

Edit `.env` and add your Google Maps API key:

```
GOOGLE_MAPS_API_KEY=your_actual_api_key_here
```

### 4. Build the Project

```bash
npm run build
```

## Usage

### Starting the Server

```bash
npm start
```

Or for development:

```bash
npm run dev
```

### Available Tools

#### 1. `find_location`

Find the coordinates and formatted address for a location.

**Parameters:**
- `query` (string): Location query (e.g., "New York, NY", "Times Square")

**Example:**
```json
{
  "name": "find_location",
  "arguments": {
    "query": "Times Square, New York"
  }
}
```

#### 2. `find_precise_location`

Find the exact coordinates and address for a specific business or place (e.g., "Taco Bell", "Starbucks", "Walmart").

**Parameters:**
- `query` (string): Specific business or place name (e.g., "Taco Bell", "Starbucks Downtown", "Walmart Supercenter")
- `location` (string, optional): General area to search in (e.g., "New York, NY", "Los Angeles")

**Example:**
```json
{
  "name": "find_precise_location",
  "arguments": {
    "query": "Taco Bell",
    "location": "New York, NY"
  }
}
```

**Response includes:**
- Exact coordinates (lat/lng)
- Precise business address
- Business name
- Place ID
- Business types

#### 3. `plan_trip`

Plan a trip with multiple waypoints and generate a Google Maps link.

**Parameters:**
- `origin` (string): Starting location
- `destination` (string): Final destination
- `waypoints` (array, optional): Array of waypoint objects
  - `location` (string): Location to visit
  - `stopover` (boolean, optional): Whether to stop at this location (default: true)
- `optimize` (boolean, optional): Whether to optimize the route order (default: true)

**Example:**
```json
{
  "name": "plan_trip",
  "arguments": {
    "origin": "New York, NY",
    "destination": "Los Angeles, CA",
    "waypoints": [
      {
        "location": "Chicago, IL",
        "stopover": true
      },
      {
        "location": "Denver, CO",
        "stopover": true
      }
    ],
    "optimize": true
  }
}
```

#### 4. `plan_trip_with_distance_constraints`

Plan a trip with specific distance-based waypoint placement.

**Parameters:**
- `origin` (string): Starting location
- `destination` (string): Final destination
- `waypoints` (array): Array of waypoint objects with distance constraints
  - `location` (string): Location to visit
  - `distanceFromOrigin` (number): Approximate distance from origin in miles
  - `stopover` (boolean, optional): Whether to stop at this location (default: true)

**Example:**
```json
{
  "name": "plan_trip_with_distance_constraints",
  "arguments": {
    "origin": "San Francisco, CA",
    "destination": "Seattle, WA",
    "waypoints": [
      {
        "location": "Sacramento, CA",
        "distanceFromOrigin": 90,
        "stopover": true
      },
      {
        "location": "Portland, OR",
        "distanceFromOrigin": 635,
        "stopover": true
      }
    ]
  }
}
```

#### 5. `optimize_route`

Find the optimal route with the shortest total travel time by calculating all possible permutations of waypoints.

**Parameters:**
- `origin` (string): Starting location
- `destination` (string): Final destination
- `waypoints` (array): List of waypoints to visit (will be optimized for shortest total travel time)
- `maxPermutations` (number, optional): Maximum number of route permutations to test (default: 100, max: 1000)

**Example:**
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

**Response includes:**
- Optimal route with shortest total travel time
- Total distance and duration
- Google Maps URL with optimized route
- Optimization details (permutations tested, time savings, route order)

## Response Format

All tools return JSON responses. Trip planning tools return a `TripPlan` object with the following structure:

```json
{
  "origin": {
    "lat": 40.7128,
    "lng": -74.0060,
    "address": "New York, NY, USA"
  },
  "destination": {
    "lat": 34.0522,
    "lng": -118.2437,
    "address": "Los Angeles, CA, USA"
  },
  "waypoints": [
    {
      "location": {
        "lat": 41.8781,
        "lng": -87.6298,
        "address": "Chicago, IL, USA"
      },
      "stopover": true
    }
  ],
  "totalDistance": "2789.2 km",
  "totalDuration": "25h 45m",
  "googleMapsUrl": "https://www.google.com/maps/dir/40.7128,-74.0060/41.8781,-87.6298/34.0522,-118.2437"
}
```

## Integration with Claude Desktop

To use this MCP server with Claude Desktop:

1. Add the server to your Claude Desktop configuration
2. The server will be available as tools that Claude can call
3. Claude can use these tools to plan trips based on user queries

## Example User Queries

The server can handle various types of trip planning queries:

- "Plan a trip from New York to Los Angeles with a stop at Taco Bell in Chicago"
- "Plan me a trip from San Francisco to Seattle with stops at Starbucks in Sacramento and Walmart in Portland after 90 and 635 miles respectively"
- "Find the exact location of the Taco Bell in Times Square"
- "Plan a road trip from Miami to Boston with stops at McDonald's in Atlanta and Starbucks in Washington DC"
- "Find the precise address of the Walmart Supercenter in Los Angeles"
- "What's the best optimized route to go from New York to Los Angeles hitting stops in Chicago, Denver, Phoenix, and Las Vegas?"
- "Find the optimal route from San Francisco to Seattle visiting Sacramento, Portland, and Seattle in the shortest time possible"

## Error Handling

The server includes comprehensive error handling for:
- Invalid locations
- No route found
- API rate limits
- Network errors
- Invalid parameters

## Development

### Building

```bash
npm run build
```

### Running Tests

```bash
npm test
```

### Development Mode

```bash
npm run dev
```

## License

MIT 