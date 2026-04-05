#!/bin/bash
# Optimize photos for web and generate photos.js data file
# Usage: Run from the saffy-website/ directory

SOURCE="/Users/shreyapatel/Desktop/Saffy Website/Photo Portfolio"
DEST="./images"
JS_FILE="./js/photos.js"

CATEGORIES=("Landscapes" "Portraits" "Scenes" "Wildlife")

echo "window.PHOTOS = {" > "$JS_FILE"

for cat in "${CATEGORIES[@]}"; do
    lower=$(echo "$cat" | tr '[:upper:]' '[:lower:]')
    mkdir -p "$DEST/$lower/thumb" "$DEST/$lower/full"

    echo "  $lower: [" >> "$JS_FILE"

    counter=1
    for file in "$SOURCE/$cat/"*; do
        [ -f "$file" ] || continue

        basename=$(basename "$file")
        slug=$(printf "%s-%02d.jpg" "$lower" "$counter")

        # Parse location and date from filename
        # Pattern 1: "January 18, 2026 _ Mandalay, Myanmar (5).JPG" (has year + underscore)
        # Pattern 2: "January 10, Hue, Vietnam (4).jpg" (no year, no underscore)
        # Pattern 3: "October 23, Thessaloniki, Greece.JPG" (no year, no underscore, no number)

        if echo "$basename" | grep -q ' _ '; then
            # Pattern 1: has underscore separator
            date_part=$(echo "$basename" | sed 's/ _ .*//')
            location_part=$(echo "$basename" | sed 's/.* _ //' | sed 's/ ([0-9]*)//g' | sed 's/\.[^.]*$//')
            # Extract month and year from date_part like "January 18, 2026"
            month=$(echo "$date_part" | awk '{print $1}')
            year=$(echo "$date_part" | grep -o '[0-9]\{4\}')
            display_date="$month $year"
        else
            # Pattern 2/3: no underscore - "January 10, Hue, Vietnam (4).jpg"
            # First word is month, then day number, then location parts
            month=$(echo "$basename" | awk '{print $1}')
            # Remove month and day, get location
            # Strip extension and parenthetical number first
            cleaned=$(echo "$basename" | sed 's/ ([0-9]*)//g' | sed 's/\.[^.]*$//')
            # Remove "Month DD, " from the front to get location
            location_part=$(echo "$cleaned" | sed 's/^[A-Za-z]* [0-9]*,* *//')
            year="2026"
            display_date="$month $year"
        fi

        # Clean up location (trim whitespace)
        location_part=$(echo "$location_part" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')

        echo "    Processing: $basename -> $slug ($location_part, $display_date)"

        # Create full-size (1920px max dimension)
        sips -Z 1920 "$file" --out "$DEST/$lower/full/$slug" -s format jpeg -s formatOptions 82 > /dev/null 2>&1

        # Create thumbnail (800px max dimension)
        sips -Z 800 "$file" --out "$DEST/$lower/thumb/$slug" -s format jpeg -s formatOptions 70 > /dev/null 2>&1

        # Get thumbnail dimensions for aspect-ratio
        dims=$(sips -g pixelWidth -g pixelHeight "$DEST/$lower/thumb/$slug" 2>/dev/null)
        w=$(echo "$dims" | grep pixelWidth | awk '{print $2}')
        h=$(echo "$dims" | grep pixelHeight | awk '{print $2}')

        echo "    { file: \"$slug\", location: \"$location_part\", date: \"$display_date\", w: $w, h: $h }," >> "$JS_FILE"

        counter=$((counter + 1))
    done

    echo "  ]," >> "$JS_FILE"
done

echo "};" >> "$JS_FILE"

echo ""
echo "Done! Processed $((counter - 1)) images per last category."
echo "Total optimized size:"
du -sh "$DEST"
echo ""
echo "Photos data written to $JS_FILE"
