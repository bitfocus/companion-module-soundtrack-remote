# companion-module-soundtrack-remote
See [HELP.md](./HELP.md) and [LICENSE](./LICENSE)

Controls Soundtrack Your Brand via [their API](https://studio.apollographql.com/public/soundtrack/)

**V2.0.0**
- Adds subscription to Soundtrack API for real-time updates
- Now downloads a user's zones, playlists, schedules, and stations for easier selection
- Adds support for actions:
  - Assign Playlist (by name)
  - Assign Schedule (by name)
- Adds support for feedbacks:
  - Change style based on playback state (Offline, Playing, Paused, Unpaired)
  - Change style based on playback mode (Auto, Linear, Shuffle)
  - Change style based on playback source type (Playlist, Schedule, Manually Queued)
  - Change style based on playback source playlist
  - Change style based on playback source schedule
  - Change style based on current track explicit content
  - Change style based on current track ID
  - Change style based on current track name
  - Change style based on upcoming track explicit content
  - Change style based on upcoming track ID
  - Change style based on upcoming track name
- Adds support for variables:
  - Playback state (Offline, Playing, Paused, Unpaired)
  - Playback Volume (0-16)
  - Playback Progress (s)
  - Playback Progress (%)
  - Playback Remaining (s)
  - Playback Remaining (%)
  - Playback Mode (Auto, Linear, Shuffle)
  - Current Track Start Time (UTC)
  - Current Track ID
  - Current Track Title
  - Current Track Version (radio edit, etc.)
  - Current Track Duration (s)
  - Current Track Explicit (true, false)
  - Current Track Recognizeability (0-100)
  - Current Track Album ID
  - Current Track Album Title
  - Current Track Artist ID's
  - Current Track Artist Names
  - Current Track Source Type
  - Current Track Source Schedule ID
  - Current Track Source Schedule Title
  - Current Track Source Schedule Description
  - Current Track Source Playlist ID
  - Current Track Source Playlist Title
  - Current Track Source Playlist Description
  - Upcoming Track Start Time (UTC)
  - Upcoming Track ID
  - Upcoming Track Title
  - Upcoming Track Version (radio edit, etc.)
  - Upcoming Track Duration (s)
  - Upcoming Track Explicit (true, false)
  - Upcoming Track Recognizeability (0-100)
  - Upcoming Track Album ID
  - Upcoming Track Album Title
  - Upcoming Track Artist ID's
  - Upcoming Track Artist Names
  - Upcoming Track Source Type
  - Upcoming Track Source Schedule ID
  - Upcoming Track Source Schedule Title

**V1.0.0**

- Supports Play/Pause, Skip, Volume control, and selecting a playlist, schedule, or station
