package app.musiccurator.android.library

import org.json.JSONArray
import org.json.JSONObject

/** One row of the server's sync log. Only the tables the car needs are kept. */
class Rec(val table: String, val id: String, val data: JSONObject)

class Artist(val id: String, val name: String)
class Album(val id: String, val title: String, val artistId: String, val cover: String?)
class Track(val id: String, val title: String, val file: String, val artistName: String, val albumId: String?, val albumTitle: String?, val cover: String?)
class Playlist(val id: String, val name: String, val cover: String?)

private fun JSONObject.str(k: String): String? = if (!has(k) || isNull(k)) null else getString(k).takeIf { it.isNotEmpty() }
private fun JSONObject.strings(k: String): List<String> {
    val a = optJSONArray(k) ?: return emptyList()
    return (0 until a.length()).mapNotNull { if (a.isNull(it)) null else a.getString(it) }
}
private fun JSONObject.objs(k: String): List<JSONObject> {
    val a: JSONArray = optJSONArray(k) ?: return emptyList()
    return (0 until a.length()).mapNotNull { a.optJSONObject(it) }
}

/**
 * The library as the car browses it: derived from the same records the web client uses, with the same rules where they matter
 * (the lead credit is the artist; an album's tracklist is its own order, else its default release, else the longest release;
 * a track on an album with "use the album's credits" takes the album's lead). Ratings, votes and everything else are ignored.
 */
class LibraryIndex(records: List<Rec>) {
    private val artistNames = HashMap<String, String>()
    private val albumData = LinkedHashMap<String, JSONObject>()
    private val trackData = LinkedHashMap<String, JSONObject>()
    private val releases = ArrayList<Pair<String, JSONObject>>()
    private val playlistData = LinkedHashMap<String, JSONObject>()

    init {
        for (r in records) when (r.table) {
            "artists" -> r.data.str("name")?.let { artistNames[r.id] = it }
            "albums" -> albumData[r.id] = r.data
            "releases" -> releases.add(r.id to r.data)
            "tracks" -> trackData[r.id] = r.data
            "playlists" -> playlistData[r.id] = r.data
        }
    }

    private fun leadIds(data: JSONObject): List<String> {
        val credits = data.objs("credits")
        val leads = credits.filter { c -> c.strings("role").any { it.trim().equals("Lead artist", ignoreCase = true) } }.mapNotNull { it.str("artistId") }
        if (leads.isNotEmpty()) return leads
        return listOfNotNull(data.str("artistId") ?: credits.firstNotNullOfOrNull { it.str("artistId") })
    }
    private fun names(ids: List<String>) = ids.mapNotNull { artistNames[it] }.joinToString(", ")

    private fun releasesOf(albumId: String) = releases.filter { it.second.str("albumId") == albumId }

    private fun albumTrackIds(albumId: String): List<String> {
        val a = albumData[albumId] ?: return emptyList()
        val explicit = a.strings("trackOrder")
        val ids = if (explicit.isNotEmpty()) explicit else {
            val rs = releasesOf(albumId)
            val chosen = rs.firstOrNull { it.first == a.str("defaultReleaseId") } ?: rs.maxByOrNull { it.second.strings("trackIds").size }
            val fromRelease = chosen?.second?.strings("trackIds").orEmpty()
            if (fromRelease.isNotEmpty()) fromRelease
            else trackData.entries.mapNotNull { (id, t) -> t.objs("albums").firstOrNull { it.str("albumId") == albumId }?.let { id to it.optInt("order", 0) } }.sortedBy { it.second }.map { it.first }
        }
        return ids.filter { it in trackData }
    }

    private fun firstAlbumOf(t: JSONObject): String? = t.objs("albums").firstOrNull { it.str("albumId") in albumData }?.str("albumId")

    private fun albumCover(albumId: String): String? {
        val a = albumData[albumId] ?: return null
        if (a.optBoolean("coverPicked", true)) a.str("cover")?.let { return it }
        val rs = releasesOf(albumId)
        return (rs.firstOrNull { it.first == a.str("defaultReleaseId") } ?: rs.firstOrNull())?.second?.str("cover") ?: a.str("cover")
    }

    private fun artistIdsOfTrack(t: JSONObject, albumId: String?): List<String> {
        val album = albumId?.let { albumData[it] }
        if (t.optBoolean("syncWithAlbumCredits", false) && album != null) leadIds(album).takeIf { it.isNotEmpty() }?.let { return it }
        return leadIds(t)
    }

    fun track(id: String): Track? {
        val t = trackData[id] ?: return null
        val file = t.str("file") ?: return null // nothing to play yet
        val albumId = firstAlbumOf(t)
        return Track(id, t.str("title") ?: "Untitled", file, names(artistIdsOfTrack(t, albumId)), albumId, albumId?.let { albumData[it]?.str("title") }, t.str("cover") ?: albumId?.let { albumCover(it) })
    }

    fun album(id: String): Album? {
        val a = albumData[id] ?: return null
        return Album(id, a.str("title") ?: "Untitled", leadIds(a).firstOrNull() ?: "", albumCover(id))
    }

    /** Albums that have at least one playable track, by title. */
    fun albums(): List<Album> = albumData.keys.filter { id -> albumTrackIds(id).any { track(it) != null } }.mapNotNull { album(it) }.sortedBy { it.title.lowercase() }

    fun albumTracks(albumId: String): List<Track> = albumTrackIds(albumId).mapNotNull { track(it) }

    /** Artists with a playable album, by name. */
    fun artists(): List<Artist> {
        val ids = albums().map { it.artistId }.filter { it.isNotEmpty() }.toSet()
        return ids.mapNotNull { id -> artistNames[id]?.let { Artist(id, it) } }.sortedBy { it.name.lowercase() }
    }
    fun artistAlbums(artistId: String): List<Album> = albums().filter { it.artistId == artistId }

    /** Tracks on no album, by title. */
    fun singles(): List<Track> = trackData.keys.filter { firstAlbumOf(trackData.getValue(it)) == null }.mapNotNull { track(it) }.sortedBy { it.title.lowercase() }

    fun playlists(): List<Playlist> = playlistData.entries.map { (id, p) -> Playlist(id, p.str("name") ?: "Playlist", p.str("cover")) }.sortedBy { it.name.lowercase() }
    fun playlistTracks(id: String): List<Track> = playlistData[id]?.strings("trackIds").orEmpty().mapNotNull { track(it) }
}
