#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { Client } from "@googlemaps/google-maps-services-js";
import dotenv from "dotenv";

dotenv.config();

const server = new Server({
  name: "spatial-copilot-mcp",
  version: "1.0.0",
});

// Initialize Google Maps client
const googleMapsClient = new Client({});

// Types for our trip planning
interface Location {
  lat: number;
  lng: number;
  address: string;
}

interface Waypoint {
  location: Location;
  stopover: boolean;
}

interface TripPlan {
  origin: Location;
  destination: Location;
  waypoints: Waypoint[];
  totalDistance: string;
  totalDuration: string;
  googleMapsUrl: string;
}

// Tool: Find location coordinates
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "find_location",
        description: "Find the coordinates and formatted address for a location",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Location query (e.g., 'New York, NY', 'Times Square')",
            },
          },
          required: ["query"],
        },
      },
      {
        name: "plan_trip",
        description: "Plan a trip with multiple waypoints and generate a Google Maps link",
        inputSchema: {
          type: "object",
          properties: {
            origin: {
              type: "string",
              description: "Starting location (e.g., 'New York, NY')",
            },
            destination: {
              type: "string",
              description: "Final destination (e.g., 'Los Angeles, CA')",
            },
            waypoints: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  location: {
                    type: "string",
                    description: "Location to visit (e.g., 'Chicago, IL')",
                  },
                  stopover: {
                    type: "boolean",
                    description: "Whether to stop at this location (default: true)",
                    default: true,
                  },
                },
                required: ["location"],
              },
              description: "Optional waypoints to visit along the route",
            },
            optimize: {
              type: "boolean",
              description: "Whether to optimize the route order (default: true)",
              default: true,
            },
          },
          required: ["origin", "destination"],
        },
      },
      {
        name: "plan_trip_with_distance_constraints",
        description: "Plan a trip with specific distance-based waypoint placement",
        inputSchema: {
          type: "object",
          properties: {
            origin: {
              type: "string",
              description: "Starting location",
            },
            destination: {
              type: "string",
              description: "Final destination",
            },
            waypoints: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  location: {
                    type: "string",
                    description: "Location to visit",
                  },
                  distanceFromOrigin: {
                    type: "number",
                    description: "Approximate distance from origin in miles where this waypoint should be placed",
                  },
                  stopover: {
                    type: "boolean",
                    description: "Whether to stop at this location",
                    default: true,
                  },
                },
                required: ["location", "distanceFromOrigin"],
              },
            },
          },
          required: ["origin", "destination"],
        },
      },
      {
        name: "find_precise_location",
        description: "Find the exact coordinates and address for a specific business or place (e.g., 'Taco Bell', 'Starbucks', 'Walmart')",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Specific business or place name (e.g., 'Taco Bell', 'Starbucks Downtown', 'Walmart Supercenter')",
            },
            location: {
              type: "string",
              description: "Optional: General area to search in (e.g., 'New York, NY', 'Los Angeles')",
            },
          },
          required: ["query"],
        },
      },
      {
        name: "optimize_route",
        description: "Find the optimal route with the shortest total travel time by calculating all possible permutations of waypoints",
        inputSchema: {
          type: "object",
          properties: {
            origin: {
              type: "string",
              description: "Starting location (e.g., 'New York, NY')",
            },
            destination: {
              type: "string",
              description: "Final destination (e.g., 'Los Angeles, CA')",
            },
            waypoints: {
              type: "array",
              items: {
                type: "string",
                description: "Location to visit (e.g., 'Chicago, IL', 'Taco Bell Denver')",
              },
              description: "List of waypoints to visit (will be optimized for shortest total travel time)",
            },
            maxPermutations: {
              type: "number",
              description: "Maximum number of route permutations to test (default: 100, max: 1000)",
              default: 100,
            },
          },
          required: ["origin", "destination", "waypoints"],
        },
      },
    ],
  };
});

