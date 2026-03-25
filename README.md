# seattle-breweries
# Seattle Breweries Map

Interactive map of Seattle-area breweries with food options, amenities, and quick search.

## Overview

This project is a lightweight Leaflet web app that helps users explore breweries and quickly answer:

- What food is available (kitchen, food truck, adjacent restaurant, light snacks, none)
- Whether spots are dog-friendly or kid-friendly
- What kind of seating is available

The map includes custom marker styling, filter and legend controls, and a search bar for jumping to breweries.

## Features

- Interactive Leaflet map with mobile-friendly controls
- Color-coded brewery markers by food provider type
- Popup cards with food details and menu/schedule links
- Filter panel for:
	- food provider type
	- dogs allowed
	- kids allowed
	- indoor/outdoor seating
- Legend panel for marker categories
- Search bar with live match list and map zoom-to result
- Brewery name labels that appear at closer zoom levels
- iPhone viewport and input-focus handling improvements

## Tech Stack

- HTML, CSS, JavaScript (vanilla)
- Leaflet
- Leaflet Locate Control
- Leaflet Awesome Markers + Font Awesome

## Data Credit

Primary source used for brewery data:

- Washington Beer Blog: https://washingtonbeerblog.com/seattle-breweries-beer-stops/

Updated with addional food info. Repository GeoJSON used by the app:

- `Seattle_breweries_final.geojson`
