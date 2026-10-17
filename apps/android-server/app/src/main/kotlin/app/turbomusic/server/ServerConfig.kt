package app.turbomusic.server

import java.security.SecureRandom

/** What the server is told when Node starts: pure, so the JVM tests can check it. */
object ServerConfig {
    const val PORT = 47813
    const val ACTION_STOP = "app.turbomusic.server.STOP"
    const val EXTRA_TOKEN = "token"
    const val EXTRA_PORT = "port"
    const val EXTRA_WAKE = "wake"

    /** A random access token, made here so the app never has to read one back out of the server's files. */
    fun newToken(random: SecureRandom = SecureRandom()): String {
        val alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
        return (1..32).map { alphabet[random.nextInt(alphabet.length)] }.joinToString("")
    }

    /** A token is a plain word: it ends up in an environment variable and in a header. */
    fun isValidToken(token: String?): Boolean = token != null && token.length in 16..128 && token.all { it.isLetterOrDigit() || it == '-' || it == '_' }

    /** Ports below 1024 are not open to an app. */
    fun validPort(port: Int): Int = if (port in 1024..65535) port else PORT

    /** argv for Node: the bundled headless server, with the library folder. */
    fun nodeArgs(bundleDir: String, dataDir: String): Array<String> = arrayOf("node", "$bundleDir/headless.mjs", "--data-dir", dataDir)

    /**
     * The environment: Android gives an app no /tmp, no HOME and no TMPDIR (nodejs-mobile's docs), and V8 sizes its heap from total device RAM,
     * so a cap keeps Android from killing the whole app when the server grows. The bundled server only finds its web client through TURBOMUSIC_WEB_DIR
     * (its own search is for the monorepo's apps/web/dist). `--disable-warning` hides node:sqlite's experimental notice.
     */
    fun env(dataDir: String, tmpDir: String, homeDir: String, webDir: String, token: String, port: Int = PORT, host: String = "0.0.0.0"): Array<String> = arrayOf(
        "TMPDIR=$tmpDir", "HOME=$homeDir",
        "TURBOMUSIC_DATA_DIR=$dataDir", "TURBOMUSIC_WEB_DIR=$webDir", "TURBOMUSIC_PORT=${validPort(port)}", "TURBOMUSIC_HOST=$host", "TURBOMUSIC_TOKEN=$token",
        "NODE_OPTIONS=--max-old-space-size-percentage=30 --disable-warning=ExperimentalWarning",
    )
}
