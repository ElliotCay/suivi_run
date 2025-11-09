"""
Script to scan Apple Health export and find all MetadataEntry keys.
This helps identify the correct key for workout ratings.
"""

from lxml import etree
import sys
from collections import Counter

def scan_metadata_keys(xml_path):
    """Scan all MetadataEntry keys in the export."""
    print(f"Scanning {xml_path}...\n")
    
    keys_counter = Counter()
    rating_related = []
    
    # Parse workouts
    context = etree.iterparse(xml_path, events=("end",), tag="Workout")
    
    for event, workout_elem in context:
        workout_type = workout_elem.get("workoutActivityType")
        
        # Only check running workouts
        if workout_type == "HKWorkoutActivityTypeRunning":
            for metadata_elem in workout_elem.findall("MetadataEntry"):
                key = metadata_elem.get("key")
                value = metadata_elem.get("value")
                
                keys_counter[key] += 1
                
                # Track anything that looks like a rating
                if any(word in key.lower() for word in ["rating", "evaluation", "score", "quality"]):
                    rating_related.append((key, value))
        
        # Clear to save memory
        workout_elem.clear()
        while workout_elem.getprevious() is not None:
            del workout_elem.getparent()[0]
    
    print("=== ALL METADATA KEYS FOUND ===")
    for key, count in keys_counter.most_common():
        print(f"{count:4d}x  {key}")
    
    if rating_related:
        print("\n=== RATING-RELATED KEYS (samples) ===")
        seen = set()
        for key, value in rating_related[:20]:  # Show first 20
            if key not in seen:
                print(f"{key}: {value}")
                seen.add(key)
    else:
        print("\n⚠️  No rating-related keys found")
    
    print(f"\nTotal unique keys: {len(keys_counter)}")

if __name__ == "__main__":
    # Try to find the most recent export
    import os
    from pathlib import Path
    
    # Check common locations
    possible_paths = [
        "/Users/elliotcayuela/Downloads/export.xml",
        "/Users/elliotcayuela/Library/Mobile Documents/com~apple~CloudDocs/apple_health_export/export.xml",
    ]
    
    xml_path = None
    for path in possible_paths:
        if os.path.exists(path):
            xml_path = path
            break
    
    if not xml_path and len(sys.argv) > 1:
        xml_path = sys.argv[1]
    
    if xml_path and os.path.exists(xml_path):
        scan_metadata_keys(xml_path)
    else:
        print("❌ No export.xml found")
        print("\nUsage: python check_metadata_keys.py [path/to/export.xml]")
        print("\nOr place export.xml in ~/Downloads/")
