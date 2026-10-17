package app.turbomusic.server

/**
 * The JNI face of libnode (src/main/cpp/node-bridge.cpp). Node can start once per process and never hands the process back, so the service that
 * uses this lives in its own process (":node" in the manifest) and is stopped by ending that process.
 */
object NodeHost {
    init {
        System.loadLibrary("node")
        System.loadLibrary("node-bridge")
    }

    /** Runs Node with [args] (argv, starting with "node"); blocks until it exits. [env] is a list of "NAME=value" set before Node starts. */
    external fun run(args: Array<String>, env: Array<String>, workDir: String): Int
}
