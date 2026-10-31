# Soundtrack Remote

Control a [Soundtrack Your Brand](https://www.soundtrackyourbrand.com) sound zone: play, pause, skip, set the volume, change the music source, and show what is playing on your buttons.

## Setup

1. Get an API key from Soundtrack by filling out [their API application form](https://www.soundtrackyourbrand.com/our-api/apply).
2. Add the connection, paste the key into **API Key** and save. The key is stored as a connection secret and hidden in the UI.
3. The **Zone ID** dropdown now lists every zone the key can access. Pick one and save again.

Saving the config again, even without changes, reloads the zone list and your playlists, schedules and announcements, for example after adding a playlist in Soundtrack. You can also type a zone ID by hand: it is the last part of the zone's URL on the Soundtrack website, `https://business.soundtrackyourbrand.com/accounts/{account_id}/zones/{zone_id}/player`.

If you change the API key, the selected zone is kept. If that zone is not available to the new key, the module log shows a warning.

## Connection status

| Status                    | Meaning                                                                                                                                                                                                                                              |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OK                        | Connected and receiving live playback updates                                                                                                                                                                                                        |
| Connecting / Reconnecting | Connecting, or the connection dropped and the module is reconnecting on its own (it waits up to about 30 seconds between attempts)                                                                                                                   |
| Bad configuration         | The API key is not set, or the zone is not set                                                                                                                                                                                                       |
| Warning                   | Playback works, but the playlists and schedules could not be loaded. Check the Zone ID, then save the config to try again                                                                                                                            |
| Connection failure        | "Could not list zones": the API key was rejected or Soundtrack could not be reached; check the key. "Error with WebSocket connection": the module keeps reconnecting on its own. "Playback subscription failed": the module tries again every minute |

## Actions

| Action                  | Notes                                                                                       |
| ----------------------- | ------------------------------------------------------------------------------------------- |
| Play                    | Resume playback                                                                             |
| Pause                   | Pause playback                                                                              |
| Skip Track              | Skip to the next track                                                                      |
| Set Volume              | 0–16. Accepts a number or a variable                                                        |
| Assign Playlist         | Choose from your library. Optionally play immediately and start at a track index            |
| Assign Schedule         | Choose from your library. Optionally play immediately                                       |
| Assign source by ID     | Any playlist, schedule or station ID. Accepts variables; optional track index for playlists |
| Play/Queue Track        | A track ID. Accepts variables                                                               |
| Play/Queue Announcement | Choose from your account's announcements (accounts with announcements only)                 |

The Volume, Track Index, Source ID and Track ID fields accept variables, for example `$(custom:volume)`.

### Finding source IDs

For "Assign source by ID", open the playlist, station or schedule on the Soundtrack website and copy the ID from the URL:

- Playlist or station: `https://business.soundtrackyourbrand.com/accounts/{account_id}/your_music/{playlist_id}`
- Schedule: `https://business.soundtrackyourbrand.com/accounts/{account_id}/your-music/schedules/edit/{schedule_id}`

## Feedbacks

- Change style based on playback state (Offline, Playing, Paused, Unpaired)
- Change style based on playback mode (Auto, Linear, Shuffle)
- Change style based on playback source type (Playlist, Schedule, Manually Queued)
- Change style based on playback source playlist (also matches a playlist played by a schedule)
- Change style based on playback source schedule
- Change style based on current track explicit content
- Change style based on current track ID
- Change style based on current track title
- Change style based on upcoming track explicit content
- Change style based on upcoming track ID
- Change style based on upcoming track title

## Presets

- **Transport:** Play and Pause (lit while playing or paused), Skip, and volume 0, 4, 8, 12 and 16
- **Now Playing:** current track and artist, up next, time remaining, elapsed / duration, volume, playback state, current playlist and an explicit-content warning
- **Playlists and Schedules:** one button per item in your library that starts it immediately, lit while it is playing
- **Announcements:** one button per announcement that plays it immediately

## Variables

Variables use the connection's label, for example `$(soundtrack:current_track_title)` for a connection named `soundtrack`.

### Playback

| Variable                      | Description                          |
| ----------------------------- | ------------------------------------ |
| `playback_state`              | offline, playing, paused or unpaired |
| `playback_volume`             | Volume, 0–16                         |
| `playback_mode`               | AUTO, LINEAR or SHUFFLE              |
| `playback_progress_s`         | Elapsed time in seconds              |
| `playback_progress_mm_ss`     | Elapsed time as m:ss                 |
| `playback_progress_hh_mm_ss`  | Elapsed time as h:mm:ss              |
| `playback_progress_percent`   | Elapsed time as a percentage         |
| `playback_remaining_s`        | Remaining time in seconds            |
| `playback_remaining_mm_ss`    | Remaining time as m:ss               |
| `playback_remaining_hh_mm_ss` | Remaining time as h:mm:ss            |
| `playback_remaining_percent`  | Remaining time as a percentage       |

### Current and upcoming track

Each variable exists twice: with the prefix `current_track_` for the track playing now, and `upcoming_track_` for the next one. They are empty when there is no track.

| Variable (after the prefix) | Description                                     |
| --------------------------- | ----------------------------------------------- |
| `start`                     | Start time (UTC, ISO 8601)                      |
| `id`                        | Track ID                                        |
| `title`                     | Track title                                     |
| `version`                   | Version, such as radio edit                     |
| `duration_s`                | Duration in seconds                             |
| `duration_mm_ss`            | Duration as m:ss                                |
| `duration_hh_mm_ss`         | Duration as h:mm:ss                             |
| `explicit`                  | true or false                                   |
| `recognizability`           | 0–100                                           |
| `album_id`                  | Album ID                                        |
| `album_title`               | Album title                                     |
| `artist_ids`                | Artist IDs, comma separated                     |
| `artist_names`              | Artist names, comma separated                   |
| `source_type`               | Playlist, ScheduleSource or ManuallyQueued      |
| `schedule_id`               | Schedule ID, when played by a schedule          |
| `schedule_title`            | Schedule name, when played by a schedule        |
| `schedule_description`      | Schedule description, when played by a schedule |
| `playlist_id`               | Playlist ID                                     |
| `playlist_title`            | Playlist name                                   |
| `playlist_description`      | Playlist description                            |
