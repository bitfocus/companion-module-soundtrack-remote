# Soundtrack Remote

## Getting your API key

To request an API key from Soundtrack, fill out [this form from their website](https://www.soundtrackyourbrand.com/our-api/apply)

## Choosing a Zone

Enter your API key in the connection config and save it. The module then fills the **Zone ID** dropdown with every zone the API key can access; pick one and save again. You can also type a zone ID by hand: it is the last part of the zone URL on the Soundtrack website, `https://business.soundtrackyourbrand.com/accounts/{{ your_account_id  }}/zones/{{  your_zone_id  }}/player`.

## Getting ID's for media sources

Playlists, schedules and announcements are available as dropdowns in their actions. The "Assign source by ID" and "Play/Queue Track" actions take an ID instead, and their ID fields accept variables.

### Playlists, Schedules, and Stations

To get the ID for a Playlist, Schedule, or Station, go to the Soundtrack website and navigate to the Playlist, Schedule, or Station you want the ID from. The URL will look something like this:

Playlist or Station: `https://business.soundtrackyourbrand.com/accounts/{{ your_account_id  }}/your_music/{{  your_playlist_id  }}`  
Schedule: `https://business.soundtrackyourbrand.com/accounts/{{ your_account_id  }}/your-music/schedules/edit/{{  your_schedule_id  }}`

## Presets

- **Transport:** Play, Pause, Skip and fixed volume levels, with playback state feedback
- **Now Playing:** current track, up next, time remaining/elapsed, volume, playback state, current playlist and an explicit-content warning
- **Playlists / Schedules / Announcements:** one button per item in your library, highlighted while it is playing

The API key is stored as a connection secret, so it is hidden in the UI and left out of exports.

## Actions

- Play
- Pause
- Skip
- Set Volume (0-16)
- Assign Source by ID (Playlist, Schedule, or Station)
- Assign Playlist (by name)
- Assign Schedule (by name)
- Play/Queue Announcement
- Play/Queue Track by ID

## Feedbacks

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

## Variables

### Playback

- Playback state (Offline, Playing, Paused, Unpaired)
- Playback Volume (0-16)
- Playback Progress (s)
- Playback Progress (mm:ss)
- Playback Progress (hh:mm:ss)
- Playback Progress (%)
- Playback Remaining (s)
- Playback Remaining (mm:ss)
- Playback Remaining (hh:mm:ss)
- Playback Remaining (%)
- Playback Mode (Auto, Linear, Shuffle)

### Current Track

- Current Track Start Time (UTC)
- Current Track ID
- Current Track Title
- Current Track Version (radio edit, etc.)
- Current Track Duration (s)
- Current Track Duration (mm:ss)
- Current Track Duration (hh:mm:ss)
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

### Upcoming Track

- Upcoming Track Start Time (UTC)
- Upcoming Track ID
- Upcoming Track Title
- Upcoming Track Version (radio edit, etc.)
- Upcoming Track Duration (s)
- Upcoming Track Duration (mm:ss)
- Upcoming Track Duration (hh:mm:ss)
- Upcoming Track Explicit (true, false)
- Upcoming Track Recognizeability (0-100)
- Upcoming Track Album ID
- Upcoming Track Album Title
- Upcoming Track Artist ID's
- Upcoming Track Artist Names
- Upcoming Track Source Type
- Upcoming Track Source Schedule ID
- Upcoming Track Source Schedule Title
- Upcoming Track Source Schedule Description
- Upcoming Track Source Playlist ID
- Upcoming Track Source Playlist Title
- Upcoming Track Source Playlist Description