// Helper function to find location coordinates with precise search
async function findLocation(query: string): Promise<Location> {
  try {
    // First try Places API for more precise results (businesses, specific places)
    const placesResponse = await googleMapsClient.findPlaceFromText({
      params: {
        input: query,
        inputtype: "textquery" as any,
        fields: ["formatted_address", "geometry", "name", "place_id"],
        key: process.env.GOOGLE_MAPS_API_KEY!,
      },
    });

    if (placesResponse.data.candidates && placesResponse.data.candidates.length > 0) {
      const candidate = placesResponse.data.candidates[0];
      const location = candidate.geometry?.location;
      
      if (location) {
        return {
          lat: location.lat,
          lng: location.lng,
          address: candidate.formatted_address || query,
        };
      }
    }

    // Fallback to geocoding for general addresses
    const geocodeResponse = await googleMapsClient.geocode({
      params: {
        address: query,
        key: process.env.GOOGLE_MAPS_API_KEY!,
      },
    });

    if (geocodeResponse.data.results.length === 0) {
      throw new Error(`No results found for location: ${query}`);
    }

    const result = geocodeResponse.data.results[0];
    const location = result.geometry.location;

    return {
      lat: location.lat,
      lng: location.lng,
      address: result.formatted_address,
    };
  } catch (error) {
    throw new Error(`Failed to find location '${query}': ${error}`);
  }
}

// Helper function to get route between two points
async function getRoute(origin: Location, destination: Location, waypoints: Waypoint[] = []): Promise<any> {
  try {
    const response = await googleMapsClient.directions({
      params: {
        origin: `${origin.lat},${origin.lng}`,
        destination: `${destination.lat},${destination.lng}`,
        waypoints: waypoints.map(wp => `${wp.location.lat},${wp.location.lng}`),
        optimize: true,
        key: process.env.GOOGLE_MAPS_API_KEY!,
      },
    });

    if (response.data.routes.length === 0) {
      throw new Error("No route found");
    }

    return response.data.routes[0];
  } catch (error) {
    throw new Error(`Failed to get route: ${error}`);
  }
}

// Helper function to generate Google Maps URL
function generateGoogleMapsUrl(origin: Location, destination: Location, waypoints: Waypoint[] = []): string {
  const baseUrl = "https://www.google.com/maps/dir/";
  const originParam = encodeURIComponent(`${origin.lat},${origin.lng}`);
  const destinationParam = encodeURIComponent(`${destination.lat},${destination.lng}`);
  
  let url = `${baseUrl}${originParam}/${destinationParam}`;
  
  if (waypoints.length > 0) {
    const waypointParams = waypoints
      .map(wp => encodeURIComponent(`${wp.location.lat},${wp.location.lng}`))
      .join('/');
    url = `${baseUrl}${originParam}/${waypointParams}/${destinationParam}`;
  }
  
  return url;
}

// Helper function to get distance matrix between multiple points
async function getDistanceMatrix(origins: Location[], destinations: Location[]): Promise<any> {
  try {
    const response = await googleMapsClient.distancematrix({
      params: {
        origins: origins.map(loc => `${loc.lat},${loc.lng}`),
        destinations: destinations.map(loc => `${loc.lat},${loc.lng}`),
        mode: "driving" as any,
        key: process.env.GOOGLE_MAPS_API_KEY!,
      },
    });

    return response.data;
  } catch (error) {
    throw new Error(`Failed to get distance matrix: ${error}`);
  }
}

// Helper function to calculate total travel time for a route
async function calculateRouteTime(route: Location[]): Promise<number> {
  if (route.length < 2) return 0;
  
  let totalTime = 0;
  
  for (let i = 0; i < route.length - 1; i++) {
    try {
      const response = await googleMapsClient.directions({
        params: {
          origin: `${route[i].lat},${route[i].lng}`,
          destination: `${route[i + 1].lat},${route[i + 1].lng}`,
          mode: "driving" as any,
          key: process.env.GOOGLE_MAPS_API_KEY!,
        },
      });

      if (response.data.routes.length > 0) {
        const leg = response.data.routes[0].legs[0];
        totalTime += leg.duration.value; // Duration in seconds
      }
    } catch (error) {
      console.error(`Error calculating time between ${route[i].address} and ${route[i + 1].address}:`, error);
      // Add a penalty for failed calculations
      totalTime += 3600; // 1 hour penalty
    }
  }
  
  return totalTime;
}

// Helper function to generate all permutations of waypoints
function generatePermutations<T>(arr: T[]): T[][] {
  if (arr.length <= 1) return [arr];
  
  const result: T[][] = [];
  
  for (let i = 0; i < arr.length; i++) {
    const current = arr[i];
    const remaining = [...arr.slice(0, i), ...arr.slice(i + 1)];
    const perms = generatePermutations(remaining);
    
    for (const perm of perms) {
      result.push([current, ...perm]);
    }
  }
  
  return result;
}

