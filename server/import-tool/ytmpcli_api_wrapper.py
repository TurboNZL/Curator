import sys
import json
import os
import subprocess
import uuid
import re # For cleaning filenames
import requests # For downloading thumbnails

def get_yt_dlp_info(url):
    cmd = [
        sys.executable, "-m", "yt_dlp",
        "--dump-single-json",
        "--no-warnings",
        "--prefer-free-formats",
        url
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, check=True)
    return json.loads(result.stdout)

def main():
    if len(sys.argv) < 3:
        print(json.dumps({"error": "URL and output directory arguments are missing"}))
        sys.exit(1)

    url = sys.argv[1]
    output_base_dir = sys.argv[2] # e.g., 'public/uploads'
    music_upload_dir = os.path.join(output_base_dir, "music")

    if not os.path.exists(music_upload_dir):
        os.makedirs(music_upload_dir, exist_ok=True)

    try:
        info = get_yt_dlp_info(url)
        
        album_title = info.get("title", "Unknown Album")
        album_artist_name = info.get("uploader", info.get("artist", "Unknown Artist"))
        
        entries = info.get("entries")
        if not entries: # Handle single video case
            entries = [info]

        processed_tracks = []
        for entry in entries:
            if not entry:
                continue

            track_id = str(uuid.uuid4())
            track_title = entry.get("title", "Unknown Track")
            
            # Sanitize filename for local storage
            clean_track_title = re.sub(r'[^\w\s-]', '', track_title).strip()[:50] # Limit length
            local_filename = f"{clean_track_title}_{track_id}.mp3"
            local_filepath_full = os.path.join(music_upload_dir, local_filename)

            # Download using yt-dlp directly
            download_cmd = [
                sys.executable, "-m", "yt_dlp",
                entry.get("webpage_url", entry.get("url")),
                "--extract-audio",
                "--audio-format", "mp3",
                "-o", local_filepath_full,
                "--no-warnings",
            ]
            subprocess.run(download_cmd, check=True)

            processed_tracks.append({
                "id": track_id,
                "title": track_title,
                "localFilePath": f"/uploads/music/{local_filename}", # Relative URL for client
                "youtubeMusicUrl": entry.get("webpage_url", entry.get("url")),
                "thumbnail": entry.get("thumbnail"), # Pass thumbnail URL
                "duration": entry.get("duration") # Add duration
            })

        print(json.dumps({
            "success": True,
            "albumTitle": album_title,
            "albumArtistName": album_artist_name,
            "tracks": processed_tracks
        }))

    except subprocess.CalledProcessError as e:
        print(json.dumps({"error": f"yt-dlp command failed: {e.stderr.strip()}"}))
        sys.exit(1)
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()