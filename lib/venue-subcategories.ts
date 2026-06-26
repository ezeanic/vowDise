export const venueSubcategories = [
  "Barns & Farms",
  "Outdoor",
  "Gardens",
  "Beaches",
  "Rooftops & Lofts",
  "Hotels",
  "Waterfronts",
  "Wineries & Breweries",
  "Parks",
  "Country Clubs",
  "Mansions",
  "Historic Venues",
  "Boats",
  "Restaurants",
  "Museums",
  "Banquet Halls",
  "Churches & Temples",
] as const;

export type VenueSubcategory = (typeof venueSubcategories)[number];
