// Example usage of the Spatial Copilot MCP server tools
// This demonstrates how the tools would be called by Claude Desktop

// Example 1: Find location coordinates
const findLocationExample = {
  name: "find_location",
  arguments: {
    query: "Times Square, New York"
  }
};

// Example 2: Plan a simple trip
const planTripExample = {
  name: "plan_trip",
  arguments: {
    origin: "New York, NY",
    destination: "Los Angeles, CA",
    waypoints: [
      {
        location: "Chicago, IL",
        stopover: true
      },
      {
        location: "Denver, CO",
        stopover: true
      }
    ],
    optimize: true
  }
};

// Example 3: Plan trip with distance constraints
const planTripWithDistanceExample = {
  name: "plan_trip_with_distance_constraints",
  arguments: {
    origin: "San Francisco, CA",
    destination: "Seattle, WA",
    waypoints: [
      {
        location: "Sacramento, CA",
        distanceFromOrigin: 90,
        stopover: true
      },
      {
        location: "Portland, OR",
        distanceFromOrigin: 635,
        stopover: true
      }
    ]
  }
};

console.log("Example tool calls for Spatial Copilot MCP server:");
console.log("\n1. Find location:");
console.log(JSON.stringify(findLocationExample, null, 2));

console.log("\n2. Plan trip:");
console.log(JSON.stringify(planTripExample, null, 2));

console.log("\n3. Plan trip with distance constraints:");
console.log(JSON.stringify(planTripWithDistanceExample, null, 2));

console.log("\nExpected response format for trip planning:");
const expectedResponse = {
  origin: {
    lat: 40.7128,
    lng: -74.0060,
    address: "New York, NY, USA"
  },
  destination: {
    lat: 34.0522,
    lng: -118.2437,
    address: "Los Angeles, CA, USA"
  },
  waypoints: [
    {
      location: {
        lat: 41.8781,
        lng: -87.6298,
        address: "Chicago, IL, USA"
      },
      stopover: true
    }
  ],
  totalDistance: "2789.2 km",
  totalDuration: "25h 45m",
  googleMapsUrl: "https://www.google.com/maps/dir/40.7128,-74.0060/41.8781,-87.6298/34.0522,-118.2437"
};

console.log(JSON.stringify(expectedResponse, null, 2)); 