// Helper function to find optimal route
async function findOptimalRoute(origin: Location, destination: Location, waypoints: Location[], maxPermutations: number = 100): Promise<{
  optimalRoute: Location[];
  totalTime: number;
  allRoutes: Array<{ route: Location[]; time: number }>;
}> {
  const allPoints = [origin, ...waypoints, destination];
  const waypointPermutations = generatePermutations(waypoints);
  
  // Limit permutations to avoid too many API calls
  const limitedPermutations = waypointPermutations.slice(0, Math.min(maxPermutations, waypointPermutations.length));
  
  console.error(`Testing ${limitedPermutations.length} route permutations...`);
  
  const routeResults: Array<{ route: Location[]; time: number }> = [];
  
  for (const waypointPerm of limitedPermutations) {
    const route = [origin, ...waypointPerm, destination];
    const time = await calculateRouteTime(route);
    
    routeResults.push({
      route,
      time,
    });
  }
  
  // Sort by travel time (ascending)
  routeResults.sort((a, b) => a.time - b.time);
  
  return {
    optimalRoute: routeResults[0].route,
    totalTime: routeResults[0].time,
    allRoutes: routeResults,
  };
}

// Tool: Find location coordinates
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "find_location") {
    const { query } = args as { query: string };
    
    try {
      const location = await findLocation(query);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(location, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${error}`,
          },
        ],
        isError: true,
      };
    }
  }

  if (name === "find_precise_location") {
    const { query, location: area } = args as { query: string; location?: string };
    
    try {
      // Use Places API for precise business/place search
      const searchQuery = area ? `${query} ${area}` : query;
      
      const placesResponse = await googleMapsClient.findPlaceFromText({
        params: {
          input: searchQuery,
          inputtype: "textquery" as any,
          fields: ["formatted_address", "geometry", "name", "place_id", "types"],
          key: process.env.GOOGLE_MAPS_API_KEY!,
        },
      });

      if (!placesResponse.data.candidates || placesResponse.data.candidates.length === 0) {
        throw new Error(`No precise location found for: ${query}`);
      }

      const candidate = placesResponse.data.candidates[0];
      const location = candidate.geometry?.location;
      
      if (!location) {
        throw new Error(`No coordinates found for: ${query}`);
      }

      const result = {
        lat: location.lat,
        lng: location.lng,
        address: candidate.formatted_address || query,
        name: candidate.name || query,
        placeId: candidate.place_id,
        types: candidate.types || [],
      };

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error finding precise location: ${error}`,
          },
        ],
        isError: true,
      };
    }
  }

  if (name === "plan_trip") {
    const { origin, destination, waypoints = [], optimize = true } = args as {
      origin: string;
      destination: string;
      waypoints?: Array<{ location: string; stopover?: boolean }>;
      optimize?: boolean;
    };

    try {
      // Find coordinates for all locations
      const originLocation = await findLocation(origin);
      const destinationLocation = await findLocation(destination);
      
      const waypointLocations: Waypoint[] = [];
      for (const wp of waypoints) {
        const location = await findLocation(wp.location);
        waypointLocations.push({
          location,
          stopover: wp.stopover ?? true,
        });
      }

      // Get route
      const route = await getRoute(originLocation, destinationLocation, waypointLocations);
      
      // Extract route information
      const legs = route.legs;
      const totalDistance = legs.reduce((sum: number, leg: any) => sum + leg.distance.value, 0);
      const totalDuration = legs.reduce((sum: number, leg: any) => sum + leg.duration.value, 0);
      
      // Convert to readable format
      const distanceKm = (totalDistance / 1000).toFixed(1);
      const durationHours = Math.floor(totalDuration / 3600);
      const durationMinutes = Math.floor((totalDuration % 3600) / 60);
      
      const tripPlan: TripPlan = {
        origin: originLocation,
        destination: destinationLocation,
        waypoints: waypointLocations,
        totalDistance: `${distanceKm} km`,
        totalDuration: `${durationHours}h ${durationMinutes}m`,
        googleMapsUrl: generateGoogleMapsUrl(originLocation, destinationLocation, waypointLocations),
      };

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(tripPlan, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error planning trip: ${error}`,
          },
        ],
        isError: true,
      };
    }
  }

  if (name === "plan_trip_with_distance_constraints") {
    const { origin, destination, waypoints = [] } = args as {
      origin: string;
      destination: string;
      waypoints: Array<{ location: string; distanceFromOrigin: number; stopover?: boolean }>;
    };

    try {
      // Find coordinates for origin and destination
      const originLocation = await findLocation(origin);
      const destinationLocation = await findLocation(destination);
      
      // Sort waypoints by distance from origin
      const sortedWaypoints = [...waypoints].sort((a, b) => a.distanceFromOrigin - b.distanceFromOrigin);
      
      // Find coordinates for waypoints
      const waypointLocations: Waypoint[] = [];
      for (const wp of sortedWaypoints) {
        const location = await findLocation(wp.location);
        waypointLocations.push({
          location,
          stopover: wp.stopover ?? true,
        });
      }

      // Get route
      const route = await getRoute(originLocation, destinationLocation, waypointLocations);
      
      // Extract route information
      const legs = route.legs;
      const totalDistance = legs.reduce((sum: number, leg: any) => sum + leg.distance.value, 0);
      const totalDuration = legs.reduce((sum: number, leg: any) => sum + leg.duration.value, 0);
      
      // Convert to readable format
      const distanceKm = (totalDistance / 1000).toFixed(1);
      const durationHours = Math.floor(totalDuration / 3600);
      const durationMinutes = Math.floor((totalDuration % 3600) / 60);
      
      const tripPlan: TripPlan = {
        origin: originLocation,
        destination: destinationLocation,
        waypoints: waypointLocations,
        totalDistance: `${distanceKm} km`,
        totalDuration: `${durationHours}h ${durationMinutes}m`,
        googleMapsUrl: generateGoogleMapsUrl(originLocation, destinationLocation, waypointLocations),
      };

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(tripPlan, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error planning trip with distance constraints: ${error}`,
          },
        ],
        isError: true,
      };
    }
  }

  if (name === "optimize_route") {
    const { origin, destination, waypoints = [], maxPermutations = 100 } = args as {
      origin: string;
      destination: string;
      waypoints: string[];
      maxPermutations?: number;
    };

    try {
      console.error(`Starting route optimization for ${waypoints.length} waypoints...`);
      
      // Find coordinates for all locations
      const originLocation = await findLocation(origin);
      const destinationLocation = await findLocation(destination);
      
      const waypointLocations: Location[] = [];
      for (const wp of waypoints) {
        const location = await findLocation(wp);
        waypointLocations.push(location);
      }

      // Find optimal route
      const optimizationResult = await findOptimalRoute(
        originLocation, 
        destinationLocation, 
        waypointLocations, 
        maxPermutations
      );

      // Convert optimal route to waypoints format
      const optimalWaypoints: Waypoint[] = optimizationResult.optimalRoute
        .slice(1, -1) // Remove origin and destination
        .map(location => ({
          location,
          stopover: true,
        }));

      // Calculate total distance for the optimal route
      let totalDistance = 0;
      for (let i = 0; i < optimizationResult.optimalRoute.length - 1; i++) {
        const response = await googleMapsClient.directions({
          params: {
            origin: `${optimizationResult.optimalRoute[i].lat},${optimizationResult.optimalRoute[i].lng}`,
            destination: `${optimizationResult.optimalRoute[i + 1].lat},${optimizationResult.optimalRoute[i + 1].lng}`,
            mode: "driving" as any,
            key: process.env.GOOGLE_MAPS_API_KEY!,
          },
        });

        if (response.data.routes.length > 0) {
          const leg = response.data.routes[0].legs[0];
          totalDistance += leg.distance.value;
        }
      }

      // Convert to readable format
      const distanceKm = (totalDistance / 1000).toFixed(1);
      const durationHours = Math.floor(optimizationResult.totalTime / 3600);
      const durationMinutes = Math.floor((optimizationResult.totalTime % 3600) / 60);

      const optimizedTripPlan = {
        origin: originLocation,
        destination: destinationLocation,
        waypoints: optimalWaypoints,
        totalDistance: `${distanceKm} km`,
        totalDuration: `${durationHours}h ${durationMinutes}m`,
        googleMapsUrl: generateGoogleMapsUrl(originLocation, destinationLocation, optimalWaypoints),
        optimization: {
          permutationsTested: optimizationResult.allRoutes.length,
          totalPermutations: Math.min(maxPermutations, generatePermutations(waypointLocations).length),
          timeSavings: optimizationResult.allRoutes.length > 1 ? 
            `${Math.round((optimizationResult.allRoutes[optimizationResult.allRoutes.length - 1].time - optimizationResult.totalTime) / 60)} minutes saved vs worst route` : 
            "No alternative routes to compare",
          routeOrder: optimizationResult.optimalRoute.map(loc => loc.address),
        },
      };

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(optimizedTripPlan, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error optimizing route: ${error}`,
          },
        ],
        isError: true,
      };
    }
  }

  throw new Error(`Unknown tool: ${name}`);
});

// Start the server
const transport = new StdioServerTransport();
await server.connect(transport);

console.error("Spatial Copilot MCP server started"); 