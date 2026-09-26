// location-api.js
// Handles dynamic fetching of States, Districts, and Cities

const LOCATION_API = {
  // Free open API for Indian States & Districts
  STATES_API_URL: 'https://raw.githubusercontent.com/sab99r/Indian-States-And-Districts/master/states-and-districts.json',
  // Free open API for Cities based on Country + State
  CITIES_API_URL: 'https://countriesnow.space/api/v0.1/countries/state/cities',
  
  cachedStatesData: null,

  async getStatesAndDistricts() {
    if (this.cachedStatesData) return this.cachedStatesData;
    try {
      const response = await fetch(this.STATES_API_URL);
      const data = await response.json();
      this.cachedStatesData = data.states; // Array of { state: string, districts: string[] }
      return this.cachedStatesData;
    } catch (error) {
      console.error('Failed to fetch states and districts:', error);
      return [];
    }
  },

  async getStates() {
    const data = await this.getStatesAndDistricts();
    return data.map(s => s.state);
  },

  async getDistricts(stateName) {
    const data = await this.getStatesAndDistricts();
    const stateObj = data.find(s => s.state === stateName);
    return stateObj ? stateObj.districts : [];
  },

  async getCities(stateName) {
    // Note: Since there is no reliable free API for Indian cities *by district*, 
    // we fetch cities by State and populate them in the final dropdown.
    try {
      const response = await fetch(this.CITIES_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country: 'India', state: stateName })
      });
      const data = await response.json();
      if (!data.error && data.data) {
        // Return sorted unique cities
        return [...new Set(data.data)].sort();
      }
      return [];
    } catch (error) {
      console.error('Failed to fetch cities:', error);
      return [];
    }
  }
};

window.LOCATION_API = LOCATION_API;
