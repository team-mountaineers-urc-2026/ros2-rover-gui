import math
import os
import time

# 1. Increased maxZoom for higher detail
maxZoom = 22
minZoom = 0

last_time = 0

area1TopLeft = (38.240947, -111.344476)
area1BottomRight = (38.237917, -111.338246)
# Area 1 (existing Utah bounding box)
#area1TopLeft     = (38.4415,  -110.8319)  # (lat, lon) northwest corner  
#area1BottomRight = (38.3715,  -110.7519)  # (lat, lon) southeast corner

# Area 2 — ~1 km × 1 km around center 39°38′45″ N, 79°58′12″ W (≈ 39.64583, -79.97)
#area2TopLeft     = (39.6492,  -79.9736)   # (lat, lon) northwest corner  
#area2BottomRight = (39.6452,  -79.9647)   # (lat, lon) southeast corner

vectorDownloadLocation = "./tiles/v3"
rasterDownloadLocation = "./tiles"

def degreesToRadians(degrees):
    return degrees * (math.pi / 180)

def sec(x):
    return 1 / math.cos(x)

def tile_bounds_for(lat1_lon1, lat2_lon2, zoom):
    """Compute tile-index bounds (x_min,x_max,y_min,y_max) covering a lat/lon box at given zoom."""
    (lat1, lon1) = lat1_lon1
    (lat2, lon2) = lat2_lon2
    n = 2 ** zoom

    x1 = math.floor(n * ((lon1 + 180) / 360))
    x2 = math.floor(n * ((lon2 + 180) / 360))

    def lat_to_tileY(lat_deg):
        lat_rad = degreesToRadians(lat_deg)
        return math.floor(
            n * (
                1 - (math.log(math.tan(lat_rad) + sec(lat_rad)) / math.pi)
            ) / 2
        )

    y1 = lat_to_tileY(lat1)
    y2 = lat_to_tileY(lat2)

    x_min, x_max = min(x1, x2), max(x1, x2)
    y_min, y_max = min(y1, y2), max(y1, y2)
    return x_min, x_max, y_min, y_max

# First pass: estimate total tile count for both areas
total_tiles = 0
for zoom in range(minZoom, maxZoom + 1):
    for (tl, br) in [(area1TopLeft, area1BottomRight)]:
        x_min, x_max, y_min, y_max = tile_bounds_for(tl, br, zoom)
        total_tiles += (x_max - x_min + 1) * (y_max - y_min + 1)

print(f"Total number of tiles to download (both areas): {total_tiles}")

# Download tiles for both areas
for (area_idx, (tl, br)) in enumerate([
    (area1TopLeft, area1BottomRight)
]):
    print(f"=== Downloading Area {area_idx + 1} ===")
    for zoom in range(minZoom, maxZoom + 1):
        x_min, x_max, y_min, y_max = tile_bounds_for(tl, br, zoom)

        count = (x_max - x_min + 1) * (y_max - y_min + 1)
        done = 0

        print(f"Zoom {zoom}, X {x_min}→{x_max}, Y {y_min}→{y_max}")

        for y in range(y_min, y_max + 1):
            for x in range(x_min, x_max + 1):
                
                # 2. FIXED DIRECTORY STRUCTURE: MapLibre expects {z}/{x}/{y}
                tile = f"{zoom}/{x}/{y}"
                
                # Ensure directories exist
                os.makedirs(f"{rasterDownloadLocation}/{zoom}/{x}", exist_ok=True)
                os.makedirs(f"{vectorDownloadLocation}/{zoom}/{x}", exist_ok=True)

                # 3. GOOGLE SATELLITE URL
                rasterUrl = f"https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={zoom}"
                vectorUrl = f"https://api.maptiler.com/tiles/v3/{zoom}/{x}/{y}.pbf?key=KEY"

                raster_path = f"{rasterDownloadLocation}/{tile}.jpg"
                vector_path = f"{vectorDownloadLocation}/{tile}.pbf"

                # 4. FIX FORK BOMB & RESUME SUPPORT: Synchronous downloads with existence checks
                
                # Download vector tile (if it doesn't already exist)
                if not os.path.exists(vector_path):
                    os.system(f"curl -s -f -o {vector_path} \"{vectorUrl}\"")

                # Download raster tile (if it doesn't already exist)
                if not os.path.exists(raster_path):
                    os.system(f"curl -s -f -o {raster_path} \"{rasterUrl}\"")

                done += 1
                if time.time() - last_time > 0.2:
                    print(f"\r{100.0 * done / count:.2f}%", end="")
                    last_time = time.time()
            # end x loop
            print(f"\r{100.0 * done / count:.2f}%", end="")
        # end y loop
        print(f"\nFinished zoom {zoom} for Area {area_idx + 1}")
    print("")
print("All downloads finished.")
