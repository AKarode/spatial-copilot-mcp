import { Client } from "@googlemaps/google-maps-services-js";
import dotenv from "dotenv";

dotenv.config();

// Test the Google Maps API integration
async function testGoogleMapsAPI() {
  const client = new Client({});
  
  try {
    // Test geocoding
    console.log("Testing geocoding...");
    const geocodeResponse = await client.geocode({
      params: {
        address: "Times Square, New York",
        key: process.env.GOOGLE_MAPS_API_KEY!,
      },
    });
    
    console.log("Geocoding result:", geocodeResponse.data.results[0]?.formatted_address);
    
    // Test directions
    console.log("\nTesting directions...");
    const directionsResponse = await client.directions({
      params: {
        origin: "New York, NY",
        destination: "Los Angeles, CA",
        key: process.env.GOOGLE_MAPS_API_KEY!,
      },
    });
    
    const route = directionsResponse.data.routes[0];
    console.log("Route found:", route.legs.length, "legs");
    console.log("Total distance:", route.legs[0]?.distance?.text);
    console.log("Total duration:", route.legs[0]?.duration?.text);
    
    console.log("\n✅ Google Maps API integration test passed!");
    
  } catch (error) {
    console.error("❌ Google Maps API test failed:", error);
  }
}

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testGoogleMapsAPI();
} 